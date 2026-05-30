from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import DeviceTokenObtainPairView

urlpatterns = [
    path(
        "login/",
        DeviceTokenObtainPairView.as_view(),
        name="device_token_obtain_pair",
    ),
    path(
        "refresh/",
        TokenRefreshView.as_view(),
        name="token_refresh",
    ),
]
