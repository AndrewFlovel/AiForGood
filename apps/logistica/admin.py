from django.contrib import admin
from django.contrib.gis.admin import GISModelAdmin
from apps.logistica.models.geospatial import TrackingEvent, RutaAsignada
from apps.logistica.models.forms import FormularioDinamico
from apps.logistica.models.external import ProductoExterno

@admin.register(RutaAsignada)
class RutaAsignadaAdmin(GISModelAdmin):
    """
    Habilita un mapa interactivo (GISModelAdmin) en el Backoffice de Django
    para que los administradores arrastren el pin (Point) y definan las 
    coordenadas de la sucursal visualmente.
    """
    list_display = ("nombre_sucursal", "radio_tolerancia_metros", "fecha_asignacion")
    search_fields = ("nombre_sucursal",)
    
    # Coordenadas por defecto (ej. Santiago, Chile o Ciudad de México)
    gis_widget_kwargs = {
        "attrs": {
            "default_lon": -70.6693,
            "default_lat": -33.4489,
            "default_zoom": 12,
        }
    }


@admin.register(TrackingEvent)
class TrackingEventAdmin(GISModelAdmin):
    list_display = (
        "reponedor", 
        "tipo_evento", 
        "velocidad_kmh", 
        "timestamp", 
        "es_mock_location",
    )
    list_filter = ("tipo_evento", "es_mock_location", "timestamp")
    search_fields = ("reponedor__username",)


@admin.register(FormularioDinamico)
class FormularioDinamicoAdmin(admin.ModelAdmin):
    """
    Visualización del modelo elástico. 
    En Django >= 3.2, el JSONField se renderiza con un editor de código nativo.
    """
    list_display = ("tracking", "tipo_formulario", "creado_en")
    list_filter = ("tipo_formulario", "creado_en")


@admin.register(ProductoExterno)
class ProductoExternoAdmin(admin.ModelAdmin):
    """
    Muestra el catálogo del ERP sin permitir modificaciones desde el panel local.
    """
    list_display = ("codigo_sku", "nombre", "precio_referencial", "stock_global")
    search_fields = ("codigo_sku", "nombre")
    
    # Blindaje Read-Only
    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
