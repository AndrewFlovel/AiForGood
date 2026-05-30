from django.contrib.gis.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

class RutaAsignada(models.Model):
    """
    Define el punto de venta o sucursal objetivo al que el reponedor debe llegar.
    Utiliza un PointField nativo de PostGIS (SRID 4326 - WGS84).
    """
    nombre_sucursal = models.CharField(max_length=255)
    
    # Campo Espacial PostGIS Puro
    ubicacion_objetivo = models.PointField(
        srid=4326,
        help_text="Coordenada GPS del punto de venta",
    )
    
    radio_tolerancia_metros = models.FloatField(
        default=50.0,
        help_text="Radio geográfico permitido para que un check-in sea válido",
    )
    fecha_asignacion = models.DateField(auto_now_add=True)
    
    class Meta:
        db_table = "logistica_ruta_asignada"


class TrackingEvent(models.Model):
    """
    Almacena los pings masivos en segundo plano (background tracking)
    y los eventos formales de Check-in/Check-out.
    """
    EVENT_CHOICES = (
        ("PING", "Background Ping"),
        ("CHECKIN", "Llegada a Sucursal"),
        ("CHECKOUT", "Salida de Sucursal"),
    )

    reponedor = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        db_index=True,
    )
    tipo_evento = models.CharField(
        max_length=20,
        choices=EVENT_CHOICES,
        default="PING",
    )
    
    # Ubicación satelital del evento
    ubicacion_actual = models.PointField(
        srid=4326,
        help_text="Coordenada GPS exacta del evento emitido por el móvil",
    )
    
    velocidad_kmh = models.FloatField(
        default=0.0,
        help_text="Velocidad reportada por el hardware GPS (para anti-spoofing)",
    )
    bateria_porcentaje = models.IntegerField(default=100)
    
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    
    ruta_asociada = models.ForeignKey(
        RutaAsignada,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )

    # Flag estricto de seguridad: Detección de Fake GPS de Android/iOS
    es_mock_location = models.BooleanField(
        default=False,
        help_text="True si el SO móvil detectó que la ubicación fue simulada",
    )

    class Meta:
        db_table = "logistica_tracking_event"
        # Índices compuestos para analítica rápida sobre grandes volúmenes de datos
        indexes = [
            models.Index(fields=["timestamp", "reponedor"]),
        ]
