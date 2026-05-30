from rest_framework import serializers
from django.contrib.gis.geos import Point
from apps.logistica.models.geospatial import TrackingEvent, RutaAsignada
from apps.logistica.models.external import ProductoExterno
from apps.logistica.models.forms import FormularioDinamico
from apps.logistica.services.geofencing import GeofencingService

class CheckInSerializer(serializers.Serializer):
    """
    Serializador estricto para validar los check-ins físicos del reponedor 
    directamente contra la base de datos PostGIS.
    """
    ruta_id = serializers.IntegerField(required=True)
    latitud = serializers.FloatField(required=True)
    longitud = serializers.FloatField(required=True)
    velocidad_kmh = serializers.FloatField(default=0.0)
    bateria_porcentaje = serializers.IntegerField(default=100)
    es_mock_location = serializers.BooleanField(default=False)

    def validate(self, attrs):
        # 1. Regla Anti-Spoofing de Hardware del Sistema Operativo
        if attrs.get("es_mock_location"):
            raise serializers.ValidationError("Intento de fraude detectado: Dispositivo utilizando Fake GPS.")
            
        # 2. Regla Anti-Spoofing de Velocidad Relativa
        if GeofencingService.regla_antispoofing_velocidad(attrs.get("velocidad_kmh", 0.0)):
            raise serializers.ValidationError("Anomalía cinética. Velocidad imposible detectada. Check-in denegado.")

        # 3. Validación Trigonométrica Nativa PostGIS
        geofence_status = GeofencingService.validar_checkin(
            ruta_id=attrs["ruta_id"],
            latitud=attrs["latitud"],
            longitud=attrs["longitud"],
        )
        
        if not geofence_status.get("autorizado", False):
            raise serializers.ValidationError(
                f"Fuera del perímetro de seguridad comercial. Estás a {geofence_status.get('distancia_metros')}m "
                f"(Tolerancia máxima permitida: {geofence_status.get('tolerancia_metros')}m)."
            )
            
        return attrs

    def create(self, validated_data):
        user = self.context["request"].user
        # Transformación a Objeto Espacial GeoDjango (SRID 4326)
        punto = Point(validated_data["longitud"], validated_data["latitud"], srid=4326)
        
        try:
            ruta = RutaAsignada.objects.get(id=validated_data["ruta_id"])
        except RutaAsignada.DoesNotExist:
            raise serializers.ValidationError("Sucursal objetivo no encontrada.")

        evento = TrackingEvent.objects.create(
            reponedor=user,
            tipo_evento="CHECKIN",
            ubicacion_actual=punto,
            velocidad_kmh=validated_data["velocidad_kmh"],
            bateria_porcentaje=validated_data["bateria_porcentaje"],
            ruta_asociada=ruta,
            es_mock_location=validated_data["es_mock_location"],
        )
        return evento


class FormularioDinamicoSerializer(serializers.ModelSerializer):
    """
    Serializador que procesa JSONB y flujos multimedia de manera simultánea.
    """
    class Meta:
        model = FormularioDinamico
        fields = [
            "id", 
            "tracking", 
            "tipo_formulario", 
            "datos_extra", 
            "foto_evidencia", 
            "creado_en",
        ]
        read_only_fields = ["id", "creado_en"]


class ProductoExternoSerializer(serializers.ModelSerializer):
    """
    Serializador de puente para jalar datos limpios del ERP Externo.
    """
    class Meta:
        model = ProductoExterno
        fields = "__all__"
