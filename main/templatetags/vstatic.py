"""Cache-busting para assets estáticos.

Uso en templates:

    {% load vstatic %}
    <script src="{% vstatic 'maps/maps.js' %}"></script>

Devuelve la misma URL que ``{% static %}`` con ``?v=<mtime>`` añadido.
De esta forma, cada vez que ``collectstatic`` reemplaza un archivo,
el navegador descarga la nueva versión (compatible con
``Cache-Control: immutable`` porque la URL cambia).
"""
from __future__ import annotations

import os

from django import template
from django.conf import settings
from django.templatetags.static import static

register = template.Library()

_mtime_cache: dict[str, int] = {}


def _mtime(relpath: str) -> int:
    cached = _mtime_cache.get(relpath)
    if cached is not None:
        return cached
    for root in (settings.STATIC_ROOT, *getattr(settings, 'STATICFILES_DIRS', [])):
        if not root:
            continue
        path = os.path.join(str(root), relpath)
        try:
            ts = int(os.path.getmtime(path))
        except OSError:
            continue
        _mtime_cache[relpath] = ts
        return ts
    return 0


@register.simple_tag
def vstatic(relpath: str) -> str:
    url = static(relpath)
    ts = _mtime(relpath)
    if not ts:
        return url
    sep = '&' if '?' in url else '?'
    return f"{url}{sep}v={ts}"
