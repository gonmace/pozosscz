from django.urls import path
from . import views
from django.contrib.sitemaps.views import sitemap
from .views import StaticViewSitemap

sitemaps = {
    'static': StaticViewSitemap,
}
urlpatterns = [
    path('', views.home_page, name='home_page'),
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('contact/', views.contact, name='contact'),
    path('sitemap.xml', sitemap, {'sitemaps': sitemaps}, name='django.contrib.sitemaps.views.sitemap'),
    path('robots.txt', views.robots_txt, name='robots_txt'),
]
