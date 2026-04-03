# PozosSCZ

Plataforma de cotización y gestión de servicios de limpieza de pozos sépticos en Santa Cruz de la Sierra, Bolivia.

## Stack

- **Backend:** Django 5 + Django REST Framework
- **Frontend:** TypeScript + Vite + Leaflet (mapas) + DaisyUI/TailwindCSS
- **Base de datos:** PostgreSQL
- **Caché:** Redis
- **Tareas:** Celery
- **Contenedores:** Docker

## Apps Django

| App | Descripción |
|---|---|
| `main` | Páginas públicas, SEO, datos generales |
| `maps` | Mapa admin (`/mapa/`), cotización, zonas |
| `pozosscz` | Precios, áreas/factores, bases de camiones |
| `clientes` | Gestión de clientes |

## Servicios externos

| Servicio | URL | Uso |
|---|---|---|
| Microservicio shortlink | `ms.magoreal.com/shortlink` | Resolución de URLs de Google Maps |
| ContentSquare | `t.contentsquare.net` | Mapa de calor |

El microservicio acepta `POST` con `{ "query": "<URL de Google Maps>" }` y devuelve `{ "lat", "lon", "resolved_url" }`. Se consume **server-side** via el proxy `/api/v1/shortlink/` para evitar CORS.

## Comandos frecuentes

### Desarrollo

```bash
# Levantar servidor Django
python manage.py runserver --settings=config.prod

# Compilar JS del mapa admin (watch)
cd maps/src && npm run build:admin

# Compilar JS principal (watch)
cd main/src && npm run build

# Compilar CSS Tailwind (watch)
python manage.py tailwind start
```

### Producción (Docker)

```bash
# Collectstatic
docker exec -it pozosscz_app python manage.py collectstatic --settings=config.prod

# Migraciones
docker exec -it pozosscz_app python manage.py makemigrations --settings=config.prod
docker exec -it pozosscz_app python manage.py migrate --settings=config.prod
```

### Datos

```bash
# Exportar
python manage.py dumpdata clientes --indent 2 > cliente.json
python manage.py dumpdata main --indent 2 > main.json
python manage.py dumpdata pozosscz --indent 2 > pozosscz.json

# Importar en Docker
docker exec pozosscz_app python manage.py loaddata cliente.json
docker exec pozosscz_app python manage.py loaddata main.json
docker exec pozosscz_app python manage.py loaddata pozosscz.json
```

## Variables de entorno (`.env`)

Copiar `.env.sample` y completar:

```
SECRET_KEY=
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=pozosscz.com,www.pozosscz.com

POSTGRES_DB=
POSTGRES_USER=
POSTGRES_PASSWORD=
POSTGRES_HOST=

REDIS_URL=redis://redis:6379/0
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/0

CORS_ALLOWED_ORIGINS=https://pozosscz.com

EMAIL_HOST=
EMAIL_PORT=465
EMAIL_USE_SSL=True
EMAIL_HOST_USER=
EMAIL_HOST_PASSWORD=
DEFAULT_FROM_EMAIL=
```

## PWA

El manifest (`/static/favicon/site.webmanifest`) y el service worker solo están activos en `/mapa/`. El scope del PWA es `/mapa/`.

- `start_url`: `/mapa/`
- `scope`: `/mapa/`
- `share_target`: acepta links de Google Maps compartidos desde el móvil vía `?share_url=`

## Seguridad (producción)

- `/mapa/` requiere autenticación (`@login_required`)
- `/api/v1/shortlink/` requiere autenticación
- `SECURE_SSL_REDIRECT`, `HSTS`, `SESSION_COOKIE_SECURE`, `CSRF_COOKIE_SECURE` habilitados en `config/prod.py`
- `CORS_ALLOWED_ORIGINS` configurado vía variable de entorno

## Build de assets

Los archivos compilados se emiten a `/static/`:

| Source | Config | Output |
|---|---|---|
| `maps/src/index-maps-admin.ts` | `vite.config.maps-admin.js` | `static/maps/maps_admin.js` |
| `main/src/index-main.ts` | `vite.config.js` | `static/js/main.js` |
| TailwindCSS | `theme/static_src/` | `static/css/tailwind.css` |
