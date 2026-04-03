from rest_framework import viewsets
from .models import (
    PreciosPozosSCZ,
    AreasFactor,
    BaseCamion
)
from .serializers import (
    PreciosPozosSCZSerializer,
    AreasFactorSerializer,
    BaseCamionSerializer
)
from django.http import Http404
from rest_framework.permissions import IsAuthenticated
from rest_framework.throttling import AnonRateThrottle

from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token
from rest_framework.response import Response
from django.contrib.auth.models import User

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

class CustomAuthToken(ObtainAuthToken):
    throttle_classes = [AnonRateThrottle]

    def post(self, request, *args, **kwargs):
        username = request.data.get('username')
        password = request.data.get('password')
        user = None

        if username and password:
            try:
                user = User.objects.get(username=username)
            except User.DoesNotExist:
                return Response(
                    {'error': 'Invalid username or password'},
                    status=400)

            if user.check_password(password):
                token, created = Token.objects.get_or_create(user=user)
                return Response({
                    'token': token.key,
                    'user_id': user.pk,
                    'username': user.username
                })
            else:
                return Response(
                    {'error': 'Invalid username or password'},
                    status=400)

        return Response(
            {'error': 'Username and password required'},
            status=400)


def hello_world(request):
    return HttpResponse("Pozos SCZ!!!")
