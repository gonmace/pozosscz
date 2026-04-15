from rest_framework import serializers
from .models import Cliente
from flota.models import Camion


class ClienteSerializer(serializers.ModelSerializer):
    camion = serializers.PrimaryKeyRelatedField(
        queryset=Camion.objects.all(), allow_null=True, required=False
    )
    camion_iniciales = serializers.SerializerMethodField()
    camion_nombre = serializers.SerializerMethodField()

    class Meta:
        model = Cliente
        fields = (
            'id', 'tel1', 'tel2', 'name', 'address', 'cod', 'cost', 'precio_cotizado',
            'service', 'lat', 'lon', 'status', 'motivo_cancelado', 'user',
            'created_at', 'updated_at', 'activo', 'hora_programada', 'orden',
            'camion', 'camion_iniciales', 'camion_nombre',
        )

    def get_camion_iniciales(self, obj):
        if obj.camion and obj.camion.operador:
            chofer = obj.camion.operador.strip()[0].upper()
            camion = obj.camion.marca.strip()[0].upper() if obj.camion.marca else ""
            return f"{chofer}-{camion}" if camion else chofer
        return ""

    def get_camion_nombre(self, obj):
        if obj.camion and obj.camion.operador:
            return obj.camion.operador
        return ""
