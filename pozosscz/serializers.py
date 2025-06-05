from rest_framework import serializers
from .models import PreciosPozosSCZ, AreasFactor, BaseCamion


class PreciosPozosSCZSerializer(serializers.ModelSerializer):
    class Meta:
        model = PreciosPozosSCZ
        fields = '__all__'

class AreasFactorSerializer(serializers.ModelSerializer):
    class Meta:
        model = AreasFactor
        fields = '__all__'

class BaseCamionSerializer(serializers.ModelSerializer):
    class Meta:
        model = BaseCamion
        fields = '__all__'
