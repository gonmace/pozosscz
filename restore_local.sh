#!/bin/bash

# Script para restaurar backup en entorno local (python manage.py runserver)
# Uso: ./restore_local.sh <archivo_backup.sql.gz>

if [ -z "$1" ]; then
    echo "Error: Debes especificar el archivo de backup"
    echo "Uso: ./restore_local.sh <archivo_backup.sql.gz>"
    echo ""
    echo "Backups disponibles:"
    ls -lh pozosscz_backup_*.sql.gz backups/*.sql.gz 2>/dev/null | tail -5
    exit 1
fi

BACKUP_FILE="$1"

# Verificar que el archivo existe
if [ ! -f "$BACKUP_FILE" ]; then
    echo "Error: El archivo $BACKUP_FILE no existe"
    exit 1
fi

# Cargar variables de entorno desde .env si existe
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

echo "═══════════════════════════════════════════════════════════"
echo "  RESTAURACIÓN DE BACKUP EN ENTORNO LOCAL"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Archivo de backup: $BACKUP_FILE"
echo ""

# Detectar qué base de datos está usando Django
DJANGO_SETTINGS_MODULE=${DJANGO_SETTINGS_MODULE:-"config.dev"}
export DJANGO_SETTINGS_MODULE

DB_ENGINE=$(python manage.py shell -c "from django.conf import settings; print(settings.DATABASES['default']['ENGINE'])" 2>/dev/null)

if [ -z "$DB_ENGINE" ]; then
    echo "Error: No se pudo detectar la configuración de Django"
    echo "Asegúrate de estar en el directorio del proyecto y tener Django instalado"
    exit 1
fi

echo "Base de datos detectada: $DB_ENGINE"
echo ""

# Verificar si es PostgreSQL o SQLite
if [[ "$DB_ENGINE" == *"postgresql"* ]]; then
    echo "✓ Detectado PostgreSQL"
    echo ""
    
    # Obtener configuración de base de datos
    DB_NAME=$(python manage.py shell -c "from django.conf import settings; print(settings.DATABASES['default']['NAME'])" 2>/dev/null)
    DB_USER=$(python manage.py shell -c "from django.conf import settings; print(settings.DATABASES['default'].get('USER', ''))" 2>/dev/null)
    DB_PASSWORD=$(python manage.py shell -c "from django.conf import settings; print(settings.DATABASES['default'].get('PASSWORD', ''))" 2>/dev/null)
    DB_HOST=$(python manage.py shell -c "from django.conf import settings; print(settings.DATABASES['default'].get('HOST', 'localhost'))" 2>/dev/null)
    DB_PORT=$(python manage.py shell -c "from django.conf import settings; print(settings.DATABASES['default'].get('PORT', '5432'))" 2>/dev/null)
    
    echo "Configuración de PostgreSQL:"
    echo "  Base de datos: $DB_NAME"
    echo "  Usuario: $DB_USER"
    echo "  Host: $DB_HOST"
    echo "  Puerto: $DB_PORT"
    echo ""
    
    echo "⚠️  ADVERTENCIA: Esta operación reemplazará todos los datos"
    echo "   de la base de datos actual con los datos del backup."
    echo ""
    read -p "¿Estás seguro de que quieres continuar? (escribe 'si' para confirmar): " confirmacion
    
    if [ "$confirmacion" != "si" ]; then
        echo "Operación cancelada"
        exit 0
    fi
    
    echo ""
    echo "Restaurando backup..."
    
    # Crear backup de seguridad primero
    TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
    BACKUP_DIR="backups/local"
    mkdir -p "$BACKUP_DIR"
    BACKUP_ANTES="$BACKUP_DIR/local_backup_antes_restore_${TIMESTAMP}.sql"
    
    echo "Creando backup de seguridad de los datos actuales..."
    PGPASSWORD="$DB_PASSWORD" pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" > "$BACKUP_ANTES" 2>/dev/null
    
    if [ $? -eq 0 ]; then
        gzip "$BACKUP_ANTES"
        echo "✓ Backup de seguridad creado: ${BACKUP_ANTES}.gz"
    else
        echo "⚠️  No se pudo crear backup de seguridad (puede que la base esté vacía)"
    fi
    
    echo ""
    echo "Restaurando desde el backup..."
    
    # Restaurar el backup
    if [[ "$BACKUP_FILE" == *.gz ]]; then
        gunzip -c "$BACKUP_FILE" | PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME"
    else
        PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" < "$BACKUP_FILE"
    fi
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "═══════════════════════════════════════════════════════════"
        echo "  ✓ RESTAURACIÓN COMPLETADA"
        echo "═══════════════════════════════════════════════════════════"
        echo ""
        echo "Ejecuta 'python manage.py migrate' si es necesario"
        echo "Luego inicia el servidor: python manage.py runserver"
    else
        echo ""
        echo "✗ Error al restaurar el backup"
        echo "Verifica que PostgreSQL esté corriendo y las credenciales sean correctas"
        exit 1
    fi
    
elif [[ "$DB_ENGINE" == *"sqlite"* ]]; then
    echo "⚠️  Detectado SQLite"
    echo ""
    echo "El backup es de PostgreSQL y tu entorno local usa SQLite."
    echo "No se puede restaurar directamente un backup de PostgreSQL en SQLite."
    echo ""
    echo "Opciones disponibles:"
    echo ""
    echo "1. Cambiar temporalmente a PostgreSQL localmente:"
    echo "   - Instala PostgreSQL localmente"
    echo "   - Configura DATABASES en config/dev.py para usar PostgreSQL"
    echo "   - Ejecuta este script nuevamente"
    echo ""
    echo "2. Usar Django dumpdata/loaddata (recomendado):"
    echo "   - En el VPS, ejecuta: python manage.py dumpdata > backup.json"
    echo "   - Descarga el archivo backup.json"
    echo "   - Localmente ejecuta: python manage.py loaddata backup.json"
    echo ""
    echo "3. Restaurar solo la tabla de clientes usando el script específico:"
    echo "   - Usa: ./restore_clientes_local.sh <backup_clientes.sql.gz>"
    echo "   (Este script convertirá el SQL de PostgreSQL a comandos compatibles)"
    echo ""
    echo "¿Quieres que cree un script para convertir el backup de PostgreSQL a SQLite?"
    echo "(Esto puede tener limitaciones debido a diferencias entre los motores)"
    read -p "Escribe 'si' para crear el script de conversión: " crear_script
    
    if [ "$crear_script" = "si" ]; then
        echo ""
        echo "Creando script de conversión..."
        # Esto sería complejo, mejor ofrecer la opción de usar dumpdata
        echo "La conversión directa es compleja. Mejor usa dumpdata/loaddata."
    fi
    
    exit 0
else
    echo "Error: Base de datos no soportada: $DB_ENGINE"
    echo "Este script solo soporta PostgreSQL y SQLite"
    exit 1
fi
