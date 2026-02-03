"""
Helper para evitar el registro múltiple del convertidor de formato suffix.

PROBLEMA: DefaultRouter.get_urls() internamente llama a format_suffix_patterns(),
que registra el convertidor 'drf_format_suffix'. Cuando hay múltiples routers,
cada uno intenta registrar el mismo convertidor, causando ValueError.

SOLUCIÓN: Usar BaseRouter.get_urls() directamente sin aplicar format_suffix_patterns.
"""
from rest_framework import routers


class SafeDefaultRouter(routers.DefaultRouter):
    """
    Router que evita el registro múltiple del convertidor de formato suffix.
    
    Usa BaseRouter.get_urls() directamente (que construye las URLs correctamente)
    pero evita aplicar format_suffix_patterns para prevenir el error de registro múltiple.
    """
    def get_urls(self):
        """
        Sobrescribe get_urls para construir URLs usando BaseRouter pero sin format_suffix_patterns.
        """
        # Llamar al método de BaseRouter directamente (padre de DefaultRouter)
        # Esto construye las URLs correctamente sin aplicar format_suffix_patterns
        urls = super(routers.DefaultRouter, self).get_urls()
        
        # NO aplicar format_suffix_patterns para evitar el error de registro múltiple
        # Las URLs funcionarán sin el formato suffix (.json, .xml, etc.)
        return urls
