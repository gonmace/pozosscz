from typing import Dict, List

def menu_data(request) -> Dict[str, List[Dict]]:
    """Context processor that provides menu data to all templates."""
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
    
    return {
        'menu_data': menu_items,
        'is_authenticated': request.user.is_authenticated
    } 