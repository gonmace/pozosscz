# secrets/

Directorio montado como **read-only** en el contenedor Django en
`/app/secrets/` (ver `docker-compose.yml`).

Ningún archivo de esta carpeta va al repo (`.gitignore`).

## Contenido esperado

- `firebase-service-account.json` — Service Account de Firebase usado por
  `pozosscz/servicios_fcm.py` para enviar notificaciones FCM.
  Referenciado desde `.env` via:

      FIREBASE_SERVICE_ACCOUNT_PATH=/app/secrets/firebase-service-account.json

## Después de clonar el repo

```bash
mkdir -p secrets
# copiar el JSON obtenido desde Firebase Console > Cuentas de servicio
cp /ruta/al/firebase-service-account.json secrets/
chmod 644 secrets/firebase-service-account.json
```

Sin este archivo el sitio funciona igual; solo las notificaciones push
quedan deshabilitadas (el código loggea un warning y continúa).
