#!/usr/bin/env python
"""
Script para verificar el valor de DEBUG desde el .env
"""
import os
import sys

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.prod')

import django
django.setup()

from django.conf import settings

print("=" * 50)
print("VERIFICACIÓN DE CONFIGURACIÓN DEBUG")
print("=" * 50)
print(f"DEBUG está activado: {settings.DEBUG}")
print(f"Tipo de DEBUG: {type(settings.DEBUG)}")
print(f"ALLOWED_HOSTS: {settings.ALLOWED_HOSTS}")
print("=" * 50)

if settings.DEBUG:
    print("✓ DEBUG está ACTIVADO - Verás páginas de error detalladas")
else:
    print("✗ DEBUG está DESACTIVADO - Verás páginas de error genéricas")
