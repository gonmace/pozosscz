from datetime import date
from django.shortcuts import render, redirect
from django.contrib.auth import logout, authenticate, login
from .models import Banner, Alcance, Contacto, TipoCliente, Testimonio, PreguntaFrecuente
from clientes.models import Cliente
from pozosscz.models import DatosGenerales
from .forms import ContactForm
from django.contrib import messages
from django.contrib.sitemaps import Sitemap
from django.urls import reverse
from django.http import HttpResponse, Http404
from .utils import get_slug_from_request, get_meta_for_slug

ZONAS = {
    'warnes': {
        'nombre': 'Warnes',
        'intro': 'Atendemos Warnes y toda su zona industrial y residencial con servicio de limpieza de pozos sépticos y ciegos. Llegamos rápido con nuestros camiones cisterna.',
        'zonas_cercanas': 'Montero, Colpa Bélgica, Portachuelo',
        'imagen': 'https://commons.wikimedia.org/wiki/Special:FilePath/Puente%20peatonal%20en%20Warnes%20Santa%20Cruz%20Bolivia%20-%20panoramio.jpg?width=1200',
        'centro_lat': -17.5159, 'centro_lon': -63.1686, 'centro_zoom': 13,
        'categoria': 'Caña y carnaval',
        'credito_texto': 'Wikimedia Commons · CC BY-SA',
        'credito_url': 'https://commons.wikimedia.org/wiki/File:Puente_peatonal_en_Warnes_Santa_Cruz_Bolivia_-_panoramio.jpg',
        'cuerpo': [
            'Warnes es uno de los polos de mayor crecimiento al norte de Santa Cruz: además del casco urbano, concentra parques industriales, agroindustria cañera y nuevas urbanizaciones residenciales. Muchas de estas propiedades —galpones, fábricas, viviendas y condominios— no están conectadas a una red de alcantarillado y dependen de pozos sépticos o ciegos que necesitan vaciado periódico.',
            'Trabajamos en todo el municipio con camiones cisterna de alta succión, coordinando el día y horario que menos interrumpa tu actividad. Tanto si es una vivienda familiar como una nave industrial con cámaras de gran capacidad, te damos el precio fijo por adelantado según tu ubicación en Warnes y zonas cercanas como Montero, Colpa Bélgica o Portachuelo.',
        ],
        'faqs': [
            {'q': '¿Atienden empresas e industrias en el parque industrial de Warnes?', 'a': 'Sí. Contamos con camiones de alta succión para cámaras y pozos de gran capacidad de fábricas, galpones y agroindustria, además de viviendas y condominios.'},
            {'q': '¿Cuánto tardan en llegar a Warnes desde Santa Cruz?', 'a': 'Generalmente coordinamos el servicio para el mismo día o el siguiente, según disponibilidad. Cotizás online y elegís el horario que te quede mejor.'},
        ],
    },
    'cotoca': {
        'nombre': 'Cotoca',
        'intro': 'Servicio de desagote de pozos sépticos y ciegos en Cotoca y sus urbanizaciones. Precio al instante, sin sorpresas.',
        'zonas_cercanas': 'El Torno, La Guardia, Santa Cruz centro',
        'imagen': 'https://commons.wikimedia.org/wiki/Special:FilePath/Iglesia%20de%20Cotoca%20Santa%20Cruz%20Bolivia.jpg?width=1200',
        'centro_lat': -17.753462, 'centro_lon': -62.998688, 'centro_zoom': 13,
        'categoria': 'Fe y cerámica',
        'credito_texto': 'Wikimedia Commons · CC BY-SA',
        'credito_url': 'https://commons.wikimedia.org/wiki/File:Iglesia_de_Cotoca_Santa_Cruz_Bolivia.jpg',
        'cuerpo': [
            'Cotoca, conocida por su basílica y la devoción a la Virgen, recibe un flujo constante de visitantes y peregrinos. Eso se traduce en muchos restaurantes, hospedajes, salones de eventos y viviendas que generan aguas residuales y, al no estar todos conectados al alcantarillado, dependen de pozos sépticos y cámaras que deben limpiarse con regularidad para evitar malos olores y desbordes, sobre todo en temporada alta y feriados.',
            'Damos servicio en el casco urbano de Cotoca y sus urbanizaciones, con precio fijo informado antes de ir. Si tenés un negocio gastronómico o un local con mucho movimiento, podemos programar limpiezas más frecuentes para que nunca te agarre un desborde en pleno fin de semana.',
        ],
        'faqs': [
            {'q': 'Tengo un restaurante en Cotoca, ¿cada cuánto conviene limpiar la cámara?', 'a': 'Los locales gastronómicos suelen necesitar limpieza cada 6 a 12 meses por el alto uso. Podemos agendar un mantenimiento periódico para que no te tome por sorpresa.'},
            {'q': '¿Trabajan en las urbanizaciones alrededor de Cotoca?', 'a': 'Sí, cubrimos el casco urbano y las urbanizaciones cercanas. El precio depende de la distancia y lo ves al instante al cotizar.'},
        ],
    },
    'la-guardia': {
        'nombre': 'La Guardia',
        'intro': 'Limpieza de pozos sépticos y ciegos en La Guardia. Cobertura total del municipio y sus urbanizaciones cercanas.',
        'zonas_cercanas': 'Cotoca, El Torno, Palmasola',
        'imagen': 'https://commons.wikimedia.org/wiki/Special:FilePath/La%20Guardia%2C%20Bolivia%20-%20panoramio.jpg?width=1200',
        'centro_lat': -17.8939, 'centro_lon': -63.3206, 'centro_zoom': 13,
        'categoria': 'Naturaleza',
        'credito_texto': 'Wikimedia Commons · CC BY-SA',
        'credito_url': 'https://commons.wikimedia.org/wiki/File:La_Guardia,_Bolivia_-_panoramio.jpg',
        'cuerpo': [
            'La Guardia es una de las zonas residenciales de más rápido crecimiento al sur de Santa Cruz, con muchos condominios cerrados, viviendas familiares y nuevas urbanizaciones. Gran parte de estas propiedades funciona con pozos sépticos o ciegos porque la red de alcantarillado todavía no llega a todos los barrios, por lo que el vaciado periódico es clave para evitar humedad, malos olores y daños en el sistema sanitario.',
            'Cubrimos todo el municipio de La Guardia y sus alrededores —incluyendo la zona hacia Cotoca, El Torno y Palmasola— con camiones cisterna y precio fijo por adelantado. Coordinás el día, llegamos puntual y dejamos tu pozo funcionando.',
        ],
        'faqs': [
            {'q': '¿Atienden condominios cerrados en La Guardia?', 'a': 'Sí. Coordinamos el ingreso con la administración y trabajamos de forma prolija y discreta dentro de condominios y urbanizaciones.'},
            {'q': 'Mi casa en La Guardia tiene el pozo lento y con olor, ¿es urgente?', 'a': 'Suelen ser señales de saturación. Conviene vaciarlo pronto; cotizás online y podemos ir el mismo día según disponibilidad.'},
        ],
    },
    'plan-3000': {
        'nombre': 'Plan 3000',
        'intro': 'Servicio de limpieza de pozos sépticos y ciegos en Plan 3000 y Villa 1ro de Mayo. Amplia experiencia en la zona sur de Santa Cruz.',
        'zonas_cercanas': 'Villa 1ro de Mayo, Pampa de la Isla, Satélite Norte',
        'imagen': 'https://www.historia.com.bo/imagen/escala/2017/3/a1263/plan-3000-andres-ibanes-historia-com-bo-mx.jpg',
        'centro_lat': -17.8090, 'centro_lon': -63.1250, 'centro_zoom': 13,
        'categoria': 'Cultura viva',
        'credito_texto': 'historia.com.bo',
        'credito_url': '',
        'cuerpo': [
            'El Plan 3000 (Distrito 8) es la zona más poblada del sur de Santa Cruz, con miles de viviendas y negocios que en su gran mayoría no están conectados a la red de alcantarillado y funcionan con pozos sépticos y ciegos. Por la alta densidad y el uso intensivo, estos pozos se saturan más rápido y requieren un vaciado a tiempo para evitar desbordes, malos olores y problemas de salubridad.',
            'Tenemos amplia experiencia en el Plan 3000 y zonas vecinas como Villa 1ro de Mayo, Pampa de la Isla y Satélite Norte. Llegamos con camión cisterna, precio fijo informado antes y la posibilidad de coordinar para el mismo día. Atendemos tanto viviendas como mercados, comedores y talleres del barrio.',
        ],
        'faqs': [
            {'q': '¿Atienden el Plan 3000 y la Villa 1ro de Mayo el mismo día?', 'a': 'Sí, según disponibilidad. Es una de las zonas donde más trabajamos; cotizás online y elegís el horario.'},
            {'q': '¿Hacen limpieza de pozos en mercados y negocios del Plan 3000?', 'a': 'Sí, atendemos viviendas y también mercados, comedores y locales, que suelen necesitar limpiezas más frecuentes por el alto uso.'},
        ],
    },
    'urubo': {
        'nombre': 'Urubó',
        'intro': 'Atendemos condominios, clubes y residencias del Urubó. Servicio discreto y profesional de limpieza de pozos sépticos.',
        'zonas_cercanas': 'Puerto Pailas, Parque Industrial, Zona Norte',
        'imagen': 'https://commons.wikimedia.org/wiki/Special:FilePath/Puente%20Arquitecto%20Crist%C3%B3bal%20Roda%20Daza%20sobre%20el%20Pira%C3%AD%20-%20Porongo%2C%20Bolivia.jpg?width=1200',
        'centro_lat': -17.7650, 'centro_lon': -63.2200, 'centro_zoom': 13,
        'categoria': 'Colinas verdes',
        'credito_texto': 'Wikimedia Commons · CC BY-SA',
        'credito_url': 'https://commons.wikimedia.org/wiki/File:Puente_Arquitecto_Crist%C3%B3bal_Roda_Daza_sobre_el_Pira%C3%AD_-_Porongo,_Bolivia.jpg',
        'cuerpo': [
            'El Urubó concentra condominios exclusivos, country clubs y residencias sobre las colinas al oeste del río Piraí. Como la zona no cuenta con red pública de alcantarillado, prácticamente todas las propiedades funcionan con cámaras sépticas o pozos —muchas veces de gran capacidad— que necesitan mantenimiento periódico para seguir funcionando sin olores ni desbordes.',
            'Ofrecemos un servicio discreto y prolijo, coordinando el ingreso a condominios y barrios cerrados con la administración. Trabajamos en todo el Urubó y la zona de Porongo, con camiones de alta succión y precio fijo informado antes de ir.',
        ],
        'faqs': [
            {'q': '¿El servicio en el Urubó es discreto y coordinado con el condominio?', 'a': 'Sí. Coordinamos horario e ingreso con la administración del condominio y trabajamos de forma prolija y discreta.'},
            {'q': 'Mi residencia en el Urubó tiene una cámara séptica grande, ¿pueden con eso?', 'a': 'Sí, contamos con camiones de alta succión para cámaras y pozos de gran capacidad típicos de las residencias del Urubó.'},
        ],
    },
}


