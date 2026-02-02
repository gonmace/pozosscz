#!/bin/bash

# Script para restaurar un backup de la base de datos PostgreSQL
# Uso: ./restore_db.sh <archivo_backup.sql.gz>

if [ -z "$1" ]; then
    echo "Error: Debes especificar el archivo de backup"
    echo "Uso: ./restore_db.sh <archivo_backup.sql.gz>"
    echo ""
    echo "Backups disponibles:"
    ls -lh backups/pozosscz_backup_*.sql.gz 2>/dev/null | tail -5
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

echo "⚠️  ADVERTENCIA: Esta operación reemplazará todos los datos de la base de datos actual"
echo "Método: $DOCKER_CMD"
echo "Contenedor: $CONTAINER_NAME"
echo "Base de datos: $POSTGRES_DB"
echo "Usuario: $POSTGRES_USER"
echo "Archivo de backup: $BACKUP_FILE"
echo ""
read -p "¿Estás seguro de que quieres continuar? (escribe 'si' para confirmar): " confirmacion

if [ "$confirmacion" != "si" ]; then
    echo "Operación cancelada"
    exit 0
fi

echo "Restaurando backup..."

# Restaurar el backup
if [ "$DOCKER_CMD" = "docker" ]; then
    # Usar docker directamente
    if [[ "$BACKUP_FILE" == *.gz ]]; then
        gunzip -c "$BACKUP_FILE" | docker exec -i "$CONTAINER_NAME" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
    else
        cat "$BACKUP_FILE" | docker exec -i "$CONTAINER_NAME" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
    fi
else
    # Usar docker-compose o docker compose
    if [[ "$BACKUP_FILE" == *.gz ]]; then
        gunzip -c "$BACKUP_FILE" | $DOCKER_CMD exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
    else
        cat "$BACKUP_FILE" | $DOCKER_CMD exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
    fi
fi

if [ $? -eq 0 ]; then
    echo "✓ Backup restaurado exitosamente!"
else
    echo "✗ Error al restaurar el backup"
    exit 1
fi
