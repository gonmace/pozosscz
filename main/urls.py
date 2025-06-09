from django.urls import path
from . import views

urlpatterns = [
    path('', views.home_page, name='home_page'),
    path('logout/', views.logout_view, name='logout'),
    path('contact/', views.contact, name='contact'),
]
