from .base import *

# Override configuraciones base para entorno de desarrollo local

DEBUG = True

ALLOWED_HOSTS = ["*", "localhost", "127.0.0.1"]

# En caso de querer mockear el endpoint de GraphQL en local
# GRAPHQL_ENDPOINT = "http://localhost:4000/graphql"

# Puedes activar Django Debug Toolbar o logs detallados en consola aquí.
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "INFO",
    },
}
