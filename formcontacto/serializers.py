# serializers.py
from rest_framework import serializers
from .models import Formulario


class FormularioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Formulario
        fields = ['nombre', 'telefono', 'mensaje']