class StaticViewSitemap(Sitemap):
    changefreq = 'weekly'

    # Prioridad relativa de cada página dentro del sitio.
    PRIORITIES = {
        'home_page': 1.0,
        'cotiza': 0.9,
        'calcula': 0.9,
        'servicio_pozo_ciego': 0.9,
        'servicio_pozos_septicos': 0.9,
        'servicio_camaras_septicas': 0.9,
        'medidas_pozo_septico': 0.7,
        'contact': 0.5,
    }

    def items(self):
        return [
            'home_page', 'cotiza', 'calcula', 'contact',
            'servicio_pozo_ciego', 'servicio_pozos_septicos', 'servicio_camaras_septicas',
            'medidas_pozo_septico',
        ]

    def location(self, item):
        return reverse(item)

    def priority(self, item):
        return self.PRIORITIES.get(item, 0.5)


class ZonaSitemap(Sitemap):
    changefreq = 'monthly'
    priority = 0.7

    def items(self):
        return list(ZONAS.keys())

    def location(self, item):
        return reverse('zona_page', kwargs={'zona': item})

def robots_txt(request):
    lines = [
        "User-agent: *",
        "Disallow: /mapa",
        "Disallow: /login/",
        "Sitemap: https://pozosscz.com/sitemap.xml",
    ]
    return HttpResponse("\n".join(lines), content_type="text/plain")

