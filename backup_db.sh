#!/bin/bash

# Script de backup de la base de datos PostgreSQL
# Uso: ./backup_db.sh

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
BACKUP_DIR="backups"
mkdir -p "$BACKUP_DIR"

# Generar nombre de archivo con timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/pozosscz_backup_${TIMESTAMP}.sql"

# Verificar que el contenedor esté corriendo
CONTAINER_NAME="pozosscz_db"
if ! docker ps --format "{{.Names}}" | grep -q "^${CONTAINER_NAME}$"; then
    echo "Error: El contenedor $CONTAINER_NAME no está corriendo"
    echo "Inicia los contenedores con: $DOCKER_CMD up -d"
    exit 1
fi

echo "Iniciando backup de la base de datos..."
echo "Método: $DOCKER_CMD"
echo "Contenedor: $CONTAINER_NAME"
echo "Base de datos: $POSTGRES_DB"
echo "Usuario: $POSTGRES_USER"
echo "Archivo de salida: $BACKUP_FILE"

# Hacer el backup usando pg_dump dentro del contenedor
if [ "$DOCKER_CMD" = "docker" ]; then
    # Usar docker directamente
    docker exec "$CONTAINER_NAME" pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" > "$BACKUP_FILE"
else
    # Usar docker-compose o docker compose
    $DOCKER_CMD exec -T postgres pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" > "$BACKUP_FILE"
fi

if [ $? -eq 0 ]; then
    # Comprimir el backup
    echo "Comprimiendo backup..."
    gzip "$BACKUP_FILE"
    BACKUP_FILE_GZ="${BACKUP_FILE}.gz"
    
    # Obtener tamaño del archivo
    FILE_SIZE=$(du -h "$BACKUP_FILE_GZ" | cut -f1)
    
    echo "✓ Backup completado exitosamente!"
    echo "  Archivo: $BACKUP_FILE_GZ"
    echo "  Tamaño: $FILE_SIZE"
    
    # Limpiar backups antiguos (mantener solo los últimos 10)
    echo "Limpiando backups antiguos (manteniendo los últimos 10)..."
    ls -t "$BACKUP_DIR"/pozosscz_backup_*.sql.gz 2>/dev/null | tail -n +11 | xargs rm -f 2>/dev/null
    
    echo ""
    echo "Para restaurar este backup, usa:"
    if [ "$DOCKER_CMD" = "docker" ]; then
        echo "  gunzip -c $BACKUP_FILE_GZ | docker exec -i $CONTAINER_NAME psql -U $POSTGRES_USER -d $POSTGRES_DB"
    else
        echo "  gunzip -c $BACKUP_FILE_GZ | $DOCKER_CMD exec -T postgres psql -U $POSTGRES_USER -d $POSTGRES_DB"
    fi
else
    echo "✗ Error al crear el backup"
    exit 1
fi
