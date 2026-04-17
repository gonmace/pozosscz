from rest_framework import viewsets
from .models import (
    PreciosPozosSCZ,
    AreasFactor,
    BaseCamion,
)
from flota.models import Camion, RegistroCamion, DispositivoFCM
from django.core.exceptions import ObjectDoesNotExist
from .serializers import (
    PreciosPozosSCZSerializer,
    AreasFactorSerializer,
    BaseCamionSerializer,
    CamionSerializer,
    RegistroCamionSerializer,
    DispositivoFCMSerializer,
)
from django.http import Http404
from rest_framework.permissions import IsAuthenticated
from rest_framework.throttling import AnonRateThrottle, ScopedRateThrottle

from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth.models import User
from django.conf import settings

from django.http import HttpResponse, JsonResponse
from django.views.decorators.http import require_POST
from django.views.decorators.csrf import csrf_exempt
import urllib.request
import json


@csrf_exempt
@require_POST
def shortlink_proxy(request):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Autenticación requerida"}, status=401)
    try:
        body = json.loads(request.body)
        query = body.get("query", "")
        if not query:
            return JsonResponse({"error": "query requerida"}, status=400)

        payload = json.dumps({"query": query}).encode()
        req = urllib.request.Request(
            "https://ms.magoreal.com/shortlink",
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read())
        return JsonResponse(data)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


class PreciosPozosSCZViewSet(viewsets.ModelViewSet):
    queryset = PreciosPozosSCZ.objects.all()
    serializer_class = PreciosPozosSCZSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

class AreasFactorViewSet(viewsets.ModelViewSet):
    queryset = AreasFactor.objects.all()
    serializer_class = AreasFactorSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

class BaseCamionViewSet(viewsets.ModelViewSet):
    queryset = BaseCamion.objects.all()
    serializer_class = BaseCamionSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

class CamionViewSet(viewsets.ModelViewSet):
    queryset = Camion.objects.all()
    serializer_class = CamionSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None


class RegistroCamionViewSet(viewsets.ModelViewSet):
    serializer_class = RegistroCamionSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        qs = RegistroCamion.objects.select_related('camion')
        camion_id = self.request.query_params.get('camion')
        if camion_id:
            qs = qs.filter(camion_id=camion_id)
        return qs


class CustomAuthToken(ObtainAuthToken):
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'login'

    def post(self, request, *args, **kwargs):
        username = request.data.get('username')
        password = request.data.get('password')
        user = None

        # Respuesta genérica para no filtrar si el usuario existe
        invalid = Response({'error': 'Invalid username or password'}, status=400)

        if username and password:
            try:
                user = User.objects.get(username=username)
            except User.DoesNotExist:
                return invalid

            if user.check_password(password):
                token, created = Token.objects.get_or_create(user=user)
                perfil = getattr(user, 'perfil', None)
                rol = perfil.rol if perfil else 'OPR'
                return Response({
                    'token': token.key,
                    'user_id': user.pk,
                    'username': user.username,
                    'rol': rol,
                })
            return invalid

        return Response({'error': 'Username and password required'}, status=400)


class LogoutTokenView(APIView):
    """Revoca el token DRF del usuario autenticado (login logout desde la app)."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        Token.objects.filter(user=request.user).delete()
        return Response({'ok': True})


class AppVersionView(APIView):
    """Devuelve la versión mínima requerida de la app Android.

    La app debería llamar a este endpoint al iniciar y forzar upgrade si
    su versión < `min_version`. No rechaza peticiones — solo informa —
    para no romper despliegues en curso.
    """
    permission_classes = []  # público

    def get(self, request):
        return Response({
            'min_version': getattr(settings, 'APP_MIN_VERSION', '1.0.0'),
            'latest_version': getattr(settings, 'APP_LATEST_VERSION', '1.0.0'),
            'force_upgrade': getattr(settings, 'APP_FORCE_UPGRADE', False),
        })


def hello_world(request):
    return HttpResponse("Pozos SCZ!!!")


class DispositivoFCMView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """Registra o actualiza el token FCM del dispositivo del usuario autenticado."""
        token = request.data.get('fcm_token', '').strip()
        if not token:
            return Response({'error': 'fcm_token requerido'}, status=400)

        # Desactivar cualquier otro token de este mismo dispositivo (otro usuario previo)
        DispositivoFCM.objects.filter(fcm_token=token).exclude(
            usuario=request.user
        ).update(activo=False)

        # Registrar o actualizar el token para el usuario actual
        DispositivoFCM.objects.update_or_create(
            fcm_token=token,
            defaults={'usuario': request.user, 'activo': True},
        )
        return Response({'ok': True})


class ConfigTrackingView(APIView):
    """Devuelve la configuración de tracking para el camión del usuario autenticado."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            camion = request.user.camion
        except Camion.DoesNotExist:
            return Response({'error': 'Usuario no tiene camión asignado'}, status=400)
        return Response({
            'tracking_activo': camion.tracking_activo,
            'intervalo_tracking': max(10, camion.intervalo_tracking),
        })

    def post(self, request):
        """El teléfono cambia su propio estado de tracking."""
        try:
            camion = request.user.camion
        except Camion.DoesNotExist:
            return Response({'error': 'Usuario no tiene camión asignado'}, status=400)

        tracking_activo = request.data.get('tracking_activo')
        if tracking_activo is None or not isinstance(tracking_activo, bool):
            return Response({'error': 'Campo tracking_activo (bool) requerido'}, status=400)

        camion.tracking_activo = tracking_activo
        camion.save(update_fields=['tracking_activo'])
        return Response({
            'tracking_activo': camion.tracking_activo,
            'intervalo_tracking': max(10, camion.intervalo_tracking),
        })


class UbicacionCamionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """Recibe lat/lon del chofer y crea un EstadoCamion."""
        from django.utils import timezone
        from datetime import timedelta

        try:
            camion = request.user.camion
        except Camion.DoesNotExist:
            return Response({'error': 'Usuario no tiene camión asignado'}, status=400)

        lat = request.data.get('lat')
        lon = request.data.get('lon')
        if lat is None or lon is None:
            return Response({'error': 'lat y lon requeridos'}, status=400)

        velocidad = request.data.get('velocidad', 0)
        direccion = request.data.get('direccion', 0)
        activo = request.data.get("activo", True)
        if isinstance(activo, str):
            activo = activo.lower() != "false"
        comentario = (request.data.get("comentario") or "").strip()

        # Deduplicar: ignorar si ya llegó una ubicación del mismo camión en los últimos 5 segundos
        # Excepciones: comentario no vacío, o activo=False (marcar inactivo siempre pasa)
        if activo and not comentario:
            hace_5s = timezone.now() - timedelta(seconds=5)
            if RegistroCamion.objects.filter(camion=camion, registrado_at__gte=hace_5s).exists():
                return Response({'ok': True, 'duplicado': True})

        RegistroCamion.objects.create(
            camion=camion,
            activo=activo,
            lat=lat,
            lon=lon,
            velocidad=round(float(velocidad), 1),
            direccion=round(float(direccion), 1),
            comentario=comentario,
        )
        return Response({'ok': True})
