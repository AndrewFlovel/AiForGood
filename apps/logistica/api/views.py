import json

from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, JSONParser, FormParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.exceptions import PermissionDenied, ValidationError
from django.contrib.auth import get_user_model
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
    ReponedorListSerializer,
    CrearReponedorSerializer,
    MarketSerializer,
    ClientTypeSerializer,
    PDVListSerializer,
    PDVCreateSerializer,
    SugerenciaReponedorSerializer,
    CrearRutaSupervisorSerializer,
)
from apps.logistica.models.external import ProductoExterno
from apps.logistica.models.forms import FormularioDinamico
from apps.logistica.models import Route, RouteStop, RestockRequest, Visit, PDV, Market, ClientType
from apps.logistica.services.google_drive import subir_foto, DriveUploadError
from apps.logistica.services.route_optimization import optimize_route, get_route_details, haversine_m

User = get_user_model()


def _carga_map(fecha):
    """Mapa {replenisher_id: cantidad de stops asignados en `fecha`}."""
    rows = (
        RouteStop.objects
        .filter(route__route_date=fecha)
        .values('route__replenisher_id')
    )
    carga = {}
    for r in rows:
        rid = r['route__replenisher_id']
        carga[rid] = carga.get(rid, 0) + 1
    return carga


def _ubicacion_map():
    """Mapa {replenisher_id: último Point arrival_location reportado}."""
    stops = (
        RouteStop.objects
        .filter(arrival_location__isnull=False)
        .select_related('route')
        .order_by('-arrived_at')
    )
    ubic = {}
    for s in stops:
        rid = s.route.replenisher_id
        if rid not in ubic:  # primer match = el más reciente por el order_by
            ubic[rid] = s.arrival_location
    return ubic

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
            Route,
            replenisher=request.user,
            route_date=today,
        )

        # ?trafico=1 → incluye detalles de tráfico en tiempo real (llamada a Google Maps)
        traffic_info = None
        if request.query_params.get('trafico') == '1' and ruta.status in ('pending', 'in_progress'):
            stops = ruta.stops.select_related('pdv').order_by('stop_order')
            ordered_points = [(s.pdv.location.y, s.pdv.location.x) for s in stops]
            traffic_info = get_route_details(ordered_points)

        serializer = RutaDeHoySerializer(ruta, context={'traffic_info': traffic_info, 'request': request})
        return Response(serializer.data)


class IniciarRutaView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, route_id):
        ruta = get_object_or_404(Route, id=route_id)
        if ruta.replenisher != request.user:
            raise PermissionDenied("No tienes acceso a esta ruta.")
        if ruta.status != 'pending':
            raise ValidationError(f"La ruta ya está en estado '{ruta.status}'.")

        # Optimizar orden de visita con tráfico en tiempo real
        stops = list(ruta.stops.select_related('pdv').order_by('stop_order'))
        pdvs = [s.pdv for s in stops]
        result = optimize_route(pdvs)
        optimized_pdvs = result['pdvs']
        route_details = result['route_details']

        pdv_to_stop = {s.pdv_id: s for s in stops}

        with transaction.atomic():
            # Fase 1: órdenes temporales negativos para evitar conflicto unique_together
            for i, stop in enumerate(stops):
                stop.stop_order = -(i + 1)
            RouteStop.objects.bulk_update(stops, ['stop_order'])

            # Fase 2: nuevo orden optimizado + distancia al tramo anterior
            for new_order, pdv in enumerate(optimized_pdvs, start=1):
                stop = pdv_to_stop[pdv.id]
                stop.stop_order = new_order
                if route_details and new_order > 1:
                    leg_index = new_order - 2
                    if leg_index < len(route_details['legs']):
                        stop.distance_from_prev_km = round(
                            route_details['legs'][leg_index]['distance_m'] / 1000, 3
                        )
            RouteStop.objects.bulk_update(stops, ['stop_order', 'distance_from_prev_km'])

            # Actualizar totales de la ruta con valores del tráfico real
            ruta.status = 'in_progress'
            ruta.started_at = timezone.now()
            if route_details:
                ruta.total_distance_km = round(route_details['total_distance_m'] / 1000, 3)
                ruta.total_estimated_minutes = route_details['total_duration_traffic_s'] // 60
            ruta.save()

        response_data = {
            "status": "success",
            "mensaje": "Ruta iniciada y optimizada con tráfico en tiempo real.",
            "route_id": ruta.id,
        }

        if route_details:
            response_data["optimizacion"] = {
                "via_principal": route_details['summary'],
                "distancia_total": route_details['total_distance_text'],
                "tiempo_estimado_min": route_details['total_duration_s'] // 60,
                "tiempo_con_trafico_min": route_details['total_duration_traffic_s'] // 60,
                "demora_trafico_min": route_details['total_traffic_delay_s'] // 60,
                "advertencias": route_details['warnings'],
                "polyline": route_details['overview_polyline'],
                "tramos": [
                    {
                        "distancia": leg['distance_text'],
                        "tiempo_trafico": leg['duration_traffic_text'],
                        "demora_s": leg['traffic_delay_s'],
                    }
                    for leg in route_details['legs']
                ],
            }

        return Response(response_data)


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


# ──────────────────────────────────────────────────────────────────────────────
# Registro y Asignación (vista del Supervisor)
# ──────────────────────────────────────────────────────────────────────────────

