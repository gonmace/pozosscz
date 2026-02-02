#!/bin/bash

# Script para exportar datos del VPS en formato JSON (compatible con cualquier BD)
# Este script debe ejecutarse EN EL VPS
# Uso: ./exportar_para_local.sh

echo "═══════════════════════════════════════════════════════════"
echo "  EXPORTACIÓN DE DATOS PARA ENTORNO LOCAL"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Este script crea archivos JSON que pueden restaurarse"
echo "en cualquier entorno (PostgreSQL, SQLite, etc.)"
echo ""

# Crear directorio de exports
EXPORT_DIR="exports"
mkdir -p "$EXPORT_DIR"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Exportar toda la base de datos
echo "1️⃣  Exportando toda la base de datos..."
python manage.py dumpdata --indent 2 > "$EXPORT_DIR/backup_completo_${TIMESTAMP}.json" 2>&1

if [ $? -eq 0 ]; then
    SIZE=$(du -h "$EXPORT_DIR/backup_completo_${TIMESTAMP}.json" | cut -f1)
    echo "   ✓ Backup completo creado: $EXPORT_DIR/backup_completo_${TIMESTAMP}.json ($SIZE)"
else
    echo "   ✗ Error al crear backup completo"
fi

# Exportar solo clientes
echo ""
echo "2️⃣  Exportando solo tabla de clientes..."
python manage.py dumpdata clientes.Cliente --indent 2 > "$EXPORT_DIR/clientes_${TIMESTAMP}.json" 2>&1

if [ $? -eq 0 ]; then
    SIZE=$(du -h "$EXPORT_DIR/clientes_${TIMESTAMP}.json" | cut -f1)
    echo "   ✓ Backup de clientes creado: $EXPORT_DIR/clientes_${TIMESTAMP}.json ($SIZE)"
else
    echo "   ✗ Error al crear backup de clientes"
fi

# Exportar otras apps importantes
echo ""
echo "3️⃣  Exportando otras apps..."
python manage.py dumpdata pozosscz --indent 2 > "$EXPORT_DIR/pozosscz_${TIMESTAMP}.json" 2>&1
python manage.py dumpdata main --indent 2 > "$EXPORT_DIR/main_${TIMESTAMP}.json" 2>&1

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  ✓ EXPORTACIÓN COMPLETADA"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Archivos creados en: $EXPORT_DIR/"
ls -lh "$EXPORT_DIR"/*_${TIMESTAMP}.json 2>/dev/null
echo ""
echo "Para restaurar en tu máquina local:"
echo "  python manage.py loaddata $EXPORT_DIR/clientes_${TIMESTAMP}.json"
echo ""
