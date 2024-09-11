from rest_framework import serializers
from .models import Banner, PreciosPozosSCZ, AreasFactor


class PreciosPozosSCZSerializer(serializers.ModelSerializer):
    class Meta:
        model = PreciosPozosSCZ
        fields = '__all__'


class BannerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Banner
        fields = '__all__'


class AreasFactorSerializer(serializers.ModelSerializer):
    class Meta:
        model = AreasFactor
        fields = '__all__'

# class AlcanceSerializer(serializers.ModelSerializer):
#     svg_content = serializers.SerializerMethodField()

#     class Meta:
#         model = Alcance
#         # fields = '__all__'
#         fields = ['title', 'description', 'display', 'svg_content']

#     def get_svg_content(self, obj):
#         try:
#             with open(obj.svg.path, 'r', encoding='utf-8') as svg_file:
#                 return svg_file.read()
#         except Exception as e:
#             return None

# class AQuienSerializer(serializers.ModelSerializer):
#     svg_content = serializers.SerializerMethodField()

#     class Meta:
#         model = AQuien
#         fields = ['title', 'svg_content']

#     def get_svg_content(self, obj):
#         try:
#             with open(obj.svg.path, 'r', encoding='utf-8') as svg_file:
#                 return svg_file.read()
#         except Exception as e:
#             return None
