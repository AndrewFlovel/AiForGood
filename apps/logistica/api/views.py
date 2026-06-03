import json

from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, JSONParser, FormParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.exceptions import PermissionDenied, ValidationError
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db import transaction

from .serializers import (
    CheckInSerializer,
    FormularioDinamicoSerializer,
    ProductoExternoSerializer,
    RutaDeHoySerializer,
    CompletarParadaSerializer,
    RestockRequestSerializer,
    TareaEnProcesoSerializer,
)
from apps.logistica.models.external import ProductoExterno
from apps.logistica.models.forms import FormularioDinamico
from apps.logistica.models import Route, RouteStop, RestockRequest, Visit
from apps.logistica.services.google_drive import subir_foto, DriveUploadError

class CheckInAPIView(generics.CreateAPIView):
    """
    Endpoint de impacto táctico para registrar la llegada a la sucursal.
    El request debe poseer un token JWT inquebrantable (con device_id válido).
    """
    serializer_class = CheckInSerializer
    permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(
            data=request.data, 
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        evento = serializer.save()
        
        return Response({
            "status": "success",
            "mensaje": "Check-in exitoso. Perímetro de seguridad geoespacial validado.",
            "data": {
                "visit_id": evento.id,
                "started_at": evento.started_at,
            }
        }, status=status.HTTP_201_CREATED)


class FormularioDinamicoCreateView(generics.CreateAPIView):
    """
    Endpoint elástico para absorber la recolección de datos en terreno.
    Habilita `MultiPartParser` para ingestar la evidencia fotográfica del
    quiebre de stock al mismo tiempo que procesa el JSONB.
    """
    queryset = FormularioDinamico.objects.all()
    serializer_class = FormularioDinamicoSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, JSONParser]


class ProductoExternoListView(generics.ListAPIView):
    """
    Endpoint transparente que interroga a la Base de Datos Externa SQL del
    ERP de la empresa en tiempo real, utilizando el ExternalSQLRouter sin
    replicar los datos en el servidor PostGIS local.
    """
    queryset = ProductoExterno.objects.all()
    serializer_class = ProductoExternoSerializer
    permission_classes = [IsAuthenticated]


class RutaDeHoyView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        today = timezone.now().date()
        ruta = get_object_or_404(
            Route.objects.prefetch_related('stops__pdv__market'),
            replenisher=request.user,
            route_date=today,
        )
        serializer = RutaDeHoySerializer(ruta)
        return Response(serializer.data)


class IniciarRutaView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, route_id):
        ruta = get_object_or_404(Route, id=route_id)
        if ruta.replenisher != request.user:
            raise PermissionDenied("No tienes acceso a esta ruta.")
        if ruta.status != 'pending':
            raise ValidationError(f"La ruta ya está en estado '{ruta.status}'.")
        ruta.status = 'in_progress'
        ruta.started_at = timezone.now()
        ruta.save()
        return Response({"status": "success", "mensaje": "Ruta iniciada.", "route_id": ruta.id})


class CompletarParadaView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, stop_id):
        stop = get_object_or_404(RouteStop.objects.select_related('route'), id=stop_id)
        if stop.route.replenisher != request.user:
            raise PermissionDenied("No tienes acceso a esta parada.")
        if stop.status == 'completed':
            raise ValidationError("Esta parada ya fue completada.")
        serializer = CompletarParadaSerializer(data=request.data, context={'stop': stop})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"status": "success", "mensaje": "Parada completada.", "stop_id": stop.id})


