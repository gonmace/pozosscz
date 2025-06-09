from django.shortcuts import render, redirect
from django.contrib.auth import logout, authenticate, login
from django.http import JsonResponse
from .models import Banner, Alcance, Contacto, TipoCliente
from pozosscz.models import DatosGenerales
from .forms import ContactForm
from django.contrib import messages

def home_page(request):
    active_banners = Banner.objects.filter(is_active=True)
    alcances = Alcance.objects.filter(is_active=True)
    tipos_clientes = TipoCliente.objects.filter(is_active=True)
    datos_generales = DatosGenerales.objects.first()
    celular = datos_generales.celular
    return render(request, 'HomePage.html', {
        'banner': active_banners[0],
        'alcances': alcances,
        'tipos_clientes': tipos_clientes,
        'celular': celular
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
    
    return render(request, 'contact.html', {
        'form': form,
        'correo': correo,
        'celular': celular
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
