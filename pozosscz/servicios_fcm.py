import os
import logging

logger = logging.getLogger(__name__)

# Firebase Admin SDK — se inicializa solo si existe la service account key.
# Colocar el archivo en la raíz del proyecto Django como 'firebase-service-account.json'
# o definir la variable de entorno FIREBASE_SERVICE_ACCOUNT_PATH.

_firebase_inicializado = False


def _inicializar():
    global _firebase_inicializado
    if _firebase_inicializado:
        return True
    try:
        import firebase_admin
        from firebase_admin import credentials

        ruta = os.environ.get(
            'FIREBASE_SERVICE_ACCOUNT_PATH',
            os.path.join(os.path.dirname(__file__), '..', 'firebase-service-account.json'),
        )
        ruta = os.path.abspath(ruta)

        if not os.path.exists(ruta):
            logger.warning(
                '[FCM] No se encontró firebase-service-account.json en %s. '
                'Las notificaciones push no funcionarán hasta configurarlo.',
                ruta,
            )
            return False

        if not firebase_admin._apps:
            cred = credentials.Certificate(ruta)
            firebase_admin.initialize_app(cred)

        _firebase_inicializado = True
        return True
    except ImportError:
        logger.warning('[FCM] firebase-admin no está instalado. Ejecutar: pip install firebase-admin')
        return False
    except Exception as e:
        logger.error('[FCM] Error inicializando Firebase Admin: %s', e)
        return False


def enviar_solicitud_ubicacion(usuario_id):
    """Envía un data message FCM al dispositivo del usuario pidiendo su ubicación."""
    if not _inicializar():
        return False

    from firebase_admin import messaging
    from flota.models import DispositivoFCM

    tokens = list(
        DispositivoFCM.objects.filter(usuario_id=usuario_id, activo=True)
        .values_list('fcm_token', flat=True)
    )
    if not tokens:
        logger.info('[FCM] Usuario %s no tiene dispositivos registrados.', usuario_id)
        return False

    return _enviar_a_tokens(tokens)


def enviar_solicitud_a_todos():
    """Envía solicitud de ubicación a todos los dispositivos activos."""
    if not _inicializar():
        return False

    from flota.models import DispositivoFCM

    tokens = list(
        DispositivoFCM.objects.filter(activo=True).values_list('fcm_token', flat=True)
    )
    if not tokens:
        logger.info('[FCM] No hay dispositivos activos registrados.')
        return False

    return _enviar_a_tokens(tokens)


def enviar_config_tracking(usuario_id, tracking_activo: bool, intervalo: int):
    """Envía la configuración de tracking actualizada al dispositivo del usuario."""
    if not _inicializar():
        return False

    from firebase_admin import messaging
    from flota.models import DispositivoFCM

    tokens = list(
        DispositivoFCM.objects.filter(usuario_id=usuario_id, activo=True)
        .values_list('fcm_token', flat=True)
    )
    if not tokens:
        logger.info('[FCM] Usuario %s no tiene dispositivos registrados.', usuario_id)
        return False

    mensaje = messaging.MulticastMessage(
        data={
            'tipo': 'actualizar_config',
            'tracking_activo': 'true' if tracking_activo else 'false',
            'intervalo_tracking': str(max(10, intervalo)),
        },
        android=messaging.AndroidConfig(priority='high'),
        tokens=tokens,
    )
    try:
        respuesta = messaging.send_each_for_multicast(mensaje)
        ok = _procesar_respuesta_multicast(respuesta, tokens, contexto=f'config_tracking uid={usuario_id}')
        return ok > 0
    except Exception as e:
        logger.exception('[FCM] Error enviando config: %s', e)
        return False


# Códigos de error FCM que implican token inválido y deben desactivarse.
_FCM_TOKEN_INVALIDO = {
    'registration-token-not-registered',
    'invalid-registration-token',
    'invalid-argument',
    'mismatched-credential',
    'not-found',
}
# Códigos que son transitorios (ignorar — no desactivar).
_FCM_TRANSITORIO = {
    'unavailable',
    'internal',
    'quota-exceeded',
    'deadline-exceeded',
    'aborted',
    'resource-exhausted',
}


