# flake8: noqa
from .base import *

# Leer DEBUG del .env - acepta True/False, 1/0, yes/no, on/off
# python-decouple puede tener problemas con cast=bool, así que lo hacemos manualmente
DEBUG_STR = str(config('DJANGO_DEBUG', default='False')).strip().lower()
DEBUG = DEBUG_STR in ('true', '1', 'yes', 'on')

ALLOWED_HOSTS = config('DJANGO_ALLOWED_HOSTS', default='').split(',')

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

CORS_ALLOWED_ORIGINS = config('CORS_ALLOWED_ORIGINS').split(',')

CSRF_TRUSTED_ORIGINS = ['https://limpiezapozossepticos.com', 'https://www.pozosscz.com', 'https://pozosscz.com']

# Si DEBUG está activado, agregar middleware de django_browser_reload si está disponible
if DEBUG:
    try:
        import django_browser_reload
        MIDDLEWARE += ['django_browser_reload.middleware.BrowserReloadMiddleware']
    except ImportError:
        # django_browser_reload no está instalado, continuar sin él
        pass
