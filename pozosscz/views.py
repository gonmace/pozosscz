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
from rest_framework.permissions import AllowAny, IsAuthenticated

from rest_framework.authtoken.views import ObtainAuthToken
from rest_framework.authtoken.models import Token
from rest_framework.response import Response
from django.contrib.auth.models import User

from django.http import HttpResponse


class PreciosPozosSCZViewSet(viewsets.ModelViewSet):
    queryset = PreciosPozosSCZ.objects.all()
    serializer_class = PreciosPozosSCZSerializer
    permission_classes = [AllowAny]

class AreasFactorViewSet(viewsets.ModelViewSet):
    queryset = AreasFactor.objects.all()
    serializer_class = AreasFactorSerializer
    permission_classes = [AllowAny]

class BaseCamionViewSet(viewsets.ModelViewSet):
    queryset = BaseCamion.objects.all()
    serializer_class = BaseCamionSerializer
    permission_classes = [AllowAny]

class CustomAuthToken(ObtainAuthToken):
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
