from django.urls import path
from .views import (
    CheckInAPIView,
    FormularioDinamicoCreateView,
    ProductoExternoListView,
    RutaDeHoyView,
    IniciarRutaView,
    CompletarParadaView,
    TareaEnProcesoView,
    OmitirParadaView,
    RestockRequestCreateView,
    SupervisorDashboardView,
)

urlpatterns = [
    path("checkin/", CheckInAPIView.as_view(), name="api_logistica_checkin"),
    path("formularios/", FormularioDinamicoCreateView.as_view(), name="api_logistica_form_create"),
    path("productos-erp/", ProductoExternoListView.as_view(), name="api_logistica_productos_erp"),
    path("rutas/hoy/", RutaDeHoyView.as_view(), name="api_logistica_ruta_hoy"),
    path("rutas/<uuid:route_id>/iniciar/", IniciarRutaView.as_view(), name="api_logistica_ruta_iniciar"),
    path("paradas/<uuid:stop_id>/completar/", CompletarParadaView.as_view(), name="api_logistica_parada_completar"),
    path("paradas/<uuid:stop_id>/tarea/", TareaEnProcesoView.as_view(), name="api_logistica_parada_tarea"),
    path("paradas/<uuid:stop_id>/omitir/", OmitirParadaView.as_view(), name="api_logistica_parada_omitir"),
    path("restock/", RestockRequestCreateView.as_view(), name="api_logistica_restock"),
    path("supervisor/dashboard/", SupervisorDashboardView.as_view(), name="api_logistica_dashboard"),
]
