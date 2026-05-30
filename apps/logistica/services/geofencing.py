from django.contrib.gis.geos import Point
from apps.logistica.models.geospatial import RutaAsignada

class GeofencingService:
    """
    Motor de cálculos trigonométricos espaciales.
    Aprovecha el motor de la base de datos o el procesador GEOS en memoria.
    """
    
    @staticmethod
    def validar_checkin(ruta_id: int, latitud: float, longitud: float) -> dict:
        """
        Calcula la distancia esférica real entre el reponedor y la sucursal.
        """
        try:
            ruta = RutaAsignada.objects.get(id=ruta_id)
        except RutaAsignada.DoesNotExist:
            return {
                "autorizado": False,
                "error": "Sucursal o ruta no encontrada en base de datos",
            }

        # Construcción del punto WGS84
        punto_reponedor = Point(longitud, latitud, srid=4326)
        
        # En SRID 4326 distance() devuelve grados, por lo que multiplicamos por el 
        # promedio de metros por grado en el ecuador (aprox 111,320 metros) 
        # para una aproximación matemática rápida y ligera en memoria.
        # (Para ultra-precisión se podría invocar DistanceFunc de BD).
        distancia_metros = punto_reponedor.distance(ruta.ubicacion_objetivo) * 111320.0
        
        autorizado = distancia_metros <= ruta.radio_tolerancia_metros
        
        return {
            "autorizado": autorizado,
            "distancia_metros": round(distancia_metros, 2),
            "tolerancia_metros": ruta.radio_tolerancia_metros,
        }
        
    @staticmethod
    def regla_antispoofing_velocidad(velocidad_kmh: float) -> bool:
        """
        Bloquea check-ins si el dispositivo reporta estar moviéndose a velocidades
        absurdas (ej. teletransportación por Fake GPS no detectada nativamente).
        """
        VELOCIDAD_MAXIMA_LOGICA_KMH = 150.0
        return velocidad_kmh > VELOCIDAD_MAXIMA_LOGICA_KMH
