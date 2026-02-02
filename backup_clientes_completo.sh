#!/bin/bash

# Script MEJORADO para backup COMPLETO de clientes con verificaciones
# Garantiza que TODOS los registros se respalden correctamente
# Uso: ./backup_clientes_completo.sh

# Cargar variables de entorno desde .env
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "Error: Archivo .env no encontrado"
    exit 1
fi

# Detectar si usar docker-compose o docker directamente
if command -v docker-compose &> /dev/null; then
    DOCKER_CMD="docker-compose"
elif docker compose version &> /dev/null 2>&1; then
    DOCKER_CMD="docker compose"
else
    DOCKER_CMD="docker"
fi

# Crear directorio de backups si no existe
BACKUP_DIR="backups/clientes"
mkdir -p "$BACKUP_DIR"

# Generar nombre de archivo con timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_SQL="$BACKUP_DIR/clientes_completo_${TIMESTAMP}.sql"
BACKUP_CSV="$BACKUP_DIR/clientes_completo_${TIMESTAMP}.csv"
BACKUP_JSON="$BACKUP_DIR/clientes_completo_${TIMESTAMP}.json"

# Verificar que el contenedor esté corriendo
CONTAINER_NAME="pozosscz_db"
if ! docker ps --format "{{.Names}}" | grep -q "^${CONTAINER_NAME}$"; then
    echo "Error: El contenedor $CONTAINER_NAME no está corriendo"
    echo "Inicia los contenedores con: $DOCKER_CMD up -d"
    exit 1
fi

echo "═══════════════════════════════════════════════════════════"
echo "  BACKUP COMPLETO Y VERIFICADO DE CLIENTES"
echo "═══════════════════════════════════════════════════════════"
echo "Método: $DOCKER_CMD"
echo "Contenedor: $CONTAINER_NAME"
echo "Base de datos: $POSTGRES_DB"
echo "Usuario: $POSTGRES_USER"
echo "Tabla: clientes_cliente"
echo ""

