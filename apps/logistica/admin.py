from django.contrib import admin
from django.contrib.gis.admin import GISModelAdmin
from apps.logistica.models import (
    Market, ClientType, PDV, 
    Route, RouteStop, Visit, 
    RestockRequest, ProductIssue, FormularioDinamico,
    ProductoExterno, EventoRespuesta
)

@admin.register(Market)
class MarketAdmin(admin.ModelAdmin):
    list_display = ('name', 'city')

@admin.register(ClientType)
class ClientTypeAdmin(admin.ModelAdmin):
    list_display = ('category', 'min_purchase_bs')

@admin.register(PDV)
class PDVAdmin(GISModelAdmin):
    list_display = ('code', 'client_code', 'market', 'is_active')
    list_filter = ('market', 'client_type', 'is_active')
    gis_widget_kwargs = {
        "attrs": {
            "default_lon": -68.1193,  # La Paz
            "default_lat": -16.4897,
            "default_zoom": 12,
        }
    }

@admin.register(Route)
class RouteAdmin(admin.ModelAdmin):
    list_display = ('replenisher', 'route_date', 'status')
    list_filter = ('status', 'route_date')

@admin.register(RouteStop)
class RouteStopAdmin(GISModelAdmin):
    list_display = ('route', 'pdv', 'status')
    list_filter = ('status',)

@admin.register(Visit)
class VisitAdmin(admin.ModelAdmin):
    list_display = ('replenisher', 'pdv', 'status', 'visit_date')
    list_filter = ('status', 'visit_date')

@admin.register(FormularioDinamico)
class FormularioDinamicoAdmin(admin.ModelAdmin):
    list_display = ('visit', 'tipo_formulario', 'creado_en')
    list_filter = ('tipo_formulario', 'creado_en')

@admin.register(EventoRespuesta)
class EventoRespuestaAdmin(GISModelAdmin):
    list_display = ('pregunta_key', 'valor', 'entidad_nombre', 'answered_at', 'replenisher', 'creado_en')
    list_filter = ('pregunta_key', 'answered_at')
    search_fields = ('entidad_nombre', 'pregunta_descripcion')
    readonly_fields = ('id', 'creado_en')

@admin.register(ProductoExterno)
class ProductoExternoAdmin(admin.ModelAdmin):
    list_display = ("codigo_sku", "nombre", "precio_referencial", "stock_global")
    search_fields = ("codigo_sku", "nombre")
    
    def has_add_permission(self, request):
        return False
    def has_change_permission(self, request, obj=None):
        return False
    def has_delete_permission(self, request, obj=None):
        return False
