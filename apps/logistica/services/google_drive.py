"""
Servicio de subida de evidencia fotográfica a Google Drive.

Sube el archivo recibido (multipart) a la carpeta configurada en
`GOOGLE_DRIVE_FOLDER_ID`, lo hace legible por enlace y devuelve la URL.
En la base de datos solo se persiste esa URL (no el binario).

Requisitos de credenciales:
- `GOOGLE_APPLICATION_CREDENTIALS`: ruta al JSON del service account.
- `GOOGLE_DRIVE_FOLDER_ID`: ID de la carpeta destino. Para evitar el error
  `storageQuotaExceeded`, idealmente debe vivir en una Unidad Compartida
  (Shared Drive) con el service account como miembro Editor.
"""
import io
import os

from django.conf import settings
from google.oauth2 import service_account
from google.oauth2.credentials import Credentials as UserCredentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload

SCOPES = ["https://www.googleapis.com/auth/drive"]
TOKEN_URI = "https://oauth2.googleapis.com/token"


class DriveUploadError(Exception):
    """Error al subir la evidencia a Google Drive."""


def _conf(name):
    """Lee una variable de configuración desde settings o el entorno."""
    return getattr(settings, name, None) or os.environ.get(name)


def _get_credentials():
    """
    Devuelve las credenciales de Drive.

    Prioriza **OAuth de usuario** (refresh token): funciona con cuentas Gmail
    gratuitas porque los archivos se crean en el Drive del usuario, que sí tiene
    cuota. Como respaldo usa el service account (requiere Unidad Compartida para
    evitar `storageQuotaExceeded`). Genera el refresh token con
    `scripts/google_oauth_setup.py`.
    """
    refresh_token = _conf("GOOGLE_OAUTH_REFRESH_TOKEN")
    client_id = _conf("GOOGLE_OAUTH_CLIENT_ID")
    client_secret = _conf("GOOGLE_OAUTH_CLIENT_SECRET")
    if refresh_token and client_id and client_secret:
        return UserCredentials(
            token=None,
            refresh_token=refresh_token,
            client_id=client_id,
            client_secret=client_secret,
            token_uri=TOKEN_URI,
            scopes=SCOPES,
        )

    creds_path = _conf("GOOGLE_APPLICATION_CREDENTIALS")
    if not creds_path or not os.path.exists(creds_path):
        raise DriveUploadError(
            "No hay credenciales de Drive configuradas: define GOOGLE_OAUTH_* "
            f"(recomendado) o un service account válido (ruta actual: {creds_path})."
        )
    return service_account.Credentials.from_service_account_file(creds_path, scopes=SCOPES)


def _get_service():
    # cache_discovery=False evita warnings/escritura de caché en contenedores
    return build("drive", "v3", credentials=_get_credentials(), cache_discovery=False)


def subir_foto(file_obj, filename, mimetype="image/jpeg"):
    """
    Sube `file_obj` (stream tipo archivo, p.ej. request.FILES[...]) a Drive y
    devuelve una URL pública de visualización.

    Lanza `DriveUploadError` ante cualquier fallo para que la vista responda 502.
    """
    folder_id = getattr(settings, "GOOGLE_DRIVE_FOLDER_ID", None) or os.environ.get(
        "GOOGLE_DRIVE_FOLDER_ID"
    )
    if not folder_id:
        raise DriveUploadError("GOOGLE_DRIVE_FOLDER_ID no está configurado.")

    try:
        service = _get_service()

        # Garantizar un stream en memoria seekable (multipart puede venir en chunks)
        stream = io.BytesIO(file_obj.read())
        stream.seek(0)

        metadata = {"name": filename, "parents": [folder_id]}
        media = MediaIoBaseUpload(stream, mimetype=mimetype, resumable=True)

        archivo = (
            service.files()
            .create(
                body=metadata,
                media_body=media,
                fields="id, webViewLink",
                supportsAllDrives=True,
            )
            .execute()
        )

        file_id = archivo["id"]

        # Hacer el archivo legible por cualquiera con el enlace
        service.permissions().create(
            fileId=file_id,
            body={"type": "anyone", "role": "reader"},
            supportsAllDrives=True,
        ).execute()

        # Enlace de visualización directa de la imagen
        return f"https://drive.google.com/uc?export=view&id={file_id}"

    except DriveUploadError:
        raise
    except Exception as exc:  # noqa: BLE001 - se envuelve para la vista
        raise DriveUploadError(f"Fallo al subir la evidencia a Drive: {exc}") from exc
