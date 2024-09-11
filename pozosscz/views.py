from rest_framework import viewsets
from .models import (
    # Alcance,
    Banner,
    # AQuien,
    PreciosPozosSCZ,
    AreasFactor,
    # DatosGenerales
)
from .serializers import (
    PreciosPozosSCZSerializer,
    # AlcanceSerializer,
    BannerSerializer,
    # AQuienSerializer,
    AreasFactorSerializer,
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

# class AQuienViewSet(viewsets.ModelViewSet):
#     queryset = AQuien.objects.filter(display=True)
#     serializer_class = AlcanceSerializer


class BannerViewSet(viewsets.ModelViewSet):
    serializer_class = BannerSerializer

    def get_queryset(self):
        queryset = (
            Banner.objects
            .filter(displayBanner=True)
            .order_by('id')
            .first()
        )
        if queryset is None:
            raise Http404("No Banner found with displayBanner=True")
        return [queryset]  # Retorna una lista con el único objeto encontrado

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            # Ejemplo de métodos irrestrictos
            return [AllowAny()]
        return [IsAuthenticated()]

# class AlcanceViewSet(viewsets.ModelViewSet):
#     queryset = Alcance.objects.filter(display=True)
#     serializer_class = AlcanceSerializer


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