class TareaEnProcesoView(APIView):
    """
    Formulario de visita obligatorio: recibe comprobante visual (foto de cámara),
    notas y datos adicionales (JSON). Sube la foto a Google Drive, registra el
    FormularioDinamico (con timestamps de login y de captura) y completa la parada,
    todo de forma transaccional.
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, stop_id):
        stop = get_object_or_404(RouteStop.objects.select_related("route"), id=stop_id)
        if stop.route.replenisher != request.user:
            raise PermissionDenied("No tienes acceso a esta parada.")
        if stop.status != "in_progress":
            raise ValidationError(
                "Debes hacer check-in en esta parada antes de registrar la tarea."
            )

        foto = request.FILES.get("foto")
        if not foto:
            raise ValidationError({"foto": "El comprobante visual (foto) es obligatorio."})

        serializer = TareaEnProcesoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        datos = serializer.validated_data

        # datos_extra llega como string JSON en multipart/form-data
        datos_extra = {}
        datos_extra_raw = request.data.get("datos_extra")
        if datos_extra_raw:
            try:
                datos_extra = json.loads(datos_extra_raw)
            except (TypeError, ValueError):
                raise ValidationError({"datos_extra": "JSON inválido."})

        visit = Visit.objects.filter(route_stop=stop, status="in_progress").first()

        # 1. Subir la evidencia a Drive (fuera de la transacción de BD)
        nombre = f"tarea-{stop_id}-{int(timezone.now().timestamp())}.jpg"
        try:
            foto_url = subir_foto(
                foto, nombre, mimetype=getattr(foto, "content_type", None) or "image/jpeg"
            )
        except DriveUploadError as exc:
            return Response(
                {"status": "error", "mensaje": str(exc)},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        # 2. Registrar formulario + completar parada de forma atómica
        with transaction.atomic():
            formulario = FormularioDinamico.objects.create(
                visit=visit,
                tipo_formulario="Tarea_En_Proceso",
                datos_extra=datos_extra,
                notas=datos.get("notas"),
                foto_url=foto_url,
                foto_timestamp=datos.get("foto_timestamp"),
                sesion_iniciada_at=datos.get("sesion_iniciada_at"),
            )

            completar_data = {}
            if datos.get("real_minutes") is not None:
                completar_data["real_minutes"] = datos["real_minutes"]
            if datos.get("notas"):
                completar_data["notas"] = datos["notas"]
            completar = CompletarParadaSerializer(
                data=completar_data, context={"stop": stop}
            )
            completar.is_valid(raise_exception=True)
            completar.save()

        return Response(
            {
                "status": "success",
                "mensaje": "Tarea registrada y parada completada.",
                "formulario_id": formulario.id,
                "foto_url": foto_url,
                "stop_id": stop.id,
                "stop_status": "completed",
            },
            status=status.HTTP_201_CREATED,
        )


class OmitirParadaView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, stop_id):
        stop = get_object_or_404(RouteStop.objects.select_related('route'), id=stop_id)
        if stop.route.replenisher != request.user:
            raise PermissionDenied("No tienes acceso a esta parada.")
        if stop.status in ('completed', 'skipped'):
            raise ValidationError(f"La parada ya está en estado '{stop.status}'.")
        stop.status = 'skipped'
        stop.save()
        return Response({"status": "success", "mensaje": "Parada omitida.", "stop_id": stop.id})


class RestockRequestCreateView(generics.CreateAPIView):
    queryset = RestockRequest.objects.all()
    serializer_class = RestockRequestSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(replenisher=self.request.user)


class SupervisorDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        today = timezone.now().date()
        routes = (
            Route.objects
            .filter(route_date=today)
            .select_related('replenisher')
            .prefetch_related('stops')
        )
        data = []
        for ruta in routes:
            stops = ruta.stops.all()
            total = stops.count()
            completados = stops.filter(status='completed').count()
            omitidos = stops.filter(status='skipped').count()
            pendientes = total - completados - omitidos
            pct = round((completados / total * 100) if total > 0 else 0, 1)
            data.append({
                'reponedor': ruta.replenisher.username,
                'route_id': ruta.id,
                'status': ruta.status,
                'total_pdvs': total,
                'completados': completados,
                'pendientes': pendientes,
                'omitidos': omitidos,
                'pct_completitud': pct,
                'total_estimado_min': ruta.total_estimated_minutes,
                'total_real_min': ruta.total_real_minutes,
                'iniciado_en': ruta.started_at,
            })
        return Response({'fecha': today, 'rutas': data})
