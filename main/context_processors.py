from typing import Dict, List
from pozosscz.models import DatosGenerales

def menu_data(request) -> Dict[str, List[Dict]]:
    """Context processor that provides menu data to all templates."""
    datos_generales = DatosGenerales.objects.first()

    menu_items = [
        {
            "name": "Inicio",
            "link": "/",
            "icon": "home",
            "protected": False
        },
        {
            "name": "Cotiza",
            "link": "/cotiza",
            "icon": "cotiza",
            "protected": False
        },
        {
            "name": "Calcula",
            "link": "/calcula",
            "icon": "calcula",
            "protected": False
        },
        {
            "name": "Contáctanos",
            "link": "/contact",
            "icon": "contact",
            "protected": False
        },
        {
            "name": "Mapa",
            "link": "/mapa",
            "icon": "map",
            "protected": True
        },
        
    ]
    
    # Zonas para el footer (linking interno en todo el sitio). Import perezoso
    # para evitar import circular con main.views.
    from main.views import ZONAS
    zonas_footer = [{'slug': slug, 'nombre': data['nombre']} for slug, data in ZONAS.items()]

    return {
        'menu_data': menu_items,
        'is_authenticated': request.user.is_authenticated,
        'datos_generales': datos_generales,
        'zonas_footer': zonas_footer,
    }