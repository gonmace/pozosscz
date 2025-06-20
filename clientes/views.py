from rest_framework import viewsets
from .models import Cliente
from .serializers import ClienteSerializer
from rest_framework.permissions import AllowAny


class ClienteViewSet(viewsets.ModelViewSet):
    queryset = Cliente.objects.all().order_by('-created_at')
    serializer_class = ClienteSerializer
    permission_classes = [AllowAny]
