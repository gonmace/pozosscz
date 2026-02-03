"""
Monkey patch para asegurar que todos los paths sean strings
Esto corrige el problema de PosixPath en template_name_list cuando Django intenta hacer join()
"""
from pathlib import Path

def _convert_paths_to_strings(template_name_list):
    """
    Convierte todos los Path objects en la lista a strings
    """
    result = []
    for name in template_name_list:
        if isinstance(name, Path):
            result.append(str(name))
        elif hasattr(name, '__fspath__'):
            # Para objetos que implementan __fspath__ (como Path)
            result.append(str(name))
        else:
            result.append(name)
    return result

# Parchear la función select_template de Django
try:
    from django.template import loader
    
    # Guardar la función original
    _original_select_template = loader.select_template
    
    def select_template_patched(template_name_list, using=None):
        """
        Versión parcheada que convierte Path objects a strings antes de procesar
        """
        # Convertir todos los Path objects a strings
        template_name_list = _convert_paths_to_strings(template_name_list)
        return _original_select_template(template_name_list, using=using)
    
    # Aplicar el parche
    loader.select_template = select_template_patched
    
except Exception as e:
    # Si hay algún error al aplicar el parche, continuar sin él
    import warnings
    warnings.warn(f"No se pudo aplicar el parche de paths: {e}")
