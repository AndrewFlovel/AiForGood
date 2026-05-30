import os
import logging
import firebase_admin
from firebase_admin import credentials, messaging, firestore
from django.conf import settings

logger = logging.getLogger(__name__)

class FirebaseManager:
    """
    Configuración e integración del SDK de Firebase Admin.
    Permite persistencia híbrida en Firestore y notificaciones Push prioritarias.
    """
    _initialized = False

    @classmethod
    def initialize(cls):
        """Inicializa la app de Firebase garantizando Singleton seguro."""
        if not cls._initialized:
            cred_path = settings.FIREBASE_CREDENTIALS
            if os.path.exists(cred_path):
                try:
                    cred = credentials.Certificate(cred_path)
                    firebase_admin.initialize_app(
                        credential=cred,
                    )
                    cls._initialized = True
                except Exception as e:
                    logger.error(f"Error montando credenciales Firebase: {str(e)}")
            else:
                logger.warning(
                    f"Archivo de credenciales Firebase no encontrado en {cred_path}."
                )

    @classmethod
    def get_firestore_client(cls):
        """Retorna el cliente Firestore para datos elásticos."""
        cls.initialize()
        if cls._initialized:
            return firestore.client()
        return None

    @classmethod
    def send_push_notification(cls, token: str, title: str, body: str, data: dict = None):
        """
        Dispara una notificación push al dispositivo del reponedor en ruta.
        Útil para alertas de geofencing o cambios urgentes de planograma.
        """
        cls.initialize()
        if not cls._initialized:
            logger.error("No se pudo enviar Push: Firebase no inicializado.")
            return False

        if data is None:
            data = {}

        message = messaging.Message(
            notification=messaging.Notification(
                title=title,
                body=body,
            ),
            data=data,
            token=token,
        )

        try:
            response = messaging.send(message)
            return response
        except Exception as e:
            logger.error(f"Fallo enviando Push Notification a {token}: {str(e)}")
            return False
