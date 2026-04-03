from django.urls import include, path
from config.router_helper import SafeDefaultRouter
from pozosscz.views import (
    PreciosPozosSCZViewSet,
    AreasFactorViewSet,
    BaseCamionViewSet,
    shortlink_proxy,
)
from . import views

router = SafeDefaultRouter()
router.register(r'basecamion', BaseCamionViewSet, 'basecamion')
router.register(r'precios', PreciosPozosSCZViewSet, 'precios')
router.register(r'areasfactor', AreasFactorViewSet, 'areasfactor')

urlpatterns = [
    path('api/v1/', include(router.urls)),
    path('api/v1/shortlink/', shortlink_proxy, name='shortlink_proxy'),
]
