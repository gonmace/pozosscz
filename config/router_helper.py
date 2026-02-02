"""
Helper para evitar el registro múltiple del convertidor de formato suffix.

PROBLEMA: DefaultRouter.get_urls() internamente llama a format_suffix_patterns(),
que registra el convertidor 'drf_format_suffix'. Cuando hay múltiples routers,
cada uno intenta registrar el mismo convertidor, causando ValueError.

SOLUCIÓN: Usar un router que capture el ValueError y retorne URLs sin format_suffix_patterns.
"""
from rest_framework import routers


class SafeDefaultRouter(routers.DefaultRouter):
    """
    Router que evita el registro múltiple del convertidor de formato suffix.
    
    DefaultRouter.get_urls() internamente aplica format_suffix_patterns().
    Si el convertidor ya está registrado (por otro router), capturamos
    el ValueError y retornamos las URLs sin aplicar format_suffix_patterns nuevamente.
    """
    def get_urls(self):
        """
        Sobrescribe get_urls para capturar ValueError cuando el convertidor ya está registrado.
        """
        try:
            # Intentar llamar al método padre (que aplica format_suffix_patterns)
            return super().get_urls()
        except ValueError as e:
            # Si el convertidor 'drf_format_suffix' ya está registrado
            if "drf_format_suffix" in str(e):
                # Obtener URLs directamente sin aplicar format_suffix_patterns
                # Esto es lo que hace BaseRouter.get_urls() antes de aplicar format_suffix_patterns
                urls = []
                for prefix, viewset, basename in self.registry:
                    lookup = self.get_lookup_regex(viewset)
                    routes = self.get_routes(viewset)
                    
                    for route in routes:
                        mapping = self.get_method_map(viewset, route.mapping)
                        if not mapping:
                            continue
                        
                        url_path = route.url.replace('{prefix}', prefix)
                        url_path = url_path.replace('{lookup}', lookup)
                        
                        view = viewset.as_view(mapping, **route.initkwargs)
                        name = route.name.format(basename=basename)
                        
                        from django.urls import path
                        urls.append(path(url_path, view, name=name))
                
                return urls
            else:
                # Re-lanzar si es otro tipo de ValueError
                raise
