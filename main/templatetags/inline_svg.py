from django import template
from django.conf import settings
from django.utils.safestring import mark_safe
import os

register = template.Library()

@register.simple_tag
def inline_svg_from_media(media_url_path):
    """
    Incluye el contenido de un archivo SVG ubicado en MEDIA_ROOT, a partir de una URL como /media/archivo.svg.
    """
    media_url = settings.MEDIA_URL.rstrip("/")
    if media_url_path.startswith(media_url):
        relative_path = media_url_path[len(media_url):].lstrip("/")
    else:
        # Asume que es una ruta relativa ya válida
        relative_path = media_url_path.lstrip("/")

    # Asegurar que MEDIA_ROOT sea string
    media_root = str(settings.MEDIA_ROOT) if hasattr(settings, 'MEDIA_ROOT') else ''
    full_path = os.path.join(media_root, relative_path)

    if os.path.exists(full_path) and full_path.endswith(".svg"):
        try:
            with open(full_path, "r", encoding="utf-8") as f:
                return mark_safe(f.read())
        except Exception as e:
            return f"<!-- Error al leer SVG: {e} -->"

    return f"<!-- SVG no encontrado: {relative_path} -->"

@register.simple_tag
def inline_svg_from_static(static_path):
    """
    Incluye el contenido de un archivo SVG ubicado en STATIC_ROOT o STATICFILES_DIRS, 
    a partir de una ruta relativa como 'icons/archivo.svg'.
    """
    # Asegurarse que la ruta no comience con /static/
    if static_path.startswith(settings.STATIC_URL):
        relative_path = static_path[len(settings.STATIC_URL):].lstrip("/")
    else:
        relative_path = static_path.lstrip("/")

    # Buscar primero en STATIC_ROOT (producción)
    static_root = str(settings.STATIC_ROOT) if hasattr(settings, 'STATIC_ROOT') and settings.STATIC_ROOT else ''
    if static_root:
        full_path = os.path.join(static_root, relative_path)
        if os.path.exists(full_path) and full_path.endswith(".svg"):
            try:
                with open(full_path, "r", encoding="utf-8") as f:
                    return mark_safe(f.read())
            except Exception as e:
                pass  # Continuar buscando en STATICFILES_DIRS

    # Si no se encuentra en STATIC_ROOT, buscar en STATICFILES_DIRS (desarrollo)
    if hasattr(settings, 'STATICFILES_DIRS') and settings.STATICFILES_DIRS:
        for static_dir in settings.STATICFILES_DIRS:
            static_dir_str = str(static_dir)
            full_path = os.path.join(static_dir_str, relative_path)
            if os.path.exists(full_path) and full_path.endswith(".svg"):
                try:
                    with open(full_path, "r", encoding="utf-8") as f:
                        return mark_safe(f.read())
                except Exception as e:
                    return f"<!-- Error al leer SVG: {e} -->"

    return f"<!-- SVG no encontrado: {relative_path} -->"
