from django.urls import path
from . import views
from django.contrib.sitemaps.views import sitemap
from .views import StaticViewSitemap, ZonaSitemap

sitemaps = {
    'static': StaticViewSitemap,
    'zonas': ZonaSitemap,
}
urlpatterns = [
    path('', views.home_page, name='home_page'),
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('calcula/', views.calcula, name='calcula'),
    path('contact/', views.contact, name='contact'),
    # Páginas de servicio
    path('limpieza-pozo-ciego-santa-cruz/', views.servicio_pozo_ciego, name='servicio_pozo_ciego'),
    path('limpieza-pozos-septicos-santa-cruz/', views.servicio_pozos_septicos, name='servicio_pozos_septicos'),
    path('limpieza-camaras-septicas/', views.servicio_camaras_septicas, name='servicio_camaras_septicas'),
    # Guías / contenido informativo
    path('medidas-pozo-septico/', views.medidas_pozo_septico, name='medidas_pozo_septico'),
    # Páginas de zona
    path('limpieza-pozos-<slug:zona>/', views.zona_page, name='zona_page'),
    path('sitemap.xml', sitemap, {'sitemaps': sitemaps}, name='django.contrib.sitemaps.views.sitemap'),
    path('robots.txt', views.robots_txt, name='robots_txt'),
    path('ads.txt', views.ads_txt, name='ads_txt'),
]
