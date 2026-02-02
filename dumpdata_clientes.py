#!/usr/bin/env python
"""
Script para exportar clientes sin cargar las URLs problemáticas
Uso: python dumpdata_clientes.py > clientes_backup.json
"""
import os
import sys
import django

# Configurar Django antes de importar modelos
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.prod')
django.setup()

# Ahora importar lo necesario
from django.core.management import call_command
from io import StringIO

# Ejecutar dumpdata sin cargar URLs
# Usamos call_command directamente para evitar problemas de URLs
try:
    # Redirigir stdout para capturar la salida
    output = StringIO()
    call_command('dumpdata', 'clientes.Cliente', '--indent', '2', stdout=output)
    print(output.getvalue())
except Exception as e:
    print(f"Error: {e}", file=sys.stderr)
    sys.exit(1)
