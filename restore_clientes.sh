#!/bin/bash

# Script para restaurar SOLO la tabla de clientes desde un backup
# Uso: ./restore_clientes.sh <archivo_backup.sql.gz>

if [ -z "$1" ]; then
    echo "Error: Debes especificar el archivo de backup"
    echo "Uso: ./restore_clientes.sh <archivo_backup.sql.gz>"
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

# Verificar que el contenedor esté corriendo
CONTAINER_NAME="pozosscz_db"
if ! docker ps --format "{{.Names}}" | grep -q "^${CONTAINER_NAME}$"; then
    echo "Error: El contenedor $CONTAINER_NAME no está corriendo"
    echo "Inicia los contenedores con: $DOCKER_CMD up -d"
    exit 1
fi

echo "═══════════════════════════════════════════════════════════"
echo "  RESTAURACIÓN DE TABLA CLIENTES"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "⚠️  ADVERTENCIA: Esta operación reemplazará TODOS los datos"
echo "   de la tabla clientes_cliente con los datos del backup."
echo ""
echo "Método: $DOCKER_CMD"
echo "Contenedor: $CONTAINER_NAME"
echo "Base de datos: $POSTGRES_DB"
echo "Usuario: $POSTGRES_USER"
echo "Tabla: clientes_cliente"
echo "Archivo de backup: $BACKUP_FILE"
echo ""

# Contar registros actuales
echo "Contando registros actuales..."
if [ "$DOCKER_CMD" = "docker" ]; then
    COUNT_ACTUAL=$(docker exec "$CONTAINER_NAME" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT COUNT(*) FROM clientes_cliente;" | tr -d ' ')
else
    COUNT_ACTUAL=$($DOCKER_CMD exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT COUNT(*) FROM clientes_cliente;" | tr -d ' ')
fi
echo "Registros actuales en la tabla: $COUNT_ACTUAL"
echo ""

read -p "¿Estás seguro de que quieres continuar? (escribe 'si' para confirmar): " confirmacion

if [ "$confirmacion" != "si" ]; then
    echo "Operación cancelada"
    exit 0
fi

echo ""
echo "Restaurando backup..."

# Primero, hacer un backup de seguridad de los datos actuales
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="backups/clientes"
mkdir -p "$BACKUP_DIR"
BACKUP_ANTES="$BACKUP_DIR/clientes_antes_restore_${TIMESTAMP}.sql"

echo "Creando backup de seguridad de los datos actuales..."
if [ "$DOCKER_CMD" = "docker" ]; then
    docker exec "$CONTAINER_NAME" pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
        -t clientes_cliente --data-only --column-inserts > "$BACKUP_ANTES"
else
    $DOCKER_CMD exec -T postgres pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
        -t clientes_cliente --data-only --column-inserts > "$BACKUP_ANTES"
fi

if [ $? -eq 0 ]; then
    gzip "$BACKUP_ANTES"
    echo "✓ Backup de seguridad creado: ${BACKUP_ANTES}.gz"
else
    echo "⚠️  No se pudo crear backup de seguridad, pero continuando..."
fi

echo ""
echo "Eliminando datos actuales de la tabla..."
if [ "$DOCKER_CMD" = "docker" ]; then
    docker exec "$CONTAINER_NAME" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
        -c "TRUNCATE TABLE clientes_cliente CASCADE;" > /dev/null 2>&1
else
    $DOCKER_CMD exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
        -c "TRUNCATE TABLE clientes_cliente CASCADE;" > /dev/null 2>&1
fi

echo "Restaurando datos desde el backup..."

# Restaurar el backup
if [[ "$BACKUP_FILE" == *.gz ]]; then
    if [ "$DOCKER_CMD" = "docker" ]; then
        gunzip -c "$BACKUP_FILE" | docker exec -i "$CONTAINER_NAME" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
    else
        gunzip -c "$BACKUP_FILE" | $DOCKER_CMD exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
    fi
else
    if [ "$DOCKER_CMD" = "docker" ]; then
        cat "$BACKUP_FILE" | docker exec -i "$CONTAINER_NAME" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
    else
        cat "$BACKUP_FILE" | $DOCKER_CMD exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
    fi
fi

if [ $? -eq 0 ]; then
    # Contar registros después de la restauración
    echo ""
    echo "Verificando restauración..."
    if [ "$DOCKER_CMD" = "docker" ]; then
        COUNT_NUEVO=$(docker exec "$CONTAINER_NAME" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT COUNT(*) FROM clientes_cliente;" | tr -d ' ')
    else
        COUNT_NUEVO=$($DOCKER_CMD exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT COUNT(*) FROM clientes_cliente;" | tr -d ' ')
    fi
    
    echo ""
    echo "═══════════════════════════════════════════════════════════"
    echo "  ✓ RESTAURACIÓN COMPLETADA"
    echo "═══════════════════════════════════════════════════════════"
    echo ""
    echo "Registros antes:  $COUNT_ACTUAL"
    echo "Registros ahora:  $COUNT_NUEVO"
    echo ""
    echo "Ejecuta './verificar_clientes.sh' para ver estadísticas detalladas"
else
    echo ""
    echo "✗ Error al restaurar el backup"
    echo "Si hay problemas, puedes restaurar el backup de seguridad:"
    echo "  ./restore_clientes.sh ${BACKUP_ANTES}.gz"
    exit 1
fi
