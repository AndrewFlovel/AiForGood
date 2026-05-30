from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.exceptions import AuthenticationFailed
from django.utils.translation import gettext_lazy as _

class DeviceJWTAuthentication(JWTAuthentication):
    """
    Clase de autenticación personalizada que verifica que el 'device_id' 
    inyectado en el payload del JWT coincida obligatoriamente con el 
    enviado en el header HTTP 'X-Device-ID' de la petición.
    """
    def authenticate(self, request):
        header = self.get_header(request)
        if header is None:
            return None

        raw_token = self.get_raw_token(header)
        if raw_token is None:
            return None

        validated_token = self.get_validated_token(raw_token)
        
        # Validación Estricta Anti-Spoofing
        token_device_id = validated_token.get("device_id")
        request_device_id = request.headers.get("X-Device-ID")

        if not token_device_id:
            raise AuthenticationFailed(
                _("El Token carece de la firma de identificación de dispositivo (device_id)."),
                code="missing_device_id",
            )
            
        if not request_device_id:
            raise AuthenticationFailed(
                _("Las cabeceras de la petición deben incluir obligatoriamente 'X-Device-ID'."),
                code="missing_device_header",
            )

        if token_device_id != request_device_id:
            raise AuthenticationFailed(
                _("Detección de Spoofing: El Device ID del dispositivo no coincide con el autorizado en el Token."),
                code="device_mismatch",
            )

        return self.get_user(validated_token), validated_token
