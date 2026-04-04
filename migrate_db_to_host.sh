#!/bin/bash
# migrate_db_to_host.sh
# Migra la DB de PostgreSQL del contenedor al PostgreSQL del host VPS
# Uso: bash migrate_db_to_host.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Cargar variables del .env
set -a
source .env
set +a

DB_NAME="${POSTGRES_DB:-pozosscz}"   # nombre destino en el host
SOURCE_DB="${SOURCE_DB:-base}"        # nombre actual en el contenedor
DB_USER="${POSTGRES_USER:-magoreal}"
DB_PASS="${POSTGRES_PASSWORD}"
CONTAINER="pozosscz_db"
BACKUP_FILE="$SCRIPT_DIR/backups/premig_host_$(date +%Y%m%d_%H%M%S).sql"

echo "=============================================="
echo " Migración pozosscz: contenedor → host PG"
echo "=============================================="

# 1. Verificar que el contenedor está corriendo
echo ""
echo "[1/6] Verificando contenedor postgres..."
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
    echo "ERROR: El contenedor '${CONTAINER}' no está corriendo."
    echo "Asegúrate de que los servicios estén activos antes de migrar."
    exit 1
fi
echo "OK — contenedor ${CONTAINER} activo."

# 2. Backup desde el contenedor
echo ""
echo "[2/6] Haciendo backup desde el contenedor (DB origen: '$SOURCE_DB')..."
mkdir -p "$SCRIPT_DIR/backups"
docker exec "$CONTAINER" pg_dump -U "$DB_USER" "$SOURCE_DB" > "$BACKUP_FILE"
echo "OK — backup guardado en: $BACKUP_FILE"
echo "     Tamaño: $(du -sh "$BACKUP_FILE" | cut -f1)"

# 3. Verificar/crear usuario en host PostgreSQL
echo ""
echo "[3/6] Verificando usuario '$DB_USER' en host PostgreSQL..."
if sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" | grep -q 1; then
    echo "OK — usuario '${DB_USER}' ya existe."
else
    echo "Creando usuario '${DB_USER}'..."
    sudo -u postgres psql -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASS}';"
    echo "OK — usuario creado."
fi

# 4. Verificar/crear base de datos en host PostgreSQL
echo ""
echo "[4/6] Verificando base de datos '${DB_NAME}' en host PostgreSQL..."
if sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1; then
    echo "ADVERTENCIA: La base de datos '${DB_NAME}' ya existe en el host."
    read -p "  ¿Deseas limpiarla y restaurar desde el backup? (s/N): " confirm
    if [[ "$confirm" =~ ^[sS]$ ]]; then
        echo "Limpiando base de datos existente..."
        sudo -u postgres psql -c "DROP DATABASE ${DB_NAME};"
        sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"
        echo "OK — base de datos recreada."
    else
        echo "Operación cancelada por el usuario."
        exit 0
    fi
else
    echo "Creando base de datos '${DB_NAME}'..."
    sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"
    echo "OK — base de datos creada."
fi

# 5. Restaurar backup en host PostgreSQL
echo ""
echo "[5/6] Restaurando backup en host PostgreSQL..."
sudo -u postgres psql "$DB_NAME" < "$BACKUP_FILE"
# Asegurar permisos
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};"
sudo -u postgres psql -d "$DB_NAME" -c "GRANT ALL ON SCHEMA public TO ${DB_USER};"
echo "OK — backup restaurado."

# 6. Actualizar .env y reiniciar servicios
echo ""
echo "[6/6] Actualizando .env y reiniciando servicios..."
sed -i "s/^POSTGRES_HOST=.*/POSTGRES_HOST=host.docker.internal/" .env
echo "OK — .env actualizado: POSTGRES_HOST=host.docker.internal"

docker compose down
echo "Reconstruyendo e iniciando servicios (sin postgres)..."
docker compose up -d --build
echo ""

# Esperar a que Django arranque
echo "Esperando que Django inicie (15s)..."
sleep 15

# Verificar
echo ""
echo "=============================================="
echo " Verificación"
echo "=============================================="
docker logs pozosscz_app --tail=20
echo ""

if curl -sf http://localhost:8004/admin/login/ > /dev/null 2>&1; then
    echo "✓ App respondiendo en puerto 8004"
else
    echo "⚠ App no responde aún — revisa: docker logs pozosscz_app"
fi

echo ""
echo "Migración completada."
echo "El contenedor postgres 'pozosscz_db' ya no se usa."
echo "Para eliminar el volumen: docker volume rm pozosscz_postgres_data"
