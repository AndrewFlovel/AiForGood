from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, JSONParser
from rest_framework.permissions import IsAuthenticated

from .serializers import (
    CheckInSerializer, 
    FormularioDinamicoSerializer, 
    ProductoExternoSerializer,
)
from apps.logistica.models.external import ProductoExterno
from apps.logistica.models.forms import FormularioDinamico

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
                "tracking_id": evento.id,
                "timestamp": evento.timestamp,
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
