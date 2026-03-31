from rest_framework import serializers
from .models import PreciosPozosSCZ, AreasFactor, BaseCamion


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