# Contar registros ANTES del backup
echo "📊 Verificando datos en la base de datos..."
if [ "$DOCKER_CMD" = "docker" ]; then
    TOTAL=$(docker exec "$CONTAINER_NAME" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT COUNT(*) FROM clientes_cliente;" | tr -d ' ')
    MAX_ID=$(docker exec "$CONTAINER_NAME" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT MAX(id) FROM clientes_cliente;" | tr -d ' ')
    MIN_ID=$(docker exec "$CONTAINER_NAME" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT MIN(id) FROM clientes_cliente;" | tr -d ' ')
else
    TOTAL=$($DOCKER_CMD exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT COUNT(*) FROM clientes_cliente;" | tr -d ' ')
    MAX_ID=$($DOCKER_CMD exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT MAX(id) FROM clientes_cliente;" | tr -d ' ')
    MIN_ID=$($DOCKER_CMD exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT MIN(id) FROM clientes_cliente;" | tr -d ' ')
fi

if [ -z "$TOTAL" ] || [ "$TOTAL" = "" ]; then
    echo "⚠️  Error: No se pudo contar los registros"
    exit 1
fi

echo "✓ Total de registros en BD: $TOTAL"
echo "✓ ID mínimo: $MIN_ID"
echo "✓ ID máximo: $MAX_ID"
echo ""

# 1. Backup en formato SQL con INSERT statements explícitos
echo "1️⃣  Creando backup SQL (formato INSERT)..."
if [ "$DOCKER_CMD" = "docker" ]; then
    docker exec "$CONTAINER_NAME" pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
        -t clientes_cliente --data-only --column-inserts --no-owner --no-acl > "$BACKUP_SQL" 2>&1
else
    $DOCKER_CMD exec -T postgres pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
        -t clientes_cliente --data-only --column-inserts --no-owner --no-acl > "$BACKUP_SQL" 2>&1
fi

if [ $? -eq 0 ]; then
    # Verificar contenido del backup
    INSERT_COUNT=$(grep -c "^INSERT INTO" "$BACKUP_SQL" 2>/dev/null || echo "0")
    SQL_SIZE=$(du -h "$BACKUP_SQL" | cut -f1)
    
    if [ "$INSERT_COUNT" -gt 0 ]; then
        echo "   ✓ Backup SQL creado: $BACKUP_SQL ($SQL_SIZE)"
        echo "   ✓ INSERT statements: $INSERT_COUNT"
        
        # Contar registros únicos en el backup
        RECORDS_IN_BACKUP=$(grep "^INSERT INTO" "$BACKUP_SQL" | wc -l)
        echo "   ✓ Registros en backup: $RECORDS_IN_BACKUP"
        
        if [ "$RECORDS_IN_BACKUP" -ne "$TOTAL" ]; then
            echo "   ⚠️  ADVERTENCIA: El número de registros no coincide!"
            echo "      BD tiene: $TOTAL"
            echo "      Backup tiene: $RECORDS_IN_BACKUP"
        else
            echo "   ✓ Verificación: Todos los registros están en el backup"
        fi
    else
        echo "   ✗ Error: No se encontraron INSERT statements en el backup"
        echo "   Primeras líneas del archivo:"
        head -20 "$BACKUP_SQL"
        exit 1
    fi
else
    echo "   ✗ Error al crear backup SQL"
    tail -20 "$BACKUP_SQL"
    exit 1
fi

# 2. Backup en formato CSV (más confiable para contar registros)
echo ""
echo "2️⃣  Creando backup CSV..."
if [ "$DOCKER_CMD" = "docker" ]; then
    docker exec "$CONTAINER_NAME" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
        -c "COPY clientes_cliente TO STDOUT WITH CSV HEADER;" > "$BACKUP_CSV" 2>&1
else
    $DOCKER_CMD exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
        -c "COPY clientes_cliente TO STDOUT WITH CSV HEADER;" > "$BACKUP_CSV" 2>&1
fi

if [ $? -eq 0 ]; then
    CSV_LINES=$(wc -l < "$BACKUP_CSV" | tr -d ' ')
    CSV_SIZE=$(du -h "$BACKUP_CSV" | cut -f1)
    CSV_RECORDS=$((CSV_LINES - 1))  # Restar la línea del header
    
    echo "   ✓ Backup CSV creado: $BACKUP_CSV ($CSV_SIZE)"
    echo "   ✓ Líneas totales: $CSV_LINES (registros: $CSV_RECORDS)"
    
    if [ "$CSV_RECORDS" -ne "$TOTAL" ]; then
        echo "   ⚠️  ADVERTENCIA: El número de registros CSV no coincide!"
        echo "      BD tiene: $TOTAL"
        echo "      CSV tiene: $CSV_RECORDS"
    else
        echo "   ✓ Verificación CSV: Todos los registros están presentes"
    fi
else
    echo "   ✗ Error al crear backup CSV"
    tail -10 "$BACKUP_CSV"
fi

# 3. Backup en formato JSON usando Django dumpdata
echo ""
echo "3️⃣  Creando backup JSON (formato Django)..."
if docker ps --format "{{.Names}}" | grep -q "pozosscz_app"; then
    docker exec pozosscz_app python manage.py dumpdata clientes.Cliente --indent 2 > "$BACKUP_JSON" 2>&1
    
    if [ $? -eq 0 ] && [ -s "$BACKUP_JSON" ]; then
        JSON_SIZE=$(du -h "$BACKUP_JSON" | cut -f1)
        JSON_RECORDS=$(grep -c '"model": "clientes.cliente"' "$BACKUP_JSON" 2>/dev/null || echo "0")
        
        echo "   ✓ Backup JSON creado: $BACKUP_JSON ($JSON_SIZE)"
        echo "   ✓ Registros JSON: $JSON_RECORDS"
        
        if [ "$JSON_RECORDS" -ne "$TOTAL" ]; then
            echo "   ⚠️  ADVERTENCIA: El número de registros JSON no coincide!"
            echo "      BD tiene: $TOTAL"
            echo "      JSON tiene: $JSON_RECORDS"
        else
            echo "   ✓ Verificación JSON: Todos los registros están presentes"
        fi
    else
        echo "   ⚠️  No se pudo crear backup JSON (Django no disponible o error)"
    fi
else
    echo "   ⚠️  Contenedor Django no disponible, omitiendo backup JSON"
fi

# Comprimir todos los backups
echo ""
echo "4️⃣  Comprimiendo backups..."
gzip "$BACKUP_SQL" 2>/dev/null && echo "   ✓ SQL comprimido: ${BACKUP_SQL}.gz"
gzip "$BACKUP_CSV" 2>/dev/null && echo "   ✓ CSV comprimido: ${BACKUP_CSV}.gz"
[ -f "$BACKUP_JSON" ] && gzip "$BACKUP_JSON" 2>/dev/null && echo "   ✓ JSON comprimido: ${BACKUP_JSON}.gz"

# Resumen final
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  ✓ BACKUP COMPLETO FINALIZADO"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "📊 RESUMEN:"
echo "   Registros en BD:        $TOTAL"
echo "   ID rango:               $MIN_ID - $MAX_ID"
echo ""
echo "📁 ARCHIVOS CREADOS:"
echo "   • SQL:  ${BACKUP_SQL}.gz"
echo "   • CSV:  ${BACKUP_CSV}.gz"
[ -f "${BACKUP_JSON}.gz" ] && echo "   • JSON: ${BACKUP_JSON}.gz"
echo ""
echo "✅ VERIFICACIÓN:"
if [ "$RECORDS_IN_BACKUP" -eq "$TOTAL" ] && [ "$CSV_RECORDS" -eq "$TOTAL" ]; then
    echo "   ✓ Todos los backups contienen los $TOTAL registros"
else
    echo "   ⚠️  Revisa las advertencias arriba"
fi
echo ""
echo "Para restaurar en local (SQLite):"
echo "   python manage.py loaddata ${BACKUP_JSON}.gz"
echo ""
echo "Para restaurar en PostgreSQL:"
if [ "$DOCKER_CMD" = "docker" ]; then
    echo "   gunzip -c ${BACKUP_SQL}.gz | docker exec -i $CONTAINER_NAME psql -U $POSTGRES_USER -d $POSTGRES_DB"
else
    echo "   gunzip -c ${BACKUP_SQL}.gz | $DOCKER_CMD exec -T postgres psql -U $POSTGRES_USER -d $POSTGRES_DB"
fi
