# Guía de Backups y Restauración

## 📦 Scripts de Backup Disponibles

### Para el VPS (Docker)

1. **`backup_db.sh`** - Backup completo de toda la base de datos
2. **`backup_clientes.sh`** - Backup específico de la tabla de clientes (SQL, CSV, JSON)
3. **`restore_db.sh`** - Restaurar backup completo
4. **`restore_clientes.sh`** - Restaurar solo tabla de clientes
5. **`verificar_clientes.sh`** - Verificar estado y estadísticas de clientes

### Para Entorno Local (python manage.py runserver)

1. **`restore_local.sh`** - Restaurar backup completo en entorno local
2. **`restore_clientes_local.sh`** - Restaurar solo tabla de clientes (convierte PostgreSQL → SQLite)

---

## 🔄 Restaurar Backup del VPS en tu Máquina Local

### Opción 1: Usar Django dumpdata/loaddata (RECOMENDADO)

Esta es la mejor opción porque es independiente del motor de base de datos.

**En el VPS:**
```bash
# Crear dump en formato JSON
python manage.py dumpdata > backup_completo.json

# O solo clientes
python manage.py dumpdata clientes.Cliente > backup_clientes.json
```

**En tu máquina local:**
```bash
# Descargar el archivo JSON del VPS
# Luego restaurar:
python manage.py loaddata backup_clientes.json
```

### Opción 2: Restaurar desde SQL (PostgreSQL → PostgreSQL)

Si tienes PostgreSQL instalado localmente:

1. Configura `config/dev.py` para usar PostgreSQL:
```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'tu_base_datos',
        'USER': 'tu_usuario',
        'PASSWORD': 'tu_password',
        'HOST': 'localhost',
        'PORT': '5432',
    }
}
```

2. Ejecuta el script de restauración:
```bash
./restore_local.sh pozosscz_backup_20260202_234304.sql.gz
```

### Opción 3: Restaurar solo clientes (PostgreSQL → SQLite)

Si estás usando SQLite localmente y solo necesitas restaurar clientes:

```bash
./restore_clientes_local.sh backups/clientes/clientes_backup_YYYYMMDD_HHMMSS.sql.gz
```

**Nota:** Esta opción convierte el SQL de PostgreSQL a SQLite, pero puede tener limitaciones.

---

## 📋 Pasos para Restaurar tu Backup Actual

Tienes el archivo: `pozosscz_backup_20260202_234304.sql.gz`

### Si usas SQLite localmente:

**Mejor opción:** Usar dumpdata/loaddata
1. En el VPS, ejecuta: `python manage.py dumpdata > backup.json`
2. Descarga `backup.json` a tu máquina local
3. Ejecuta: `python manage.py loaddata backup.json`

**Alternativa:** Restaurar solo clientes
```bash
# Primero extrae solo la tabla de clientes del backup completo
gunzip -c pozosscz_backup_20260202_234304.sql.gz | grep -A 1000 "clientes_cliente" > clientes_only.sql

# Luego usa el script de conversión (necesitarías crear el archivo comprimido)
gzip clientes_only.sql
./restore_clientes_local.sh clientes_only.sql.gz
```

### Si instalas PostgreSQL localmente:

1. Instala PostgreSQL
2. Crea una base de datos:
```bash
createdb pozosscz_local
```

3. Configura `config/dev.py` para usar PostgreSQL
4. Ejecuta:
```bash
./restore_local.sh pozosscz_backup_20260202_234304.sql.gz
```

---

## ✅ Verificar Restauración

```bash
# Verificar número de clientes
python manage.py shell -c "from clientes.models import Cliente; print(f'Total clientes: {Cliente.objects.count()}')"

# Ver algunos clientes
python manage.py shell -c "from clientes.models import Cliente; [print(c) for c in Cliente.objects.all()[:5]]"
```

---

## 🆘 Solución de Problemas

### Error: "No se puede restaurar PostgreSQL en SQLite"
- **Solución:** Usa `dumpdata/loaddata` en lugar de SQL directo

### Error: "pg_dump: command not found"
- **Solución:** Instala PostgreSQL client tools:
  - Ubuntu/Debian: `sudo apt-get install postgresql-client`
  - macOS: `brew install postgresql`

### Error: "Django no encuentra la tabla"
- **Solución:** Ejecuta migraciones después de restaurar:
```bash
python manage.py migrate
```

---

## 📁 Estructura de Backups

```
backups/
├── pozosscz_backup_YYYYMMDD_HHMMSS.sql.gz    # Backup completo
└── clientes/
    ├── clientes_backup_YYYYMMDD_HHMMSS.sql.gz
    ├── clientes_backup_YYYYMMDD_HHMMSS.csv.gz
    └── clientes_backup_YYYYMMDD_HHMMSS.json.gz
```
