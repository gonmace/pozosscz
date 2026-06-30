from django import template
from django.urls import reverse
from django.utils.html import escape
from django.utils.safestring import mark_safe

register = template.Library()

# Nombre visible -> slug de la página de zona.
# (No hay solapamiento entre estos nombres, el orden no afecta.)
_ZONAS_BADGE = [
    ('La Guardia', 'la-guardia'),
    ('Plan 3000', 'plan-3000'),
    ('Warnes', 'warnes'),
    ('Cotoca', 'cotoca'),
    ('Urubó', 'urubo'),
]

_BADGE_CLASS = (
    "inline-flex items-center gap-1 bg-band text-accent font-semibold "
    "text-[12.5px] px-2.5 py-1 rounded-full hover:bg-[#dceee0] transition align-middle"
)


@register.filter
def link_zonas(texto):
    """Reemplaza los nombres de barrio con página propia por su badge-enlace."""
    if not texto:
        return texto
    out = escape(texto)
    for nombre, slug in _ZONAS_BADGE:
        url = reverse('zona_page', args=[slug])
        badge = (
            '<a href="{url}" class="{cls}">{nombre}</a>'
        ).format(url=url, cls=_BADGE_CLASS, nombre=escape(nombre))
        out = out.replace(escape(nombre), badge, 1)  # solo la primera aparición
    return mark_safe(out)