def _procesar_respuesta_multicast(respuesta, tokens, contexto=''):
    """Desactiva tokens inválidos y registra errores. Devuelve success_count."""
    from flota.models import DispositivoFCM

    desactivados = 0
    transitorios = 0
    otros = 0
    for i, resultado in enumerate(respuesta.responses):
        if resultado.success:
            continue
        token = tokens[i]
        error_code = ''
        if resultado.exception is not None:
            error_code = getattr(resultado.exception, 'code', '') or ''
        if error_code in _FCM_TOKEN_INVALIDO:
            DispositivoFCM.objects.filter(fcm_token=token).update(activo=False)
            desactivados += 1
            logger.info('[FCM] Token desactivado (%s): %s…', error_code, token[:20])
        elif error_code in _FCM_TRANSITORIO:
            transitorios += 1
            logger.warning('[FCM] Error transitorio (%s) en token %s…', error_code, token[:20])
        else:
            otros += 1
            logger.error('[FCM] Error desconocido (%s) en token %s…: %s', error_code, token[:20], resultado.exception)

    if desactivados or transitorios or otros:
        logger.info(
            '[FCM%s] tokens=%d éxito=%d desactivados=%d transitorios=%d otros=%d',
            f' {contexto}' if contexto else '',
            len(tokens), respuesta.success_count, desactivados, transitorios, otros,
        )
    return respuesta.success_count


def _enviar_a_tokens(tokens):
    from firebase_admin import messaging

    mensaje = messaging.MulticastMessage(
        data={'tipo': 'solicitar_ubicacion'},
        android=messaging.AndroidConfig(priority='high'),
        tokens=tokens,
    )
    try:
        respuesta = messaging.send_each_for_multicast(mensaje)
        logger.info(
            '[FCM] Enviado a %d tokens — %d éxito, %d fallo.',
            len(tokens), respuesta.success_count, respuesta.failure_count,
        )
        ok = _procesar_respuesta_multicast(respuesta, tokens, contexto='solicitar_ubicacion')
        return ok > 0
    except Exception as e:
        logger.exception('[FCM] Error enviando mensajes: %s', e)
        return False


def enviar_asignacion_cliente(usuario_id, nombre_cliente='', direccion=''):
    """Envía notificación con sonido y vibración al chofer cuando se le asigna un cliente PRG."""
    if not _inicializar():
        return False

    from firebase_admin import messaging
    from flota.models import DispositivoFCM

    tokens = list(
        DispositivoFCM.objects.filter(usuario_id=usuario_id, activo=True)
        .values_list('fcm_token', flat=True)
    )
    if not tokens:
        logger.info('[FCM] Usuario %s no tiene dispositivos registrados.', usuario_id)
        return False

    body = direccion.strip() if direccion.strip() else 'Nuevo servicio programado'
    mensaje = messaging.MulticastMessage(
        notification=messaging.Notification(
            title=f'🚛 Servicio asignado: {nombre_cliente or "Cliente"}',
            body=body,
        ),
        android=messaging.AndroidConfig(
            priority='high',
            notification=messaging.AndroidNotification(
                default_sound=True,
                default_vibrate_timings=True,
                priority='max',
            ),
        ),
        data={'tipo': 'asignacion_cliente'},
        tokens=tokens,
    )
    try:
        respuesta = messaging.send_each_for_multicast(mensaje)
        ok = _procesar_respuesta_multicast(respuesta, tokens, contexto=f'asignacion uid={usuario_id}')
        return ok > 0
    except Exception as e:
        logger.exception('[FCM] Error enviando asignacion: %s', e)
        return False


def enviar_actualizacion_proyectos(usuario_id=None):
    """Notifica que la lista de proyectos cambió.

    Si se pasa usuario_id, solo notifica a los dispositivos de ese usuario (chofer asignado).
    Si no, notifica a todos los dispositivos activos (comportamiento anterior).
    """
    if not _inicializar():
        return False

    from firebase_admin import messaging
    from flota.models import DispositivoFCM

    qs = DispositivoFCM.objects.filter(activo=True)
    if usuario_id is not None:
        qs = qs.filter(usuario_id=usuario_id)

    tokens = list(qs.values_list('fcm_token', flat=True))
    if not tokens:
        logger.info('[FCM] No hay dispositivos activos para notificar.')
        return False

    mensaje = messaging.MulticastMessage(
        data={'tipo': 'actualizar_proyectos'},
        android=messaging.AndroidConfig(priority='high'),
        tokens=tokens,
    )
    try:
        respuesta = messaging.send_each_for_multicast(mensaje)
        ok = _procesar_respuesta_multicast(respuesta, tokens, contexto='actualizar_proyectos')
        return ok > 0
    except Exception as e:
        logger.exception('[FCM] Error enviando actualizacion proyectos: %s', e)
        return False
