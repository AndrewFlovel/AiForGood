from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

class DeviceTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Custom JWT Serializer que exige y embebe un 'device_id' en el payload
    del token para prevenir robo de credenciales y spoofing.
    """
    device_id = serializers.CharField(
        required=True,
        write_only=True,
        help_text="Identificador único del dispositivo móvil (IMEI, UUID, etc.)",
    )

    def validate(self, attrs):
        device_id = attrs.get("device_id")
        
        # Validación base de Django (usuario y contraseña)
        data = super().validate(attrs)

        # self.user es inyectado por super().validate()
        # Inyectamos el device_id en el payload del token (Access y Refresh)
        refresh = self.get_token(self.user)
        refresh["device_id"] = device_id
        
        data["refresh"] = str(refresh)
        data["access"] = str(refresh.access_token)
        # Opcional: devolvemos el device_id en la respuesta para confirmación del cliente
        data["device_id"] = device_id

        return data
