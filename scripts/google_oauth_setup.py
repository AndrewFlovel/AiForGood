"""
Genera el refresh token de OAuth para subir evidencia a Google Drive usando una
cuenta de usuario (Gmail gratuita). Los archivos se crean en TU Drive, que sí
tiene cuota — así se evita el error `storageQuotaExceeded` de los service accounts.

Ejecutar UNA sola vez en una máquina CON navegador (tu laptop):

    python scripts/google_oauth_setup.py ruta/al/client_secret.json

Prerrequisitos en Google Cloud Console (proyecto practice-451322):
  1. Habilitar "Google Drive API".
  2. Pantalla de consentimiento OAuth → tipo "External".
     ⚠️ Publícala en "Production" para que el refresh token NO expire a los 7 días
     (en modo "Testing" Google caduca el token tras 7 días). Saldrá un aviso de
     "app no verificada" que puedes omitir (Avanzado → Ir a la app).
     Si la dejas en "Testing", agrega tu correo como usuario de prueba.
  3. Credenciales → Crear ID de cliente OAuth → tipo "Aplicación de escritorio".
     Descarga el JSON y pásalo como argumento a este script.

Al terminar, pega las 3 líneas impresas en tu archivo .env.

Requiere: pip install google-auth-oauthlib google-api-python-client
"""
import sys

from google_auth_oauthlib.flow import InstalledAppFlow

SCOPES = ["https://www.googleapis.com/auth/drive"]


def main():
    if len(sys.argv) < 2:
        print("Uso: python scripts/google_oauth_setup.py <client_secret.json>")
        sys.exit(1)

    flow = InstalledAppFlow.from_client_secrets_file(sys.argv[1], SCOPES)
    # access_type=offline + prompt=consent garantizan que Google emita refresh_token
    creds = flow.run_local_server(port=0, access_type="offline", prompt="consent")

    print("\n=== Copia estas líneas en tu archivo .env ===\n")
    print(f"GOOGLE_OAUTH_CLIENT_ID={creds.client_id}")
    print(f"GOOGLE_OAUTH_CLIENT_SECRET={creds.client_secret}")
    print(f"GOOGLE_OAUTH_REFRESH_TOKEN={creds.refresh_token}")
    print("\nLuego reinicia el backend: docker compose up -d")


if __name__ == "__main__":
    main()
