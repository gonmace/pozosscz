#!/bin/bash

# Script para exportar clientes usando pg_dump directamente
# Evita problemas con Django URLs
# Uso: ./exportar_clientes_simple.sh

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
    exit 1
fi

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
EXPORT_DIR="exports"
mkdir -p "$EXPORT_DIR"
OUTPUT_FILE="$EXPORT_DIR/clientes_${TIMESTAMP}.json"

echo "═══════════════════════════════════════════════════════════"
echo "  EXPORTACIÓN DE CLIENTES (Método Directo)"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Contar registros primero
echo "Contando registros..."
if [ "$DOCKER_CMD" = "docker" ]; then
    TOTAL=$(docker exec "$CONTAINER_NAME" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT COUNT(*) FROM clientes_cliente;" | tr -d ' ')
else
    TOTAL=$($DOCKER_CMD exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT COUNT(*) FROM clientes_cliente;" | tr -d ' ')
fi

echo "Total de registros: $TOTAL"
echo ""

# Método 1: Usar el script Python que evita URLs
echo "1️⃣  Intentando exportar con script Python (sin URLs)..."
if [ "$DOCKER_CMD" = "docker" ]; then
    if docker ps --format "{{.Names}}" | grep -q "pozosscz_app"; then
        docker exec pozosscz_app python dumpdata_clientes.py > "$OUTPUT_FILE" 2>&1
        
        if [ $? -eq 0 ] && [ -s "$OUTPUT_FILE" ]; then
            JSON_RECORDS=$(grep -c '"model": "clientes.cliente"' "$OUTPUT_FILE" 2>/dev/null || echo "0")
            if [ "$JSON_RECORDS" -gt 0 ]; then
                SIZE=$(du -h "$OUTPUT_FILE" | cut -f1)
                echo "   ✓ Exportación exitosa: $OUTPUT_FILE ($SIZE)"
                echo "   ✓ Registros exportados: $JSON_RECORDS"
                
                if [ "$JSON_RECORDS" -eq "$TOTAL" ]; then
                    echo "   ✓ Todos los registros están presentes"
                else
                    echo "   ⚠️  Registros en BD: $TOTAL, en JSON: $JSON_RECORDS"
                fi
                
                # Comprimir
                gzip "$OUTPUT_FILE"
                echo ""
                echo "═══════════════════════════════════════════════════════════"
                echo "  ✓ EXPORTACIÓN COMPLETADA"
                echo "═══════════════════════════════════════════════════════════"
                echo "Archivo: ${OUTPUT_FILE}.gz"
                echo ""
                echo "Para restaurar en local:"
                echo "  gunzip -c ${OUTPUT_FILE}.gz | python manage.py loaddata --format json -"
                exit 0
            fi
        fi
    fi
fi

# Método 2: Exportar usando psql y convertir a JSON manualmente
echo ""
echo "2️⃣  Exportando usando PostgreSQL y convirtiendo a JSON..."
CSV_FILE="$EXPORT_DIR/clientes_${TIMESTAMP}.csv"

if [ "$DOCKER_CMD" = "docker" ]; then
    docker exec "$CONTAINER_NAME" psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
        -c "COPY (SELECT row_to_json(t) FROM (SELECT * FROM clientes_cliente) t) TO STDOUT;" > "$OUTPUT_FILE" 2>&1
else
    $DOCKER_CMD exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
        -c "COPY (SELECT row_to_json(t) FROM (SELECT * FROM clientes_cliente) t) TO STDOUT;" > "$OUTPUT_FILE" 2>&1
fi

# Convertir el formato de PostgreSQL JSON a formato Django JSON
if [ -s "$OUTPUT_FILE" ]; then
    echo "   Convirtiendo formato..."
    python3 << PYEOF
import json
import sys

# Leer líneas JSON de PostgreSQL
with open('$OUTPUT_FILE', 'r') as f:
    lines = [line.strip() for line in f if line.strip()]

# Convertir a formato Django
django_format = []
for i, line in enumerate(lines, 1):
    try:
        data = json.loads(line)
        django_format.append({
            "model": "clientes.cliente",
            "pk": data.get('id'),
            "fields": {
                "tel1": data.get('tel1', ''),
                "tel2": data.get('tel2', ''),
                "name": data.get('name', ''),
                "address": data.get('address', ''),
                "cod": data.get('cod', ''),
                "cost": data.get('cost', 0),
                "service": data.get('service', 'NOR'),
                "lat": data.get('lat'),
                "lon": data.get('lon'),
                "status": data.get('status', 'COT'),
                "user": data.get('user', 'ADM'),
                "created_at": data.get('created_at')
            }
        })
    except json.JSONDecodeError as e:
        print(f"Error en línea {i}: {e}", file=sys.stderr)
        continue

# Escribir en formato Django
with open('$OUTPUT_FILE', 'w') as f:
    json.dump(django_format, f, indent=2, ensure_ascii=False)

print(f"Convertidos {len(django_format)} registros")
PYEOF

    if [ $? -eq 0 ]; then
        JSON_RECORDS=$(grep -c '"model": "clientes.cliente"' "$OUTPUT_FILE" 2>/dev/null || echo "0")
        SIZE=$(du -h "$OUTPUT_FILE" | cut -f1)
        echo "   ✓ Conversión exitosa: $OUTPUT_FILE ($SIZE)"
        echo "   ✓ Registros: $JSON_RECORDS"
        
        gzip "$OUTPUT_FILE"
        echo ""
        echo "═══════════════════════════════════════════════════════════"
        echo "  ✓ EXPORTACIÓN COMPLETADA"
        echo "═══════════════════════════════════════════════════════════"
        echo "Archivo: ${OUTPUT_FILE}.gz"
    else
        echo "   ✗ Error en la conversión"
        exit 1
    fi
else
    echo "   ✗ Error al exportar desde PostgreSQL"
    exit 1
fi