class ListaReponedoresView(APIView):
    """Lista los reponedores con su carga de hoy y última ubicación reportada."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        today = timezone.now().date()
        reponedores = User.objects.filter(last_name='Reponedor').order_by('username')
        serializer = ReponedorListSerializer(
            reponedores,
            many=True,
            context={
                'carga_map': _carga_map(today),
                'ubicacion_map': _ubicacion_map(),
            },
        )
        return Response(serializer.data)


class CrearReponedorView(generics.CreateAPIView):
    """Crea un nuevo usuario reponedor."""
    serializer_class = CrearReponedorSerializer
    permission_classes = [IsAuthenticated]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            {
                'status': 'success',
                'mensaje': 'Reponedor creado.',
                'id': user.id,
                'username': user.username,
            },
            status=status.HTTP_201_CREATED,
        )


class MarketListView(generics.ListAPIView):
    queryset = Market.objects.all().order_by('name')
    serializer_class = MarketSerializer
    permission_classes = [IsAuthenticated]


class ClientTypeListView(generics.ListAPIView):
    queryset = ClientType.objects.all().order_by('category')
    serializer_class = ClientTypeSerializer
    permission_classes = [IsAuthenticated]


class PDVListCreateView(generics.ListCreateAPIView):
    """Lista y crea PDVs. Filtros opcionales: ?categoria=MAYORISTA&market=<uuid>&activos=1"""
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        return PDVCreateSerializer if self.request.method == 'POST' else PDVListSerializer

    def get_queryset(self):
        qs = PDV.objects.select_related('market', 'client_type').order_by('code')
        categoria = self.request.query_params.get('categoria')
        market = self.request.query_params.get('market')
        activos = self.request.query_params.get('activos')
        if categoria:
            qs = qs.filter(client_type__category=categoria)
        if market:
            qs = qs.filter(market_id=market)
        if activos == '1':
            qs = qs.filter(is_active=True)
        return qs


class PDVsDisponiblesView(APIView):
    """PDVs activos que aún no están asignados a ninguna ruta en la fecha dada."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        fecha = request.query_params.get('fecha') or timezone.now().date().isoformat()
        asignados = (
            RouteStop.objects
            .filter(route__route_date=fecha)
            .values_list('pdv_id', flat=True)
        )
        qs = (
            PDV.objects
            .filter(is_active=True)
            .exclude(id__in=asignados)
            .select_related('market', 'client_type')
            .order_by('code')
        )
        return Response(PDVListSerializer(qs, many=True).data)


class SugerirReponedorView(APIView):
    """
    Recibe una lista de PDVs y devuelve los reponedores ordenados por
    distancia media (km) desde su última ubicación reportada a esos PDVs.
    Los reponedores sin ubicación conocida se devuelven al final.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = SugerenciaReponedorSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        pdv_ids = serializer.validated_data['pdv_ids']

        pdvs = list(PDV.objects.filter(id__in=pdv_ids))
        if not pdvs:
            raise ValidationError("Ningún PDV válido en la selección.")
        pdv_points = [(p.location.y, p.location.x) for p in pdvs]

        today = timezone.now().date()
        carga = _carga_map(today)
        ubic = _ubicacion_map()

        reponedores = User.objects.filter(last_name='Reponedor').order_by('username')
        ranking = []
        for rep in reponedores:
            loc = ubic.get(rep.id)
            if loc:
                dists = [haversine_m(loc.y, loc.x, plat, plng) for plat, plng in pdv_points]
                dist_media_km = round((sum(dists) / len(dists)) / 1000, 2)
            else:
                dist_media_km = None
            ranking.append({
                'id': rep.id,
                'username': rep.username,
                'nombre': (rep.first_name or rep.username),
                'pdvs_hoy': carga.get(rep.id, 0),
                'distancia_media_km': dist_media_km,
                'tiene_ubicacion': loc is not None,
                'ultima_ubicacion': {'lat': loc.y, 'lng': loc.x} if loc else None,
            })

        # Orden: primero con ubicación (menor distancia), luego sin ubicación
        ranking.sort(key=lambda r: (r['distancia_media_km'] is None, r['distancia_media_km'] or 0))
        return Response({'sugerencias': ranking})


class CrearRutaSupervisorView(APIView):
    """
    El supervisor crea una ruta para un reponedor en una fecha, con los PDVs
    seleccionados. Respeta el unique_together (replenisher, route_date).
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = CrearRutaSupervisorSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        reponedor = get_object_or_404(User, id=data['reponedor_id'])
        pdvs = list(PDV.objects.filter(id__in=data['pdv_ids']))
        if not pdvs:
            raise ValidationError("Ningún PDV válido en la selección.")

        if Route.objects.filter(replenisher=reponedor, route_date=data['fecha']).exists():
            raise ValidationError(
                f"{reponedor.username} ya tiene una ruta asignada el {data['fecha']}."
            )

        with transaction.atomic():
            ruta = Route.objects.create(
                replenisher=reponedor,
                route_date=data['fecha'],
                status='pending',
                total_pdvs=len(pdvs),
                total_estimated_minutes=sum(p.visit_minutes_estimated for p in pdvs),
            )
            for orden, pdv in enumerate(pdvs, start=1):
                RouteStop.objects.create(
                    route=ruta,
                    pdv=pdv,
                    stop_order=orden,
                    estimated_minutes=pdv.visit_minutes_estimated,
                )

        return Response(
            {
                'status': 'success',
                'mensaje': f'Ruta creada para {reponedor.username} con {len(pdvs)} paradas.',
                'route_id': ruta.id,
            },
            status=status.HTTP_201_CREATED,
        )