def ads_txt(request):
    content = "google.com, pub-9612645510546880, DIRECT, f08c47fec0942fa0"
    return HttpResponse(content, content_type="text/plain")


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

    total_clientes = Cliente.objects.count()
    años_experiencia = date.today().year - 2019

    testimonios = Testimonio.objects.filter(is_active=True)
    preguntas_frecuentes = PreguntaFrecuente.objects.filter(is_active=True)

    celular = datos_generales.celular
    mensaje_whatsapp = datos_generales.mensaje_whatsapp
    mensaje_cotizar = datos_generales.mensaje_cotizar

    slug = get_slug_from_request(request)
    meta = get_meta_for_slug(slug, request)

    # Variante del hero (A/B/C nuevas, D = banner animado actual).
    # El público ve la variante elegida en el admin (DatosGenerales.hero_variant).
    # El staff autenticado puede previsualizar otra vía ?v= (override temporal).
    default_variant = datos_generales.hero_variant if datos_generales.hero_variant in {'A', 'D'} else 'A'
    hero_variant = default_variant
    v = request.GET.get('v', '').upper()
    if v in {'A', 'D'} and request.user.is_authenticated:
        hero_variant = v

    return render(request, 'HomePage.html', {
        'total_clientes': total_clientes,
        'años_experiencia': años_experiencia,
        'banner': active_banner,
        'alcances': alcances,
        'tipos_clientes': tipos_clientes,
        'testimonios': testimonios,
        'preguntas_frecuentes': preguntas_frecuentes,
        'celular': celular,
        'mensaje_whatsapp': mensaje_whatsapp,
        'mensaje_cotizar': mensaje_cotizar,
        'meta': meta,
        'hero_variant': hero_variant,
        'default_variant': default_variant,
        'show_variant_switcher': request.user.is_authenticated,
    })

