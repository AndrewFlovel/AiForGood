from django.contrib.gis.db import models
from django.contrib.auth import get_user_model
import uuid
from .routing import RouteStop
from .locations import PDV

User = get_user_model()


class EventoRespuesta(models.Model):
    """
    Auditoría por pregunta del formulario "Tarea en Proceso".

    El `id` lo genera el cliente (UUID v4): así los reenvíos offline son
    idempotentes (get_or_create por id, los duplicados se ignoran).
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    route_stop = models.ForeignKey(RouteStop, on_delete=models.CASCADE, related_name="eventos_respuesta")
    pdv = models.ForeignKey(PDV, on_delete=models.CASCADE, related_name="eventos_respuesta")
    replenisher = models.ForeignKey(User, on_delete=models.CASCADE, related_name="eventos_respuesta")

    pregunta_key = models.CharField(max_length=100)
    pregunta_descripcion = models.CharField(max_length=255)
    valor = models.TextField(null=True, blank=True)

    # Timestamp del dispositivo al responder (la hora del servidor va en creado_en)
    answered_at = models.DateTimeField()
    geoposicion = models.PointField(srid=4326, geography=True, null=True, blank=True)
    foto_url = models.TextField(null=True, blank=True)
    # Path local de la foto en el dispositivo (referencia, no se sube el archivo)
    foto_local = models.TextField(null=True, blank=True)
    # Denormalizado: market_name + código del PDV al momento de responder
    entidad_nombre = models.CharField(max_length=255)
    # Último chequeo hecho a la entidad: arrived_at (check-in) de la parada
    ultimo_chequeo = models.DateTimeField(null=True, blank=True)

    creado_en = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "logistica_evento_respuesta"
        indexes = [
            models.Index(fields=["route_stop", "pregunta_key"]),
            models.Index(fields=["answered_at"]),
        ]
        ordering = ["answered_at"]
