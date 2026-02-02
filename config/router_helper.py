"""
Helper para evitar el registro múltiple del convertidor de formato suffix
"""
from rest_framework import routers
from rest_framework.urlpatterns import format_suffix_patterns

# Flag global para rastrear si ya se registró el convertidor
_converter_registered = False


class SafeDefaultRouter(routers.DefaultRouter):
    """
    Router que evita el registro múltiple del convertidor de formato suffix.
    
    Cuando hay múltiples routers DefaultRouter en diferentes apps, cada uno intenta
    registrar el mismo convertidor 'drf_format_suffix', causando un ValueError.
    Esta clase evita ese problema usando un flag global.
    """
    def get_urls(self):
        """
        Sobrescribe get_urls para evitar el registro múltiple del convertidor.
        Solo el primer router registrará el convertidor, los demás usarán URLs sin formato suffix.
        """
        urls = super().get_urls()
        
        global _converter_registered
        
        # Solo intentar registrar el convertidor si no se ha registrado antes
        if not _converter_registered:
            try:
                urls = format_suffix_patterns(urls)
                _converter_registered = True
            except ValueError:
                # El convertidor ya está registrado por otro router
                # Usar URLs sin formato suffix (esto es seguro)
                _converter_registered = True
        # Si ya está registrado, simplemente retornar las URLs sin formato suffix
        
        return urls
