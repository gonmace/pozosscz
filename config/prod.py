# flake8: noqa
import os
from .base import *

# Aplicar parche para convertir Path objects a strings en templates
try:
    from . import path_fix
except ImportError:
    pass

# Leer DEBUG del .env - acepta True/False, 1/0, yes/no, on/off
# python-decouple puede tener problemas con cast=bool, así que lo hacemos manualmente
DEBUG_STR = str(config('DJANGO_DEBUG', default='False')).strip().lower()
DEBUG = DEBUG_STR in ('true', '1', 'yes', 'on')

# Limpiar ALLOWED_HOSTS - remover espacios y strings vacíos
ALLOWED_HOSTS_STR = config('DJANGO_ALLOWED_HOSTS', default='')
ALLOWED_HOSTS = [h.strip() for h in ALLOWED_HOSTS_STR.split(',') if h.strip()]

INSTALLED_APPS += [

]

# Si DEBUG está activado, agregar django_browser_reload si está disponible
# (solo para desarrollo local, no necesario en producción)
if DEBUG:
    try:
        import django_browser_reload
        INSTALLED_APPS += ['django_browser_reload']
    except ImportError:
        # django_browser_reload no está instalado, continuar sin él
        pass

# https://docs.djangoproject.com/en/5.1/ref/settings/#databases
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': config('POSTGRES_DB'),
        'USER': config('POSTGRES_USER'),
        'PASSWORD': config('POSTGRES_PASSWORD'),
        'HOST': config('POSTGRES_HOST'),
        'PORT': '5432',
    }
}

EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'

EMAIL_HOST = config('EMAIL_HOST')
EMAIL_PORT = config('EMAIL_PORT', cast=int)
EMAIL_USE_SSL = config('EMAIL_USE_SSL', default=True, cast=bool)
EMAIL_HOST_USER = config('EMAIL_HOST_USER')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD')
DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL')

# Configuración de caché (Redis)
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': config('REDIS_URL'),
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        }
    }
}

# Configuración de Celery con Redis
CELERY_BROKER_URL = config('CELERY_BROKER_URL')
CELERY_RESULT_BACKEND = config('CELERY_RESULT_BACKEND')

# Limpiar CORS_ALLOWED_ORIGINS - remover espacios y strings vacíos
CORS_ORIGINS_STR = config('CORS_ALLOWED_ORIGINS', default='')
# Remover comillas si están presentes
CORS_ORIGINS_STR = CORS_ORIGINS_STR.strip('"').strip("'")
CORS_ALLOWED_ORIGINS = [o.strip() for o in CORS_ORIGINS_STR.split(',') if o.strip()]

CSRF_TRUSTED_ORIGINS_STR = config('CSRF_TRUSTED_ORIGINS', default='')
CSRF_TRUSTED_ORIGINS_STR = CSRF_TRUSTED_ORIGINS_STR.strip('"').strip("'")
CSRF_TRUSTED_ORIGINS = [o.strip() for o in CSRF_TRUSTED_ORIGINS_STR.split(',') if o.strip()]

# Security headers
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
# Defensa en profundidad: si nginx alguna vez sirve HTTP, Django redirige también.
SECURE_SSL_REDIRECT = config('SECURE_SSL_REDIRECT', default=True, cast=bool)
SECURE_REDIRECT_EXEMPT = []
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_BROWSER_XSS_FILTER = True
SESSION_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_SECURE = True
CSRF_COOKIE_HTTPONLY = False  # DRF/JS leen el token
CSRF_COOKIE_SAMESITE = 'Lax'
X_FRAME_OPTIONS = 'DENY'
SECURE_REFERRER_POLICY = 'strict-origin-when-cross-origin'

# Si DEBUG está activado, agregar middleware de django_browser_reload si está disponible
if DEBUG:
    try:
        import django_browser_reload
        MIDDLEWARE += ['django_browser_reload.middleware.BrowserReloadMiddleware']
    except ImportError:
        # django_browser_reload no está instalado, continuar sin él
        pass


# ── Logging ──────────────────────────────────────────────────────────────────
# En producción escribir a archivo rotativo + stdout (gunicorn/docker capture).
LOG_DIR = os.path.join(BASE_DIR, 'logs')
try:
    os.makedirs(LOG_DIR, exist_ok=True)
except OSError:
    # Filesystem read-only o sin permisos: seguimos solo con stdout
    LOG_DIR = None

_file_handler = {
    'level': 'INFO',
    'class': 'logging.handlers.RotatingFileHandler',
    'filename': os.path.join(LOG_DIR, 'django.log') if LOG_DIR else '/tmp/django.log',
    'maxBytes': 10 * 1024 * 1024,  # 10 MB
    'backupCount': 5,
    'formatter': 'verbose',
    'encoding': 'utf-8',
}

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '[{asctime}] {levelname} {name} {process:d} {thread:d} — {message}',
            'style': '{',
        },
        'simple': {
            'format': '[{levelname}] {name}: {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'simple',
        },
        'file': _file_handler,
        'mail_admins': {
            'level': 'ERROR',
            'class': 'django.utils.log.AdminEmailHandler',
            'include_html': False,
        },
    },
    'root': {
        'handlers': ['console', 'file'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
        'django.request': {
            'handlers': ['console', 'file', 'mail_admins'],
            'level': 'WARNING',
            'propagate': False,
        },
        'django.security': {
            'handlers': ['console', 'file', 'mail_admins'],
            'level': 'WARNING',
            'propagate': False,
        },
        'pozosscz': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
        'flota': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
        'maps': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
        'clientes': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}

# Sentry opcional: activado si SENTRY_DSN está en .env
SENTRY_DSN = config('SENTRY_DSN', default='')
if SENTRY_DSN:
    try:
        import sentry_sdk
        from sentry_sdk.integrations.django import DjangoIntegration
        sentry_sdk.init(
            dsn=SENTRY_DSN,
            integrations=[DjangoIntegration()],
            traces_sample_rate=float(config('SENTRY_TRACES_RATE', default='0.05')),
            send_default_pii=False,
            environment=config('SENTRY_ENV', default='production'),
        )
    except ImportError:
        # sentry-sdk no instalado — seguir sin error tracking
        pass