def calcula(request):
    datos_generales = DatosGenerales.objects.first()
    if not datos_generales:
        datos_generales = DatosGenerales.objects.create()
    celular = datos_generales.celular
    mensaje_whatsapp = datos_generales.mensaje_whatsapp
    
    slug = get_slug_from_request(request)
    meta = get_meta_for_slug(slug, request)
    
    # Mejorar meta tags específicos para la página calcula
    if slug == 'calcula':
        from meta.views import Meta as MetaObject
        from django.conf import settings
        meta = MetaObject(
            title="Calculadoras de Pozos Sépticos - Capacidad y Dimensiones | PozosSCZ",
            description="Calculadora gratuita de capacidad y dimensiones de pozos sépticos. Volumen en m³ y litros, profundidad recomendada según número de habitantes. Servicio de limpieza en Santa Cruz, Bolivia.",
            keywords=["calculadora pozo séptico", "calcular capacidad pozo", "volumen pozo séptico", "calculadora pozos", "capacidad pozo en litros", "calcular m3 pozo", "herramienta cálculo pozos", "dimensionar pozo séptico", "calcular profundidad pozo", "dimensiones pozo séptico", "calculadora dimensiones pozos"],
            image=request.build_absolute_uri(settings.DEFAULT_META.get("IMAGE")),
            use_og=True,
            use_twitter=True,
            use_facebook=True,
            request=request
        )
    
    return render(request, 'calcula.html', {
        'celular': celular,
        'mensaje_whatsapp': mensaje_whatsapp,
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
    mensaje_whatsapp = datos_generales.mensaje_whatsapp
    
    slug = get_slug_from_request(request)
    meta = get_meta_for_slug(slug, request)
    
    return render(request, 'contact.html', {
        'form': form,
        'correo': correo,
        'celular': celular,
        'mensaje_whatsapp': mensaje_whatsapp,
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


def _get_base_context(request, slug, template_extra=None):
    datos_generales = DatosGenerales.objects.first()
    meta = get_meta_for_slug(slug, request)
    ctx = {
        'celular': datos_generales.celular,
        'mensaje_whatsapp': datos_generales.mensaje_whatsapp,
        'mensaje_cotizar': datos_generales.mensaje_cotizar,
        'meta': meta,
        'zonas': ZONAS,
    }
    if template_extra:
        ctx.update(template_extra)
    return ctx


def servicio_pozo_ciego(request):
    return render(request, 'servicios/pozo_ciego.html',
                  _get_base_context(request, 'limpieza-pozo-ciego-santa-cruz'))


def servicio_pozos_septicos(request):
    return render(request, 'servicios/pozos_septicos.html',
                  _get_base_context(request, 'limpieza-pozos-septicos-santa-cruz'))


def servicio_camaras_septicas(request):
    return render(request, 'servicios/camaras_septicas.html',
                  _get_base_context(request, 'limpieza-camaras-septicas'))


def medidas_pozo_septico(request):
    return render(request, 'guias/medidas_pozo_septico.html',
                  _get_base_context(request, 'medidas-pozo-septico'))


def zona_page(request, zona):
    if zona not in ZONAS:
        raise Http404
    return render(request, 'zona.html',
                  _get_base_context(request, f'limpieza-pozos-{zona}', {'zona': ZONAS[zona]}))
