# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Django
```bash
# Dev server
python manage.py runserver --settings=config.dev

# Migrations
python manage.py makemigrations --settings=config.dev
python manage.py migrate --settings=config.dev

# Tailwind CSS (watch)
python manage.py tailwind start
```

### Frontend builds (all run in `--watch` mode)
```bash
# Public quotation map → /static/maps/maps.js
cd maps/src && npm run build

# Admin map → /static/maps/maps_admin.js
cd maps/src && npm run build:admin

# Main JS (animations, WhatsApp bubble) → /static/js/main.js
cd main/src && npm run build
```

### Docker (production)
```bash
docker compose up -d --build

# Run manage.py commands in container
docker exec -it pozosscz_app python manage.py <cmd> --settings=config.prod
```

---

## Architecture

### Django apps

| App | Responsibility |
|---|---|
| `main` | Public pages, SEO, landing, contact form |
| `maps` | Map views, quotation API, zone management |
| `pozosscz` | Pricing engine config, truck bases, user profiles, auth token |
| `clientes` | Client/order CRUD |
| `flota` | Truck fleet, driver location tracking, FCM push |

Config lives in `config/` — `base.py` (shared), `dev.py`, `prod.py`. `manage.py` defaults to `config.dev`.

### URL routing

`config/urls.py` includes each app's `urls.py`. Key endpoints:

- `/cotiza/` — public quotation map
- `/mapa/` — admin map (login required)
- `/api/v1/contratar/` — quotation calculation, **bases only** (public)
- `/api/v1/contratar-admin/` — quotation calculation, **bases + active trucks** (login required)
- `/maps/api/camiones-activos/` — current truck positions + day history
- `/maps/api/camiones-sse/` — SSE stream for real-time truck updates
- `/maps/api/clientes-jornada/` — active clients for the day
- `/api/v1/clientes/` — client CRUD (DRF)
- `/api/v1/precios/`, `/api/v1/areasfactor/`, `/api/v1/basecamion/` — pricing config CRUD
- `/api/v1/auth/token/` — DRF token auth (used by driver Android app)
- `/api/v1/ubicacion/camion/` — driver posts GPS position

### Frontend

Two independent Vite/TypeScript projects:

**`maps/src/`** — Leaflet maps
- `index-maps.ts` → public `/cotiza/` page
- `index-maps-admin.ts` → admin `/mapa/` page
- `utils/cotizando.ts` — calls quotation API; accepts optional `url` param (default `/api/v1/contratar/`, admin passes `/api/v1/contratar-admin/`)
- `utils/getClients.ts` — fetches and renders client markers with editable popups (status, price, comment, truck assignment)
- `utils/camiones.ts` — cached truck list from `/api/v1/camiones/`

**`main/src/`** — anime.js animations + WhatsApp bubble

Built JS is committed to `/static/maps/` and `/static/js/` (Django `collectstatic` serves them).

### Quotation pricing logic (`maps/views.py → ContratarAPIView`)

1. Find applicable `AreasFactor` zones (polygon containment, ray-casting)
2. Check waypoints (Urubo / Torno polygons force specific route waypoints)
3. Call OSRM for route distances/times from each `BaseCamion` to the client
4. Pick shortest route; also calculate return route to Saguapac base
5. Apply truck speed factor (`factor_tiempo`) and loaded-truck factor (`factor_cargado`)
6. Calculate: diesel cost → maintenance → Saguapac treatment → utility margin → zone factor → global factor → driver share
7. `ContratarAdminAPIView` inherits this and overrides `get_bases()` to append active trucks with tank < 100%

### Key models

- `PreciosPozosSCZ` — singleton with all pricing parameters (diesel price, consumption rates, utility margins, time minimums)
- `BaseCamion` — fixed service bases with coordinates and availability flag
- `AreasFactor` — zone polygons with pricing multiplier factors
- `Cliente` — statuses: `COT` quoted, `PRG` scheduled, `EJE` executed, `CAN` canceled, `NEG` blacklist; FK to `Camion`
- `Camion` — truck with operator, FK to User (driver); signals auto-update position when `RegistroCamion` is saved
- `RegistroCamion` — GPS history (lat/lon, speed, direction, tank level 0.0–1.0, diesel Bs)
- `DispositivoFCM` — FCM token per user for push notifications

### Static files & templates

- Templates: `templates/` (base layout), `main/templates/`, `maps/templates/`, `flota/templates/`
- Static built assets live in `static/` and are served via Nginx in production
- Tailwind is managed by `django-tailwind` from `theme/static_src/`

### External integrations

- **OSRM** — self-hosted routing engine for distance/time calculations
- **Firebase Admin SDK** — FCM push notifications to drivers (`pozosscz/servicios_fcm.py`)
- **`ms.magoreal.com/shortlink`** — internal microservice to resolve Google Maps short URLs to coordinates (proxied via `/api/v1/shortlink/`)
