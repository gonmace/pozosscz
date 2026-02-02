from django.shortcuts import render, redirect
from django.contrib.auth import logout, authenticate, login
from .models import Banner, Alcance, Contacto, TipoCliente
from pozosscz.models import DatosGenerales
from .forms import ContactForm
from django.contrib import messages
from django.contrib.sitemaps import Sitemap
from django.urls import reverse
from django.http import HttpResponse
from .utils import get_slug_from_request, get_meta_for_slug

class StaticViewSitemap(Sitemap):
    def items(self):
        return ['home_page', 'cotiza', 'calcula', 'contact']

    def location(self, item):
        return reverse(item)

def robots_txt(request):
    lines = [
        "User-agent: *",
        "Disallow: /mapa",
        "Sitemap: https://pozosscz.com/sitemap.xml",
    ]
    return HttpResponse("\n".join(lines), content_type="text/plain")


def home_page(request):
    # Obtener o crear datos generales
    datos_generales = DatosGenerales.objects.first()
    if not datos_generales:
        datos_generales = DatosGenerales.objects.create()
    
    # Obtener o crear banner activo
    active_banner = Banner.objects.filter(is_active=True).first()
    if not active_banner:
        active_banner = Banner.objects.create(
            img_alt="Banner por defecto",
            is_active=True
        )
    
    # Obtener o crear alcances
    alcances = Alcance.objects.filter(is_active=True)
    
    # Obtener o crear tipos de clientes
    tipos_clientes = TipoCliente.objects.filter(is_active=True)

    celular = datos_generales.celular
    
    slug = get_slug_from_request(request)
    meta = get_meta_for_slug(slug, request)

    return render(request, 'HomePage.html', {
        'banner': active_banner,
        'alcances': alcances,
        'tipos_clientes': tipos_clientes,
        'celular': celular,
        'meta': meta
    })

def calcula(request):
    datos_generales = DatosGenerales.objects.first()
    if not datos_generales:
        datos_generales = DatosGenerales.objects.create()
    celular = datos_generales.celular
    
    slug = get_slug_from_request(request)
    meta = get_meta_for_slug(slug, request)
    
    # Mejorar meta tags específicos para la página calcula
    if slug == 'calcula':
        from meta.views import Meta as MetaObject
        meta = MetaObject(
            title="Calculadoras de Pozos Sépticos - Capacidad y Dimensiones | PozosSCZ",
            description="Herramientas gratuitas para calcular la capacidad y dimensionar pozos sépticos. Calcula el volumen de pozos existentes y las dimensiones recomendadas según número de habitantes. Incluye calculadora de capacidad en m³ y litros, y calculadora de dimensiones con profundidad recomendada.",
            keywords=["calculadora pozo séptico", "calcular capacidad pozo", "volumen pozo séptico", "calculadora pozos", "capacidad pozo en litros", "calcular m3 pozo", "herramienta cálculo pozos", "dimensionar pozo séptico", "calcular profundidad pozo", "dimensiones pozo séptico", "calculadora dimensiones pozos"],
            use_og=True,
            use_twitter=True,
            use_facebook=True,
            request=request
        )
    
    return render(request, 'calcula.html', {
        'celular': celular,
        'meta': meta
    })

def contact(request):
    if request.method == 'POST':
        form = ContactForm(request.POST)
        if form.is_valid():
            contacto = Contacto(
                nombre=form.cleaned_data['nombre'],
                telefono=form.cleaned_data['telefono'],
                mensaje=form.cleaned_data['mensaje']
            )
            contacto.save()
            messages.success(request, '¡Gracias por contactarnos! Te responderemos pronto.')
            return redirect('home_page')
    else:
        form = ContactForm()
    datos_generales = DatosGenerales.objects.first()
    correo = datos_generales.correo
    celular = datos_generales.celular
    
    slug = get_slug_from_request(request)
    meta = get_meta_for_slug(slug, request)
    
    return render(request, 'contact.html', {
        'form': form,
        'correo': correo,
        'celular': celular,
        'meta': meta
    })

def login_view(request):
    if request.method == 'POST':
        username = request.POST.get('username')
        password = request.POST.get('password')
        user = authenticate(request, username=username, password=password)
        
        if user is not None:
            login(request, user)
            return redirect('mapa')
        else:
            messages.error(request, 'Usuario o contraseña incorrectos')
            return redirect('login')
    
    return render(request, 'login.html')

def logout_view(request):
    if request.method == 'POST':
        logout(request)
        messages.success(request, 'Cierre de sesión exitoso')
        return redirect('home_page')
    return redirect('home_page')
