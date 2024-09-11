from django.urls import include, path
from rest_framework import routers
from clientes.views import ClienteViewSet

router = routers.DefaultRouter()

router.register(r'clientes', ClienteViewSet, 'clientes')

urlpatterns = [
    path('api/v1/', include(router.urls)),
]
