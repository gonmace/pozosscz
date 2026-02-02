#!/bin/bash

# Script para restaurar SOLO la tabla de clientes en entorno local
# Convierte comandos SQL de PostgreSQL a formato compatible con SQLite
# Uso: ./restore_clientes_local.sh <archivo_backup_clientes.sql.gz>

if [ -z "$1" ]; then
    echo "Error: Debes especificar el archivo de backup"
    echo "Uso: ./restore_clientes_local.sh <archivo_backup_clientes.sql.gz>"
    echo ""
    echo "Backups disponibles:"
    ls -lh backups/clientes/clientes_backup_*.sql.gz 2>/dev/null | tail -5
    exit 1
fi

BACKUP_FILE="$1"

# Verificar que el archivo existe
if [ ! -f "$BACKUP_FILE" ]; then
    echo "Error: El archivo $BACKUP_FILE no existe"
    exit 1
fi

echo "═══════════════════════════════════════════════════════════"
echo "  RESTAURACIÓN DE TABLA CLIENTES EN ENTORNO LOCAL"
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
    exit 1
fi

echo "Base de datos detectada: $DB_ENGINE"
echo ""

if [[ "$DB_ENGINE" == *"sqlite"* ]]; then
    echo "⚠️  Detectado SQLite - Se convertirá el SQL de PostgreSQL"
    echo ""
    
    DB_NAME=$(python manage.py shell -c "from django.conf import settings; print(settings.DATABASES['default']['NAME'])" 2>/dev/null)
    
    echo "Base de datos SQLite: $DB_NAME"
    echo ""
    
    echo "⚠️  ADVERTENCIA: Esta operación reemplazará todos los datos"
    echo "   de la tabla clientes_cliente."
    echo ""
    read -p "¿Estás seguro de que quieres continuar? (escribe 'si' para confirmar): " confirmacion
    
    if [ "$confirmacion" != "si" ]; then
        echo "Operación cancelada"
        exit 0
    fi
    
    echo ""
    echo "Creando backup de seguridad..."
    BACKUP_DIR="backups/local"
    mkdir -p "$BACKUP_DIR"
    TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
    BACKUP_ANTES="$BACKUP_DIR/clientes_sqlite_backup_${TIMESTAMP}.sql"
    
    sqlite3 "$DB_NAME" ".dump clientes_cliente" > "$BACKUP_ANTES" 2>/dev/null
    if [ $? -eq 0 ] && [ -s "$BACKUP_ANTES" ]; then
        gzip "$BACKUP_ANTES"
        echo "✓ Backup de seguridad creado: ${BACKUP_ANTES}.gz"
    else
        echo "⚠️  No se pudo crear backup (puede que la tabla esté vacía)"
        rm -f "$BACKUP_ANTES"
    fi
    
    echo ""
    echo "Extrayendo y convirtiendo datos del backup..."
    
    # Crear archivo temporal con SQL convertido
    TEMP_SQL=$(mktemp)
    
    # Descomprimir y convertir comandos de PostgreSQL a SQLite
    if [[ "$BACKUP_FILE" == *.gz ]]; then
        gunzip -c "$BACKUP_FILE" > "$TEMP_SQL"
    else
        cp "$BACKUP_FILE" "$TEMP_SQL"
    fi
    
    # Eliminar la tabla si existe
    echo "Eliminando tabla existente..."
    sqlite3 "$DB_NAME" "DROP TABLE IF EXISTS clientes_cliente;" 2>/dev/null
    
    # Extraer solo los INSERT statements y convertirlos
    echo "Insertando datos..."
    
    # Crear un script Python temporal para hacer la conversión
    PYTHON_SCRIPT=$(mktemp)
    cat > "$PYTHON_SCRIPT" << 'PYEOF'
import sys
import re
import sqlite3

sql_file = sys.argv[1]
db_file = sys.argv[2]

# Leer el archivo SQL
with open(sql_file, 'r', encoding='utf-8') as f:
    content = f.read()

# Conectar a SQLite
conn = sqlite3.connect(db_file)
cursor = conn.cursor()

# Buscar todos los INSERT statements
insert_pattern = r"INSERT INTO.*?;"
inserts = re.findall(insert_pattern, content, re.DOTALL | re.IGNORECASE)

if not inserts:
    print("No se encontraron INSERT statements en el backup")
    sys.exit(1)

print(f"Encontrados {len(inserts)} INSERT statements")

# Ejecutar cada INSERT
success = 0
errors = 0

for insert_stmt in inserts:
    try:
        # Convertir sintaxis de PostgreSQL a SQLite
        # Remover RETURNING si existe
        insert_stmt = re.sub(r'\s+RETURNING.*?;', ';', insert_stmt, flags=re.IGNORECASE)
        
        # Ejecutar el INSERT
        cursor.execute(insert_stmt)
        success += 1
    except Exception as e:
        errors += 1
        if errors <= 5:  # Mostrar solo los primeros 5 errores
            print(f"Error en INSERT: {str(e)[:100]}")

conn.commit()
conn.close()

print(f"✓ Insertados exitosamente: {success}")
if errors > 0:
    print(f"⚠️  Errores: {errors}")

PYEOF

    python3 "$PYTHON_SCRIPT" "$TEMP_SQL" "$DB_NAME"
    
    rm -f "$TEMP_SQL" "$PYTHON_SCRIPT"
    
    echo ""
    echo "═══════════════════════════════════════════════════════════"
    echo "  ✓ RESTAURACIÓN COMPLETADA"
    echo "═══════════════════════════════════════════════════════════"
    echo ""
    echo "Verifica los datos ejecutando:"
    echo "  python manage.py shell -c \"from clientes.models import Cliente; print(Cliente.objects.count())\""
    
elif [[ "$DB_ENGINE" == *"postgresql"* ]]; then
    echo "✓ Detectado PostgreSQL - Restauración directa"
    echo ""
    echo "Usa el script restore_local.sh para restaurar toda la base de datos"
    echo "O ejecuta manualmente:"
    echo ""
    echo "  gunzip -c $BACKUP_FILE | psql -U <usuario> -d <base_datos>"
    exit 0
else
    echo "Error: Base de datos no soportada: $DB_ENGINE"
    exit 1
fi
