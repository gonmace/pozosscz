"""
Helper para evitar el registro múltiple del convertidor de formato suffix
"""
from rest_framework import routers
from rest_framework.urlpatterns import format_suffix_patterns

# Flag para rastrear si ya se registró el convertidor
_converter_registered = False


class SafeDefaultRouter(routers.DefaultRouter):
    """
    Router que evita el registro múltiple del convertidor de formato suffix.
    
    Cuando hay múltiples routers DefaultRouter en diferentes apps, cada uno intenta
    registrar el mismo convertidor 'drf_format_suffix', causando un ValueError.
    Esta clase evita ese problema usando un flag global y capturando la excepción.
    """
    def get_urls(self):
        """
        Sobrescribe get_urls para evitar el registro múltiple del convertidor.
        """
        urls = super().get_urls()
        
        global _converter_registered
        
        # Solo intentar aplicar format_suffix_patterns si no se ha hecho antes
        # y si no está ya registrado
        if not _converter_registered:
            try:
                urls = format_suffix_patterns(urls)
                _converter_registered = True
            except ValueError:
                # El convertidor ya está registrado - esto es seguro, simplemente
                # usar las URLs sin formato suffix
                _converter_registered = True
        
        return urls
