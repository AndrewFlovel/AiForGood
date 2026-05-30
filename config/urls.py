from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path("admin/", admin.site.urls),
    
    # Capa de Logueo Empresarial y Seguridad Anti-Spoofing (Device ID)
    path("api/auth/", include("core.auth.urls")),
    
    # Capa de Logística: Tracking Espacial, Formularios Mutables y ERP Externo
    path("api/logistica/", include("apps.logistica.api.urls")),
]
