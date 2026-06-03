import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Cargar variables desde .env si existe
load_dotenv(BASE_DIR / '.env')

SECRET_KEY = os.environ.get('SECRET_KEY', 'default-unsafe-secret-key')

DEBUG = os.environ.get('DEBUG', 'True') == 'True'

ALLOWED_HOSTS = [
    "localhost",
    "127.0.0.1",
]

# En desarrollo aceptamos cualquier host (IP LAN, dominios de túnel ngrok/cloudflared,
# etc.) para poder probar la app móvil desde cualquier red. NUNCA usar en producción.
if DEBUG:
    ALLOWED_HOSTS = ["*"]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.gis",
    "rest_framework",
    "corsheaders",
    "core.auth.apps.AuthConfig",
    "core.database.apps.DatabaseConfig",
    "apps.logistica.apps.LogisticaConfig",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

# CORS Settings (Desarrollo)
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = [
    'accept',
    'authorization',
    'content-type',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
    'x-device-id',
]


ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.contrib.gis.db.backends.postgis",
        "NAME": os.environ.get("DB_NAME", "antigrabiti_local"),
        "USER": os.environ.get("DB_USER", "postgres"),
        "PASSWORD": os.environ.get("DB_PASSWORD", "postgres"),
        "HOST": os.environ.get("DB_HOST", "db"),
        "PORT": os.environ.get("DB_PORT", "5432"),
    },
    "external_sql": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.environ.get("EXTERNAL_DB_NAME", "venado_erp"),
        "USER": os.environ.get("EXTERNAL_DB_USER", "postgres"),
        "PASSWORD": os.environ.get("EXTERNAL_DB_PASSWORD", "postgres"),
        "HOST": os.environ.get("EXTERNAL_DB_HOST", "external_db_host"),
        "PORT": os.environ.get("EXTERNAL_DB_PORT", "5432"),
    },
}

DATABASE_ROUTERS = [
    "core.database.routers.ExternalSQLRouter",
]

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]

LANGUAGE_CODE = "en-us"

TIME_ZONE = "UTC"

USE_I18N = True

USE_TZ = True

STATIC_URL = "static/"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "core.auth.authentication.DeviceJWTAuthentication",
    ],
}

from datetime import timedelta
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=8),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=1),
}

# Integrations
GRAPHQL_ENDPOINT = os.environ.get("GRAPHQL_ENDPOINT", "https://api.venado.com/graphql")
FIREBASE_CREDENTIALS = os.environ.get("FIREBASE_CREDENTIALS", "firebase-adminsdk.json")

# ===================================================================
# Google Drive (evidencia fotográfica de formularios)
# ===================================================================
GOOGLE_APPLICATION_CREDENTIALS = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
GOOGLE_DRIVE_FOLDER_ID = os.environ.get("GOOGLE_DRIVE_FOLDER_ID")
GOOGLE_MAPS_API_KEY = os.environ.get("GOOGLE_MAPS_API_KEY")
