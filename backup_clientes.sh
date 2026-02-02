#!/bin/bash

# Script de backup ESPECÍFICO para la tabla de clientes
# Crea backups en múltiples formatos para máxima seguridad
# Uso: ./backup_clientes.sh

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
BACKUP_SQL="$BACKUP_DIR/clientes_backup_${TIMESTAMP}.sql"
BACKUP_CSV="$BACKUP_DIR/clientes_backup_${TIMESTAMP}.csv"
BACKUP_JSON="$BACKUP_DIR/clientes_backup_${TIMESTAMP}.json"

# Verificar que el contenedor esté corriendo
CONTAINER_NAME="pozosscz_db"
if ! docker ps --format "{{.Names}}" | grep -q "^${CONTAINER_NAME}$"; then
    echo "Error: El contenedor $CONTAINER_NAME no está corriendo"
    echo "Inicia los contenedores con: $DOCKER_CMD up -d"
    exit 1
fi

echo "═══════════════════════════════════════════════════════════"
echo "  BACKUP ESPECÍFICO DE TABLA CLIENTES"
echo "═══════════════════════════════════════════════════════════"
echo "Método: $DOCKER_CMD"
echo "Contenedor: $CONTAINER_NAME"
echo "Base de datos: $POSTGRES_DB"
echo "Usuario: $POSTGRES_USER"
echo "Tabla: clientes_cliente"
echo ""

