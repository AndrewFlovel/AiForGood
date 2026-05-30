from django.urls import path
from .views import (
    CheckInAPIView, 
    FormularioDinamicoCreateView, 
    ProductoExternoListView,
)

urlpatterns = [
    path("checkin/", CheckInAPIView.as_view(), name="api_logistica_checkin"),
    path("formularios/", FormularioDinamicoCreateView.as_view(), name="api_logistica_form_create"),
    path("productos-erp/", ProductoExternoListView.as_view(), name="api_logistica_productos_erp"),
]
