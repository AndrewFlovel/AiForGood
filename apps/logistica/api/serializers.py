from rest_framework import serializers
from django.contrib.gis.geos import Point
from django.contrib.auth import get_user_model
from django.db.models import F
from django.db.models.functions import Coalesce
from apps.logistica.models import (
    RouteStop, Visit, FormularioDinamico, ProductoExterno, Route, RestockRequest,
    PDV, Market, ClientType,
)
from apps.logistica.services.geofencing import GeofencingService
from django.utils import timezone

User = get_user_model()

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
        fields = [
            'id', 'stop_order', 'status', 'estimated_minutes',
            'distance_from_prev_km', 'arrived_at', 'finished_at', 'pdv',
        ]


class RutaDeHoySerializer(serializers.ModelSerializer):
    stops = serializers.SerializerMethodField()
    traffic_info = serializers.SerializerMethodField()

    class Meta:
        model = Route
        fields = [
            'id', 'status', 'route_date', 'total_pdvs',
            'total_estimated_minutes', 'total_distance_km',
            'total_real_minutes', 'started_at', 'stops', 'traffic_info',
        ]

    def get_stops(self, obj):
        stops = obj.stops.select_related('pdv__market').order_by('stop_order')
        return RouteStopResumenSerializer(stops, many=True).data

    def get_traffic_info(self, obj):
        return self.context.get('traffic_info')


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


# ──────────────────────────────────────────────────────────────────────────────
# Registro y Asignación (vista del Supervisor)
# ──────────────────────────────────────────────────────────────────────────────

class ReponedorListSerializer(serializers.ModelSerializer):
    """Lista de reponedores con datos de carga y última ubicación reportada."""
    nombre_completo = serializers.SerializerMethodField()
    rol = serializers.CharField(source='last_name', read_only=True)
    pdvs_hoy = serializers.SerializerMethodField()
    ultima_ubicacion = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'nombre_completo', 'rol', 'is_active',
            'pdvs_hoy', 'ultima_ubicacion',
        ]

    def get_nombre_completo(self, obj):
        full = obj.get_full_name().strip()
        # last_name guarda el rol, no el apellido → usar solo first_name si existe
        return (obj.first_name or obj.username).strip() or obj.username

    def get_pdvs_hoy(self, obj):
        return self.context.get('carga_map', {}).get(obj.id, 0)

    def get_ultima_ubicacion(self, obj):
        loc = self.context.get('ubicacion_map', {}).get(obj.id)
        if loc:
            return {'lat': loc.y, 'lng': loc.x}
        return None


class CrearReponedorSerializer(serializers.Serializer):
    """Crea un usuario con rol Reponedor (rol se persiste en last_name)."""
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True, min_length=4)
    nombre = serializers.CharField(max_length=150, required=False, allow_blank=True)
    is_active = serializers.BooleanField(default=True)

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Ya existe un usuario con ese nombre de usuario.")
        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            password=validated_data['password'],
            first_name=validated_data.get('nombre', ''),
            last_name='Reponedor',
            is_active=validated_data.get('is_active', True),
        )
        return user


class MarketSerializer(serializers.ModelSerializer):
    class Meta:
        model = Market
        fields = ['id', 'name', 'zone', 'city']


class ClientTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClientType
        fields = ['id', 'category', 'avg_visit_minutes']


class PDVListSerializer(serializers.ModelSerializer):
    """Listado de PDVs con datos legibles para tabla."""
    market_name = serializers.CharField(source='market.name', read_only=True)
    categoria = serializers.CharField(source='client_type.category', read_only=True)
    lat = serializers.SerializerMethodField()
    lng = serializers.SerializerMethodField()

    class Meta:
        model = PDV
        fields = [
            'id', 'code', 'client_code', 'market_name', 'categoria',
            'lat', 'lng', 'visit_minutes_estimated', 'is_active',
        ]

    def get_lat(self, obj):
        return obj.location.y

    def get_lng(self, obj):
        return obj.location.x


class PDVCreateSerializer(serializers.Serializer):
    """Crea un PDV recibiendo lat/lng en lugar de un PointField directo."""
    code = serializers.CharField(max_length=10)
    client_code = serializers.CharField(max_length=20)
    market = serializers.PrimaryKeyRelatedField(queryset=Market.objects.all())
    client_type = serializers.PrimaryKeyRelatedField(queryset=ClientType.objects.all())
    latitud = serializers.FloatField()
    longitud = serializers.FloatField()
    visit_minutes_estimated = serializers.IntegerField(default=20, min_value=1)
    visit_mon = serializers.BooleanField(default=False)
    visit_tue = serializers.BooleanField(default=False)
    visit_wed = serializers.BooleanField(default=False)
    visit_thu = serializers.BooleanField(default=False)
    visit_fri = serializers.BooleanField(default=False)
    visit_sat = serializers.BooleanField(default=False)
    notes = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    def validate_code(self, value):
        if PDV.objects.filter(code=value).exists():
            raise serializers.ValidationError("Ya existe un PDV con ese código.")
        return value

    def create(self, validated_data):
        lat = validated_data.pop('latitud')
        lon = validated_data.pop('longitud')
        validated_data['location'] = Point(lon, lat, srid=4326)
        return PDV.objects.create(**validated_data)

    def to_representation(self, instance):
        return PDVListSerializer(instance).data


class SugerenciaReponedorSerializer(serializers.Serializer):
    """Payload de entrada para sugerir reponedor por proximidad."""
    pdv_ids = serializers.ListField(
        child=serializers.UUIDField(), allow_empty=False
    )


class CrearRutaSupervisorSerializer(serializers.Serializer):
    """Payload para que el supervisor cree una ruta asignando PDVs a un reponedor."""
    reponedor_id = serializers.IntegerField()
    pdv_ids = serializers.ListField(
        child=serializers.UUIDField(), allow_empty=False
    )
    fecha = serializers.DateField()

    def validate_reponedor_id(self, value):
        if not User.objects.filter(id=value).exists():
            raise serializers.ValidationError("El reponedor no existe.")
        return value
