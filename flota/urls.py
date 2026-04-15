from django.urls import path
from .views import SolicitarUbicacionView, ChoferesConetatadosView, SolicitarTodosView, EventoCamionView

app_name = 'flota'

urlpatterns = [
    path('api/v1/moviles/solicitar-ubicacion/', SolicitarUbicacionView.as_view(), name='solicitar_ubicacion'),
    path('api/v1/moviles/solicitar-todos/', SolicitarTodosView.as_view(), name='solicitar_todos'),
    path('api/v1/moviles/choferes/', ChoferesConetatadosView.as_view(), name='choferes_conectados'),
    path('api/v1/moviles/evento/', EventoCamionView.as_view(), name='evento_camion'),
]
