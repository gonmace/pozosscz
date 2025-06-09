from django.shortcuts import render, redirect
from django.contrib.auth import logout, authenticate, login
from django.http import JsonResponse
from .models import Banner, Alcance, Contacto, TipoCliente
from pozosscz.models import DatosGenerales
from .forms import ContactForm
from django.contrib import messages
from django.core.files.base import ContentFile

def home_page(request):
    # Obtener o crear datos generales
    datos_generales = DatosGenerales.objects.first()
    if not datos_generales:
        datos_generales = DatosGenerales.objects.create()
    
    # Obtener o crear banner activo
    active_banners = Banner.objects.filter(is_active=True)
    if not active_banners.exists():
        # Crear un banner por defecto si no existe ninguno
        default_banner = Banner.objects.create(
            img_alt="Banner por defecto",
            is_active=True
        )
        # Crear archivos temporales para svg e img
        svg_content = '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="600"><rect width="100%" height="100%" fill="#f0f0f0"/><text x="50%" y="50%" text-anchor="middle" font-size="48">Banner por defecto</text></svg>'
        default_banner.svg.save('default.svg', ContentFile(svg_content.encode()), save=True)
        default_banner.img.save('default.jpg', ContentFile(b''), save=True)
        active_banners = [default_banner]
    
    # Obtener o crear alcances
    alcances = Alcance.objects.filter(is_active=True)
    if not alcances.exists():
        # Crear un alcance por defecto si no existe ninguno
        Alcance.objects.create(
            titulo="Servicio Profesional",
            descripcion="Ofrecemos un servicio profesional y de calidad",
            is_active=True
        )
        alcances = Alcance.objects.filter(is_active=True)
    
    # Obtener o crear tipos de clientes
    tipos_clientes = TipoCliente.objects.filter(is_active=True)
    if not tipos_clientes.exists():
        # Crear un tipo de cliente por defecto si no existe ninguno
        TipoCliente.objects.create(
            nombre="Residencial",
            img_svg='<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>',
            is_active=True
        )
        tipos_clientes = TipoCliente.objects.filter(is_active=True)

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
