from django.shortcuts import render
from django.contrib.auth import logout
from django.http import JsonResponse
from .models import Banner, Alcance, TipoCliente


def home_page(request):
    active_banners = Banner.objects.filter(is_active=True)
    alcances = Alcance.objects.filter(is_active=True)
    tipos_clientes = TipoCliente.objects.filter(is_active=True)
    return render(request, 'HomePage.html', {'banner': active_banners[0], 'alcances': alcances, 'tipos_clientes': tipos_clientes})


def logout_view(request):
    if request.method == 'POST':
        logout(request)
        return JsonResponse({'message': 'Successfully logged out'})
    return JsonResponse({'error': 'Method not allowed'}, status=405)
