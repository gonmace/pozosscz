#!/bin/bash

# Script para verificar el estado de la tabla de clientes
# Compara el número de registros antes y después de operaciones
# Uso: ./verificar_clientes.sh

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
echo "  VERIFICACIÓN DE TABLA CLIENTES"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Obtener estadísticas de la tabla
if [ "$DOCKER_CMD" = "docker" ]; then
    TOTAL=$(docker exec "$CONTAINER_NAME" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT COUNT(*) FROM clientes_cliente;" | tr -d ' ')
    COTIZADOS=$(docker exec "$CONTAINER_NAME" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT COUNT(*) FROM clientes_cliente WHERE status = 'COT';" | tr -d ' ')
    EJECUTADOS=$(docker exec "$CONTAINER_NAME" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT COUNT(*) FROM clientes_cliente WHERE status = 'EJE';" | tr -d ' ')
    LISTA_NEGRA=$(docker exec "$CONTAINER_NAME" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT COUNT(*) FROM clientes_cliente WHERE status = 'NEG';" | tr -d ' ')
    ULTIMO_ID=$(docker exec "$CONTAINER_NAME" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT MAX(id) FROM clientes_cliente;" | tr -d ' ')
    PRIMERA_FECHA=$(docker exec "$CONTAINER_NAME" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT MIN(created_at)::text FROM clientes_cliente;" | tr -d ' ')
    ULTIMA_FECHA=$(docker exec "$CONTAINER_NAME" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT MAX(created_at)::text FROM clientes_cliente;" | tr -d ' ')
else
    TOTAL=$($DOCKER_CMD exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT COUNT(*) FROM clientes_cliente;" | tr -d ' ')
    COTIZADOS=$($DOCKER_CMD exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT COUNT(*) FROM clientes_cliente WHERE status = 'COT';" | tr -d ' ')
    EJECUTADOS=$($DOCKER_CMD exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT COUNT(*) FROM clientes_cliente WHERE status = 'EJE';" | tr -d ' ')
    LISTA_NEGRA=$($DOCKER_CMD exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT COUNT(*) FROM clientes_cliente WHERE status = 'NEG';" | tr -d ' ')
    ULTIMO_ID=$($DOCKER_CMD exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT MAX(id) FROM clientes_cliente;" | tr -d ' ')
    PRIMERA_FECHA=$($DOCKER_CMD exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT MIN(created_at)::text FROM clientes_cliente;" | tr -d ' ')
    ULTIMA_FECHA=$($DOCKER_CMD exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT MAX(created_at)::text FROM clientes_cliente;" | tr -d ' ')
fi

echo "📊 ESTADÍSTICAS DE CLIENTES"
echo "───────────────────────────────────────────────────────────"
echo "  Total de clientes:        $TOTAL"
echo "  ─────────────────────────────────────"
echo "  • Cotizados (COT):        $COTIZADOS"
echo "  • Ejecutados (EJE):        $EJECUTADOS"
echo "  • Lista Negra (NEG):      $LISTA_NEGRA"
echo ""
echo "📅 RANGO DE FECHAS"
echo "───────────────────────────────────────────────────────────"
echo "  Primera fecha:            $PRIMERA_FECHA"
echo "  Última fecha:             $ULTIMA_FECHA"
echo ""
echo "🔢 IDENTIFICADORES"
echo "───────────────────────────────────────────────────────────"
echo "  Último ID:                $ULTIMO_ID"
echo ""

# Verificar backups disponibles
BACKUP_DIR="backups/clientes"
if [ -d "$BACKUP_DIR" ]; then
    BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/clientes_backup_*.sql.gz 2>/dev/null | wc -l)
    if [ "$BACKUP_COUNT" -gt 0 ]; then
        echo "💾 BACKUPS DISPONIBLES"
        echo "───────────────────────────────────────────────────────────"
        echo "  Total de backups:           $BACKUP_COUNT"
        echo ""
        echo "  Últimos 5 backups:"
        ls -lh "$BACKUP_DIR"/clientes_backup_*.sql.gz 2>/dev/null | tail -5 | awk '{print "    • " $9 " (" $5 ")"}'
        echo ""
        
        # Verificar el último backup
        ULTIMO_BACKUP=$(ls -t "$BACKUP_DIR"/clientes_backup_*.sql.gz 2>/dev/null | head -1)
        if [ -n "$ULTIMO_BACKUP" ]; then
            BACKUP_DATE=$(echo "$ULTIMO_BACKUP" | grep -oP '\d{8}_\d{6}' | head -1)
            echo "  Último backup:             $BACKUP_DATE"
        fi
    else
        echo "⚠️  No se encontraron backups de clientes"
        echo "   Ejecuta: ./backup_clientes.sh"
    fi
else
    echo "⚠️  Directorio de backups no existe"
    echo "   Ejecuta: ./backup_clientes.sh"
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
