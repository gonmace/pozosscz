# Aplicar parche de paths al importar el módulo config
# Esto asegura que todos los Path objects se conviertan a strings en templates
try:
    from . import path_fix
except ImportError:
    pass
