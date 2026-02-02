from django.urls import include, path
from config.router_helper import SafeDefaultRouter
from clientes.views import ClienteViewSet

router = SafeDefaultRouter()

router.register(r'clientes', ClienteViewSet, 'clientes')

urlpatterns = [
    path('api/v1/', include(router.urls)),
]
