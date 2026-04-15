#!/bin/sh
set -e

# Espera a que el PostgreSQL del host esté disponible
while ! nc -z host.docker.internal 5432; do
  echo "Esperando a que PostgreSQL arranque..."
  sleep 1
done
echo "PostgreSQL está listo"

# Gunicorn con worker-class gthread:
#   - sync worker = 1 request por worker y timeout por request → el SSE
#     (/maps/api/camiones-sse/) bloquea el único worker y lo mata al expirar.
#   - gthread = 1 thread por request dentro de cada worker. Los SSE ya no
#     bloquean otros pedidos y el timeout es solo para heartbeat al master.
#
# Parámetros configurables por .env (con defaults razonables).
exec gunicorn config.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers "${GUNICORN_WORKERS:-3}" \
    --worker-class gthread \
    --threads "${GUNICORN_THREADS:-8}" \
    --timeout "${GUNICORN_TIMEOUT:-60}" \
    --graceful-timeout 30 \
    --keep-alive 5 \
    --access-logfile - \
    --error-logfile -
