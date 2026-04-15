from rest_framework import serializers
from .models import PreciosPozosSCZ, AreasFactor, BaseCamion
from flota.models import Camion, RegistroCamion, DispositivoFCM


class PreciosPozosSCZSerializer(serializers.ModelSerializer):
    class Meta:
        model = PreciosPozosSCZ
        fields = ('id', 'precio_diesel', 'consumo_diesel_hr', 'consumo_diesel_km',
                  'tiempo_trabajo', 'personal_camion', 'factor_tiempo',
                  'costo_saguapac_planta', 'costo_mantenimiento', 'utilidad_km',
                  'utilidad_base', 'costo_adicional_km_retorno',
                  'distancia_maxima_cotizar', 'factor_global')

class AreasFactorSerializer(serializers.ModelSerializer):
    class Meta:
        model = AreasFactor
        fields = ('id', 'name', 'factor', 'polygon', 'is_main', 'my_order')

class BaseCamionSerializer(serializers.ModelSerializer):
    class Meta:
        model = BaseCamion
        fields = ('id', 'name', 'coordinates', 'available', 'deleted')


class CamionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Camion
        fields = ('id', 'operador', 'marca', 'capacidad', 'created_at')


class RegistroCamionSerializer(serializers.ModelSerializer):
    class Meta:
        model = RegistroCamion
        fields = ('id', 'camion', 'activo', 'lat', 'lon', 'velocidad', 'direccion', 'comentario', 'registrado_at')
        read_only_fields = ('registrado_at',)


class DispositivoFCMSerializer(serializers.ModelSerializer):
    class Meta:
        model = DispositivoFCM
        fields = ('fcm_token',)
