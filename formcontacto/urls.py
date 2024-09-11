# urls.py
from django.urls import path
from .views import FormularioAPIView

urlpatterns = [
    path('', FormularioAPIView.as_view(), name='formulario-api'),
]
