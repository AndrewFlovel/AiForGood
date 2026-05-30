from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers import DeviceTokenObtainPairSerializer

class DeviceTokenObtainPairView(TokenObtainPairView):
    """
    Endpoint de Autenticación de Élite.
    Recibe username, password y device_id. Genera el par JWT enlazado.
    """
    serializer_class = DeviceTokenObtainPairSerializer
