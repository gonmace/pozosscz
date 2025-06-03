from django.urls import path
from . import views

urlpatterns = [
    path('cotiza/', views.cotiza, name='cotiza'),
    path('api/v1/contratar/', views.ContratarAPIView.as_view(), name='contratar-api'),
    path('mapa/', views.mapa, name='mapa'),
]