# Contar registros antes del backup
echo "Contando registros en la tabla clientes_cliente..."
if [ "$DOCKER_CMD" = "docker" ]; then
    COUNT=$(docker exec "$CONTAINER_NAME" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT COUNT(*) FROM clientes_cliente;" | tr -d ' ')
else
    COUNT=$($DOCKER_CMD exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT COUNT(*) FROM clientes_cliente;" | tr -d ' ')
fi

if [ -z "$COUNT" ] || [ "$COUNT" = "" ]; then
    echo "⚠️  Advertencia: No se pudo contar los registros"
    COUNT="?"
else
    echo "✓ Registros encontrados: $COUNT"
fi
echo ""

# 1. Backup en formato SQL (solo tabla clientes_cliente)
echo "1️⃣  Creando backup SQL de la tabla clientes_cliente..."
echo "   Usando formato INSERT para máxima compatibilidad..."

if [ "$DOCKER_CMD" = "docker" ]; then
    docker exec "$CONTAINER_NAME" pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
        -t clientes_cliente --data-only --column-inserts --no-owner --no-acl > "$BACKUP_SQL" 2>&1
else
    $DOCKER_CMD exec -T postgres pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
        -t clientes_cliente --data-only --column-inserts --no-owner --no-acl > "$BACKUP_SQL" 2>&1
fi

if [ $? -eq 0 ]; then
    # Verificar que el backup tiene datos
    INSERT_COUNT=$(grep -c "^INSERT INTO" "$BACKUP_SQL" 2>/dev/null || echo "0")
    SQL_SIZE=$(du -h "$BACKUP_SQL" | cut -f1)
    
    if [ "$INSERT_COUNT" -gt 0 ]; then
        echo "   ✓ Backup SQL creado: $BACKUP_SQL ($SQL_SIZE)"
        echo "   ✓ Insert statements encontrados: $INSERT_COUNT"
    else
        echo "   ⚠️  Backup creado pero no se encontraron INSERT statements"
        echo "   Verificando contenido del archivo..."
        head -20 "$BACKUP_SQL"
    fi
else
    echo "   ✗ Error al crear backup SQL"
    echo "   Verificando error:"
    tail -10 "$BACKUP_SQL"
fi

# 2. Backup en formato CSV
echo ""
echo "2️⃣  Creando backup CSV de la tabla clientes_cliente..."
if [ "$DOCKER_CMD" = "docker" ]; then
    docker exec "$CONTAINER_NAME" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
        -c "COPY clientes_cliente TO STDOUT WITH CSV HEADER;" > "$BACKUP_CSV"
else
    $DOCKER_CMD exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
        -c "COPY clientes_cliente TO STDOUT WITH CSV HEADER;" > "$BACKUP_CSV"
fi

if [ $? -eq 0 ]; then
    CSV_SIZE=$(du -h "$BACKUP_CSV" | cut -f1)
    echo "   ✓ Backup CSV creado: $BACKUP_CSV ($CSV_SIZE)"
else
    echo "   ✗ Error al crear backup CSV"
fi

# 3. Backup en formato JSON (usando Django dumpdata si está disponible)
echo ""
echo "3️⃣  Creando backup JSON (formato Django)..."
if [ "$DOCKER_CMD" = "docker" ]; then
    # Intentar usar Django dumpdata desde el contenedor de Django
    if docker ps --format "{{.Names}}" | grep -q "pozosscz_app"; then
        docker exec pozosscz_app python manage.py dumpdata clientes.Cliente --indent 2 > "$BACKUP_JSON" 2>/dev/null
        if [ $? -eq 0 ]; then
            JSON_SIZE=$(du -h "$BACKUP_JSON" | cut -f1)
            echo "   ✓ Backup JSON creado: $BACKUP_JSON ($JSON_SIZE)"
        else
            echo "   ⚠️  No se pudo crear backup JSON (Django no disponible o error)"
        fi
    else
        echo "   ⚠️  Contenedor Django no disponible, omitiendo backup JSON"
    fi
else
    # Con docker-compose
    if docker ps --format "{{.Names}}" | grep -q "pozosscz_app"; then
        docker exec pozosscz_app python manage.py dumpdata clientes.Cliente --indent 2 > "$BACKUP_JSON" 2>/dev/null
        if [ $? -eq 0 ]; then
            JSON_SIZE=$(du -h "$BACKUP_JSON" | cut -f1)
            echo "   ✓ Backup JSON creado: $BACKUP_JSON ($JSON_SIZE)"
        else
            echo "   ⚠️  No se pudo crear backup JSON (Django no disponible o error)"
        fi
    else
        echo "   ⚠️  Contenedor Django no disponible, omitiendo backup JSON"
    fi
fi

# Comprimir todos los backups
echo ""
echo "4️⃣  Comprimiendo backups..."
gzip "$BACKUP_SQL" 2>/dev/null && echo "   ✓ SQL comprimido"
gzip "$BACKUP_CSV" 2>/dev/null && echo "   ✓ CSV comprimido"
[ -f "$BACKUP_JSON" ] && gzip "$BACKUP_JSON" 2>/dev/null && echo "   ✓ JSON comprimido"

# Limpiar backups antiguos (mantener solo los últimos 10)
echo ""
echo "5️⃣  Limpiando backups antiguos (manteniendo los últimos 10)..."
ls -t "$BACKUP_DIR"/clientes_backup_*.sql.gz 2>/dev/null | tail -n +11 | xargs rm -f 2>/dev/null
ls -t "$BACKUP_DIR"/clientes_backup_*.csv.gz 2>/dev/null | tail -n +11 | xargs rm -f 2>/dev/null
ls -t "$BACKUP_DIR"/clientes_backup_*.json.gz 2>/dev/null | tail -n +11 | xargs rm -f 2>/dev/null

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  ✓ BACKUP DE CLIENTES COMPLETADO"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Archivos creados:"
echo "  • SQL:  ${BACKUP_SQL}.gz"
echo "  • CSV:  ${BACKUP_CSV}.gz"
[ -f "${BACKUP_JSON}.gz" ] && echo "  • JSON: ${BACKUP_JSON}.gz"
echo ""
echo "Registros respaldados: $COUNT"
echo ""
echo "Para restaurar desde SQL:"
if [ "$DOCKER_CMD" = "docker" ]; then
    echo "  gunzip -c ${BACKUP_SQL}.gz | docker exec -i $CONTAINER_NAME psql -U $POSTGRES_USER -d $POSTGRES_DB"
else
    echo "  gunzip -c ${BACKUP_SQL}.gz | $DOCKER_CMD exec -T postgres psql -U $POSTGRES_USER -d $POSTGRES_DB"
fi
echo ""
echo "Para restaurar desde CSV:"
if [ "$DOCKER_CMD" = "docker" ]; then
    echo "  gunzip -c ${BACKUP_CSV}.gz | docker exec -i $CONTAINER_NAME psql -U $POSTGRES_USER -d $POSTGRES_DB -c \"COPY clientes_cliente FROM STDIN WITH CSV HEADER;\""
else
    echo "  gunzip -c ${BACKUP_CSV}.gz | $DOCKER_CMD exec -T postgres psql -U $POSTGRES_USER -d $POSTGRES_DB -c \"COPY clientes_cliente FROM STDIN WITH CSV HEADER;\""
fi
