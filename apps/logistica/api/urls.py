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
    ListaReponedoresView,
    CrearReponedorView,
    MarketListView,
    ClientTypeListView,
    PDVListCreateView,
    PDVsDisponiblesView,
    SugerirReponedorView,
    CrearRutaSupervisorView,
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

    # Registro y Asignación (Supervisor)
    path("supervisor/reponedores/", ListaReponedoresView.as_view(), name="api_logistica_reponedores"),
    path("supervisor/reponedores/crear/", CrearReponedorView.as_view(), name="api_logistica_reponedor_crear"),
    path("markets/", MarketListView.as_view(), name="api_logistica_markets"),
    path("tipos-cliente/", ClientTypeListView.as_view(), name="api_logistica_tipos_cliente"),
    path("pdvs/", PDVListCreateView.as_view(), name="api_logistica_pdvs"),
    path("supervisor/pdvs-disponibles/", PDVsDisponiblesView.as_view(), name="api_logistica_pdvs_disponibles"),
    path("supervisor/sugerir-reponedor/", SugerirReponedorView.as_view(), name="api_logistica_sugerir_reponedor"),
    path("supervisor/crear-ruta/", CrearRutaSupervisorView.as_view(), name="api_logistica_crear_ruta"),
]
