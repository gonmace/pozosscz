from rest_framework import serializers
from .models import Cliente


class ClienteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cliente
        fields = ('id', 'tel1', 'tel2', 'name', 'address', 'cod', 'cost', 'service', 'lat', 'lon', 'status', 'user', 'created_at')
