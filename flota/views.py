import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from pozosscz.servicios_fcm import enviar_solicitud_ubicacion, enviar_solicitud_a_todos
from flota.models import DispositivoFCM, Camion, EventoCamion, TIPO_EVENTO_CHOICES

logger = logging.getLogger(__name__)


class SolicitarUbicacionView(APIView):
    """Envía una solicitud de ubicación silenciosa (FCM) a uno o varios choferes.

    Solo admins: un chofer no debe poder forzar la posición de otro chofer.
    """
    permission_classes = [IsAuthenticated, IsAdminUser]

    def post(self, request):
        usuario_ids = request.data.get('usuario_ids', [])

        if not usuario_ids:
            return Response({'error': 'usuario_ids requerido'}, status=400)

        resultados = {}
        for uid in usuario_ids:
            try:
                uid = int(uid)
                ok = enviar_solicitud_ubicacion(uid)
                resultados[uid] = ok
            except (ValueError, TypeError):
                resultados[uid] = False

        exitos = sum(1 for v in resultados.values() if v)
        return Response({
            'ok': exitos > 0,
            'enviados': exitos,
            'total': len(usuario_ids),
            'resultados': resultados,
        })


class SolicitarTodosView(APIView):
    """Envía solicitud de ubicación a todos los dispositivos FCM activos. Solo admins."""
    permission_classes = [IsAuthenticated, IsAdminUser]

    def post(self, request):
        ok = enviar_solicitud_a_todos()
        return Response({'ok': ok})


class EventoCamionView(APIView):
    """Recibe un evento discreto del teléfono del chofer (cambio de estado, tanque, diesel)."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            camion = request.user.camion
        except Exception:
            return Response({'error': 'Usuario no tiene camión asignado'}, status=400)

        tipo = request.data.get('tipo')
        lat = request.data.get('lat')
        lon = request.data.get('lon')

        if not tipo or lat is None or lon is None:
            return Response({'error': 'tipo, lat y lon requeridos'}, status=400)

        tipos_validos = {code for code, _ in TIPO_EVENTO_CHOICES}
        if tipo not in tipos_validos:
            return Response({'error': f'tipo inválido: {tipo}'}, status=400)

        cliente = None
        if tipo in ('SRV_EJE', 'SRV_CAN'):
            cliente_id = request.data.get('cliente_id')
            if not cliente_id:
                return Response({'error': f'cliente_id requerido para {tipo}'}, status=400)
            from clientes.models import Cliente
            try:
                cliente = Cliente.objects.get(pk=cliente_id, camion=camion)
            except Cliente.DoesNotExist:
                return Response({'error': 'cliente_id inválido o no asignado a este camión'}, status=400)

        evento = EventoCamion.objects.create(
            camion=camion,
            cliente=cliente,
            tipo=tipo,
            lat=float(lat),
            lon=float(lon),
            comentario=(request.data.get('comentario') or '').strip(),
            nivel_tanque=request.data.get('nivel_tanque'),
            monto=request.data.get('monto'),
        )

        # Sincronizar tracking_activo en el modelo Camion cuando el chofer
        # activa o desactiva el toggle desde su teléfono.
        if tipo in ('TRK_ACT', 'TRK_DES'):
            nuevo_activo = tipo == 'TRK_ACT'
            Camion.objects.filter(pk=camion.pk).update(tracking_activo=nuevo_activo)
            from django.core.cache import cache
            try:
                cache.incr('camiones_version')
            except ValueError:
                cache.set('camiones_version', 1, timeout=None)

        if tipo in ('SRV_EJE', 'SRV_CAN') and cliente:
            nuevo_status = 'EJE' if tipo == 'SRV_EJE' else 'CAN'
            from clientes.models import Cliente as ClienteModel
            ClienteModel.objects.filter(pk=cliente.pk).update(
                status=nuevo_status,
                motivo_cancelado=evento.comentario,
            )
            # Notificar al chofer (y admin) que la lista cambió
            import threading
            from pozosscz.servicios_fcm import enviar_actualizacion_proyectos
            threading.Thread(
                target=enviar_actualizacion_proyectos,
                kwargs={'usuario_id': camion.usuario_id},
                daemon=True,
            ).start()

        return Response({'ok': True, 'evento_id': evento.pk})


class ConfigTrackingView(APIView):
    """Consulta o actualiza la configuración de tracking del camión autenticado."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            camion = request.user.camion
        except Exception:
            return Response({'error': 'Usuario no tiene camión asignado'}, status=400)
        return Response({
            'tracking_activo': camion.tracking_activo,
            'intervalo_tracking': camion.intervalo_tracking,
        })

    def post(self, request):
        try:
            camion = request.user.camion
        except Exception:
            return Response({'error': 'Usuario no tiene camión asignado'}, status=400)

        tracking_activo = request.data.get('tracking_activo')
        if tracking_activo is None:
            return Response({'error': 'tracking_activo requerido'}, status=400)

        Camion.objects.filter(pk=camion.pk).update(tracking_activo=bool(tracking_activo))
        camion.refresh_from_db()

        from django.core.cache import cache
        try:
            cache.incr(f'tracking_v_{camion.pk}')
        except ValueError:
            cache.set(f'tracking_v_{camion.pk}', 1, timeout=None)

        return Response({
            'tracking_activo': camion.tracking_activo,
            'intervalo_tracking': camion.intervalo_tracking,
        })


class ChoferesConetatadosView(APIView):
    """Lista los choferes con dispositivo FCM activo registrado."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        ids_con_dispositivo = set(
            DispositivoFCM.objects.filter(activo=True).values_list('usuario_id', flat=True)
        )
        camiones = Camion.objects.select_related('usuario').filter(usuario__isnull=False)
        data = [
            {
                'usuario_id': c.usuario.id,
                'operador': c.operador,
                'tiene_dispositivo': c.usuario.id in ids_con_dispositivo,
            }
            for c in camiones
        ]
        return Response(data)
