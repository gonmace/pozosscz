from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.contrib.staticfiles.urls import staticfiles_urlpatterns
from django.views.generic import RedirectView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('main.urls')),
    path('', include('maps.urls')),
    path('', include('clientes.urls')),
    path('', include('pozosscz.urls')),
    path('spritesheet.svg', RedirectView.as_view(url=settings.STATIC_URL + 'maps/spritesheet.svg', permanent=True)),
]

if settings.DEBUG:
    # Agregar django_browser_reload solo si está disponible
    try:
        import django_browser_reload
        urlpatterns += [
            path("__reload__/", include("django_browser_reload.urls")),
        ]
    except ImportError:
        # django_browser_reload no está instalado, continuar sin él
        pass
    urlpatterns += staticfiles_urlpatterns()
    # Asegurar que STATIC_ROOT y MEDIA_ROOT sean strings
    static_root = str(settings.STATIC_ROOT) if hasattr(settings, 'STATIC_ROOT') else None
    media_root = str(settings.MEDIA_ROOT) if hasattr(settings, 'MEDIA_ROOT') else None
    if static_root:
        urlpatterns += static(settings.STATIC_URL, document_root=static_root)
    if media_root:
        urlpatterns += static(settings.MEDIA_URL, document_root=media_root)
