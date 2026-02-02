#!/usr/bin/env python
"""
Script para verificar la configuración de Django en producción
"""
import os
import sys

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.prod')

import django
django.setup()

from django.conf import settings

print("=" * 60)
print("VERIFICACIÓN DE CONFIGURACIÓN DE PRODUCCIÓN")
print("=" * 60)
print()

# Verificar BASE_DIR
print("📁 PATHS:")
print(f"  BASE_DIR: {settings.BASE_DIR}")
print(f"  BASE_DIR type: {type(settings.BASE_DIR)}")
print()

# Verificar TEMPLATES
print("📄 TEMPLATES:")
for i, template_dir in enumerate(settings.TEMPLATES[0]['DIRS']):
    print(f"  DIRS[{i}]: {template_dir}")
    print(f"  DIRS[{i}] type: {type(template_dir)}")
print()

# Verificar STATIC y MEDIA
print("📦 STATIC Y MEDIA:")
print(f"  STATIC_ROOT: {settings.STATIC_ROOT}")
print(f"  STATIC_ROOT type: {type(settings.STATIC_ROOT)}")
print(f"  MEDIA_ROOT: {settings.MEDIA_ROOT}")
print(f"  MEDIA_ROOT type: {type(settings.MEDIA_ROOT)}")
print()

# Verificar ALLOWED_HOSTS
print("🌐 ALLOWED_HOSTS:")
print(f"  ALLOWED_HOSTS: {settings.ALLOWED_HOSTS}")
print(f"  ALLOWED_HOSTS type: {type(settings.ALLOWED_HOSTS)}")
print()

# Verificar DEBUG
print("🐛 DEBUG:")
print(f"  DEBUG: {settings.DEBUG}")
print(f"  DEBUG type: {type(settings.DEBUG)}")
print()

# Verificar INSTALLED_APPS
print("📦 INSTALLED_APPS:")
if 'django_browser_reload' in settings.INSTALLED_APPS:
    print("  ⚠️  django_browser_reload está en INSTALLED_APPS")
else:
    print("  ✓ django_browser_reload NO está en INSTALLED_APPS")
print()

# Verificar si hay objetos Path en alguna configuración
print("🔍 VERIFICACIÓN DE PATH OBJECTS:")
issues = []
if isinstance(settings.BASE_DIR, type(Path('.'))):
    issues.append("BASE_DIR es un objeto Path")
if any(isinstance(d, type(Path('.'))) for d in settings.TEMPLATES[0]['DIRS']):
    issues.append("TEMPLATES['DIRS'] contiene objetos Path")
if isinstance(settings.STATIC_ROOT, type(Path('.'))):
    issues.append("STATIC_ROOT es un objeto Path")
if isinstance(settings.MEDIA_ROOT, type(Path('.'))):
    issues.append("MEDIA_ROOT es un objeto Path")

if issues:
    print("  ✗ PROBLEMAS ENCONTRADOS:")
    for issue in issues:
        print(f"    - {issue}")
else:
    print("  ✓ No se encontraron objetos Path en la configuración")
print()

print("=" * 60)
