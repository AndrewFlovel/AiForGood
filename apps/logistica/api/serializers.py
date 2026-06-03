from rest_framework import serializers
from django.contrib.gis.geos import Point
from django.db.models import F
from django.db.models.functions import Coalesce
from apps.logistica.models import RouteStop, Visit, FormularioDinamico, ProductoExterno, Route, RestockRequest
from apps.logistica.services.geofencing import GeofencingService
from django.utils import timezone

class CheckInSerializer(serializers.Serializer):
    route_stop_id = serializers.UUIDField(required=True)
    latitud = serializers.FloatField(required=True)
    longitud = serializers.FloatField(required=True)
    velocidad_kmh = serializers.FloatField(default=0.0)
    bateria_porcentaje = serializers.IntegerField(default=100)
    es_mock_location = serializers.BooleanField(default=False)

    def validate(self, attrs):
        if attrs.get("es_mock_location"):
            raise serializers.ValidationError("Intento de fraude detectado: Dispositivo utilizando Fake GPS.")
            
        if GeofencingService.regla_antispoofing_velocidad(attrs.get("velocidad_kmh", 0.0)):
            raise serializers.ValidationError("Anomalía cinética. Velocidad imposible detectada.")

        geofence_status = GeofencingService.validar_checkin(
            route_stop_id=attrs["route_stop_id"],
            latitud=attrs["latitud"],
            longitud=attrs["longitud"],
        )
        
        if not geofence_status.get("autorizado", False):
            raise serializers.ValidationError(
                f"Fuera del perímetro de seguridad comercial. Estás a {geofence_status.get('distancia_metros')}m "
                f"(Tolerancia: {geofence_status.get('tolerancia_metros')}m)."
            )
            
        return attrs

    def create(self, validated_data):
        user = self.context["request"].user
        punto = Point(validated_data["longitud"], validated_data["latitud"], srid=4326)
        
        stop = RouteStop.objects.get(id=validated_data["route_stop_id"])
        
        # Crear la visita real
        visita = Visit.objects.create(
            route_stop=stop,
            pdv=stop.pdv,
            replenisher=user,
            status='in_progress',
            started_at=timezone.now()
        )
        
        # Actualizar el RouteStop con la ubicación real
        stop.status = 'in_progress'
        stop.arrived_at = timezone.now()
        stop.arrival_location = punto
        stop.save()
        
        return visita

class FormularioDinamicoSerializer(serializers.ModelSerializer):
    class Meta:
        model = FormularioDinamico
        fields = [
            "id", 
            "visit", 
            "tipo_formulario", 
            "datos_extra", 
            "foto_evidencia", 
            "creado_en",
        ]
        read_only_fields = ["id", "creado_en"]

class ProductoExternoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductoExterno
        fields = "__all__"


class PDVResumenSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    code = serializers.CharField()
    market_name = serializers.SerializerMethodField()
    lat = serializers.SerializerMethodField()
    lng = serializers.SerializerMethodField()
    visit_minutes_estimated = serializers.IntegerField()

    def get_market_name(self, obj):
        return obj.market.name

    def get_lat(self, obj):
        return obj.location.y

    def get_lng(self, obj):
        return obj.location.x


class RouteStopResumenSerializer(serializers.ModelSerializer):
    pdv = PDVResumenSerializer(read_only=True)

    class Meta:
        model = RouteStop
        fields = ['id', 'stop_order', 'status', 'estimated_minutes', 'arrived_at', 'finished_at', 'pdv']


class RutaDeHoySerializer(serializers.ModelSerializer):
    stops = RouteStopResumenSerializer(many=True, read_only=True)

    class Meta:
        model = Route
        fields = ['id', 'status', 'route_date', 'total_pdvs', 'total_estimated_minutes', 'total_real_minutes', 'started_at', 'stops']


class CompletarParadaSerializer(serializers.Serializer):
    real_minutes = serializers.IntegerField(required=False, min_value=0)
    notas = serializers.CharField(required=False, allow_blank=True)

    def create(self, validated_data):
        stop = self.context['stop']
        now = timezone.now()

        stop.status = 'completed'
        stop.finished_at = now
        stop.real_minutes = validated_data.get('real_minutes')
        stop.save()

        Visit.objects.filter(route_stop=stop, status='in_progress').update(
            status='completed',
            finished_at=now,
        )

        real_minutes = validated_data.get('real_minutes')
        if real_minutes:
            Route.objects.filter(id=stop.route_id).update(
                total_real_minutes=Coalesce(F('total_real_minutes'), 0) + real_minutes
            )

        return stop


class TareaEnProcesoSerializer(serializers.Serializer):
    """
    Valida los campos escalares del formulario de visita 'tarea en proceso'.
    `datos_extra` (JSON) y el archivo `foto` se procesan directamente en la vista
    porque llegan como multipart/form-data.
    """
    notas = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    foto_timestamp = serializers.DateTimeField(required=False, allow_null=True)
    sesion_iniciada_at = serializers.DateTimeField(required=False, allow_null=True)
    real_minutes = serializers.IntegerField(required=False, min_value=0)


class RestockRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = RestockRequest
        fields = ['id', 'pdv', 'product_name', 'quantity_requested', 'urgency', 'notes', 'photo_url', 'status', 'created_at']
        read_only_fields = ['id', 'status', 'created_at']
