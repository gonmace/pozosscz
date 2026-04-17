from django.urls import include, path
from config.router_helper import SafeDefaultRouter
from pozosscz.views import (
    PreciosPozosSCZViewSet,
    AreasFactorViewSet,
    BaseCamionViewSet,
    CamionViewSet,
    RegistroCamionViewSet,
    CustomAuthToken,
    LogoutTokenView,
    AppVersionView,
    DispositivoFCMView,
    UbicacionCamionView,
    ConfigTrackingView,
    shortlink_proxy,
)
from . import views

router = SafeDefaultRouter()
router.register(r'basecamion', BaseCamionViewSet, 'basecamion')
router.register(r'precios', PreciosPozosSCZViewSet, 'precios')
router.register(r'areasfactor', AreasFactorViewSet, 'areasfactor')
router.register(r'camiones', CamionViewSet, 'camiones')
router.register(r'estados-camion', RegistroCamionViewSet, 'estados-camion')

urlpatterns = [
    path('api/v1/camiones/config/', ConfigTrackingView.as_view(), name='config_tracking'),
    path('api/v1/', include(router.urls)),
    path('api/v1/auth/token/', CustomAuthToken.as_view(), name='auth_token'),
    path('api/v1/auth/logout/', LogoutTokenView.as_view(), name='auth_logout'),
    path('api/v1/app-version/', AppVersionView.as_view(), name='app_version'),
    path('api/v1/shortlink/', shortlink_proxy, name='shortlink_proxy'),
    path('api/v1/dispositivo/registrar/', DispositivoFCMView.as_view(), name='dispositivo_registrar'),
    path('api/v1/ubicacion/camion/', UbicacionCamionView.as_view(), name='ubicacion_camion'),
]
