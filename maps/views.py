from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from main.utils import get_meta_for_slug, get_slug_from_request
from pozosscz.models import AreasFactor, BaseCamion, PreciosPozosSCZ, DatosGenerales
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
import math
import re
import logging
import requests as http_requests

logger = logging.getLogger(__name__)
from typing import Tuple, List
from geopy.distance import geodesic
from .utils import calculate_route_metrics
from asgiref.sync import async_to_sync


# Service bases coordinates
SCZ_CENTER = (-17.783280,-63.182184)
SAGUAPAC_BASE = (-17.74620847, -63.12672898, "saguapac")
GARAJE_BASE = (-17.78595813, -63.12451243, "garaje")

BASES = [SAGUAPAC_BASE, GARAJE_BASE]

# Waypoints for route calculations
WAYPOINT_URUBO = (-17.7498515, -63.2154661)
WAYPOINT_TORNO = (-17.988987, -63.389942)

# Waypoint polygons
URUBO_POLYGON = [
    [-17.7500354, -63.2116842],
    [-17.7605802, -63.2134437],
    [-17.7651984, -63.2171773],
    [-17.775824, -63.2275199],
    [-17.78555, -63.2306957],
    [-17.8055723, -63.2506942],
    [-17.8124366, -63.2602214],
    [-17.8142344, -63.2676887],
    [-17.8201178, -63.2780742],
    [-17.8323743, -63.2849407],
    [-17.8436495, -63.2885456],
    [-17.8580285, -63.2878589],
    [-17.865871, -63.2877731],
    [-17.8739583, -63.294897],
    [-17.8758371, -63.300476],
    [-17.8732231, -63.3045101],
    [-17.8715894, -63.323822],
    [-17.8794313, -63.3403015],
    [-17.9341522, -63.366394],
    [-17.9369286, -63.3813285],
    [-17.9462375, -63.3964347],
    [-17.9485238, -63.4295654],
    [-17.9150426, -63.4448432],
    [-17.864564, -63.4441566],
    [-17.7673236, -63.4529113],
    [-17.7078092, -63.442955]
]

TORNO_POLYGON = [
    [-17.935622, -63.3665657],
    [-17.9447677, -63.3907699],
    [-17.9509734, -63.4182357],
    [-17.949177, -63.4415817],
    [-17.8957677, -63.4937667],
    [-17.8764906, -63.5095596],
    [-17.8405448, -63.5112762],
    [-17.8572115, -63.540802],
    [-17.8974012, -63.5528182],
    [-17.9405215, -63.537712],
    [-18.0055088, -63.5109329],
    [-18.0126919, -63.4098243],
    [-18.0019172, -63.4052753],
    [-17.9975908, -63.4045457],
    [-17.9969582, -63.401885],
    [-17.9963051, -63.3994388],
    [-17.9933868, -63.3977222],
    [-17.9905092, -63.3931946],
    [-17.9887744, -63.3883452],
    [-17.9862233, -63.3850193],
    [-17.9829578, -63.3833456],
    [-17.9791208, -63.3828735],
    [-17.976243, -63.3808994],
    [-17.9744469, -63.3768653],
    [-17.972365, -63.37502],
    [-17.9706914, -63.3716297],
    [-17.9648129, -63.3717584],
    [-17.9604448, -63.37399],
    [-17.9518307, -63.3717584]
]

def cotiza(request):
    datos_generales = DatosGenerales.objects.first()
    if not datos_generales:
        datos_generales = DatosGenerales.objects.create()
    datos_dict = {
        'celular': datos_generales.celular,
        'mensaje_cotizar': datos_generales.mensaje_cotizar
    }
    celular = datos_generales.celular
    mensaje_whatsapp = datos_generales.mensaje_whatsapp
    slug = get_slug_from_request(request)
    meta = get_meta_for_slug(slug, request)
    return render(request, 'cotiza.html', 
                  {'datos_generales': datos_dict,
                   'celular': celular,
                   'mensaje_whatsapp': mensaje_whatsapp,
                   'meta': meta
                   })

@login_required
def mapa(request):
    datos_generales = DatosGenerales.objects.first()
    if not datos_generales:
        datos_generales = DatosGenerales.objects.create()
    basecamiones = BaseCamion.objects.filter(deleted=False)
    celular = datos_generales.celular
    mensaje_whatsapp = datos_generales.mensaje_whatsapp
    return render(request, 'mapa.html', {
        'basecamiones': basecamiones,
        'celular': celular,
        'mensaje_whatsapp': mensaje_whatsapp
    })

class ContratarAPIView(APIView):
    permission_classes = [AllowAny]

    def is_point_in_polygon(self, lat: float, lon: float, polygon: List[List[float]]) -> bool:
        """Check if a point is inside a polygon using ray casting algorithm."""
        inside = False
        j = len(polygon) - 1
        
        for i in range(len(polygon)):
            if ((polygon[i][1] > lon) != (polygon[j][1] > lon) and
                (lat < (polygon[j][0] - polygon[i][0]) * (lon - polygon[i][1]) /
                 (polygon[j][1] - polygon[i][1]) + polygon[i][0])):
                inside = not inside
            j = i
            
        return inside

    def get_area_factors(self, lat: float, lon: float) -> List[float]:
        """Get all area factors that apply to the given location."""
        factors = []
        areas = AreasFactor.objects.all()
        
        for area in areas:
            if self.is_point_in_polygon(lat, lon, area.polygon):
                factors.append(area.factor)
                
        return factors

    def get_waypoint_for_location(self, lat: float, lon: float) -> Tuple[float, float]:
        """Determine which waypoint to use based on the location."""
        if self.is_point_in_polygon(lat, lon, URUBO_POLYGON):
            return WAYPOINT_URUBO
        elif self.is_point_in_polygon(lat, lon, TORNO_POLYGON):
            return WAYPOINT_TORNO
        return None

    def post(self, request, *args, **kwargs):
        # Extract data from request
        try:
            lat = float(request.data.get('lat'))
            lon = float(request.data.get('lon'))
        except (TypeError, ValueError):
            return Response(
                {"error": "Invalid latitude or longitude values"},
                status=status.HTTP_400_BAD_REQUEST
            )

        distance_scz = geodesic(SCZ_CENTER, (lat, lon)).km
        # Get area factors
        factors = self.get_area_factors(lat, lon)
        # Calculate combined factor
        combined_factor = math.prod(factors) if factors else 0

        # Get waypoint if location is in special areas
        waypoint = self.get_waypoint_for_location(lat, lon)
        
        # Get basecamiones
        basecamiones = BaseCamion.objects.filter(deleted=False, available=True)
        if not basecamiones:
            basecamiones = BASES
        # Se iniverte coordenadas para el OSRM
        
        bases = [(base.coordinates[1], base.coordinates[0], base.name) for base in basecamiones]
        
        # Calcular rutas al cliente con punto intermedio si es necesario.
        distances, times, origins, geometries = async_to_sync(calculate_route_metrics)(lat, lon, bases, waypoint)

        if not distances:
            return Response(
                {"error": "No se pudo calcular la ruta. El servicio de enrutamiento no está disponible."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        # Calcular ruta del cliente a SAGUAPAC
        distance_saguapac, time_saguapac, origin_saguapac, geometry_saguapac = async_to_sync(calculate_route_metrics)(
            SAGUAPAC_BASE[0], SAGUAPAC_BASE[1], [(lon, lat, "cliente")], waypoint)

        if not distance_saguapac:
            return Response(
                {"error": "No se pudo calcular la ruta de retorno a Saguapac."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        # Find shortest route
        min_index = distances.index(min(distances))

        p = PreciosPozosSCZ.objects.first()

        # Tiempos ajustados al camión (más lento que un auto)
        factor_camion  = p.factor_tiempo    # 1.25 → camión 25% más lento
        factor_cargado = p.factor_cargado   # 1.05 → 5% más lento en retorno cargado

        tiempo_ida_seg     = times[min_index] * factor_camion
        tiempo_retorno_seg = time_saguapac[0] * factor_camion * factor_cargado
        tiempo_trabajo_seg = p.tiempo_trabajo * 60

        tiempo_total = tiempo_ida_seg + tiempo_retorno_seg + tiempo_trabajo_seg
        tiempo_cobro = max(tiempo_total, p.tiempo_minimo_cobro * 60)

        # Si el tiempo mínimo se activa, el exceso se distribuye proporcionalmente al viaje
        tiempo_viaje_seg   = tiempo_ida_seg + tiempo_retorno_seg
        tiempo_trabajo_cobro = tiempo_trabajo_seg
        if tiempo_cobro > tiempo_total:
            tiempo_viaje_seg += tiempo_cobro - tiempo_total

        # Costo de combustible: viaje y trabajo con consumos distintos
        costo_combustible = (
            (tiempo_viaje_seg   / 3600) * p.consumo_viaje_hr   +
            (tiempo_trabajo_cobro / 3600) * p.consumo_trabajo_hr
        ) * p.precio_diesel
        costo_mantenimiento = (p.costo_mantenimiento / 100) * costo_combustible
        costo_saguapac_panta = p.costo_saguapac_planta

        subtotal_costos = costo_combustible + costo_mantenimiento + costo_saguapac_panta

        dist_ida_km = distances[min_index] / 1000
        dist_sag_km = distance_saguapac[0] / 1000

        # Utilidad por km de retorno a Saguapac (todos los km)
        costo_adicional_km_retorno = dist_sag_km * p.costo_adicional_km_retorno

        # Utilidad: por km de ida + base fija, ajustada por zona
        utilidad_km_ida = p.utilidad_km * dist_ida_km
        factor          = combined_factor if combined_factor != 0 else 1
        utilidad_total  = (utilidad_km_ida + p.utilidad_base) * factor

        subtotal = (subtotal_costos + utilidad_total + costo_adicional_km_retorno) * p.factor_global

        # Precio sin factor de zona (para comparación)
        utilidad_sin_zona  = (utilidad_km_ida + p.utilidad_base) * 1
        subtotal_sin_zona  = (subtotal_costos + utilidad_sin_zona + costo_adicional_km_retorno) * p.factor_global

        # Chofer = % del precio final (no del subtotal)
        tasa_chofer     = p.personal_camion / 100
        precio          = subtotal / (1 - tasa_chofer)
        chofer          = precio - subtotal
        precio          = round(precio / 10) * 10  # múltiplo de 10
        precio_sin_zona = round(subtotal_sin_zona / (1 - tasa_chofer) / 10) * 10

        logger.debug(
            "cotizacion lat=%s lon=%s dist_scz=%.2f factor_zona=%s combustible=%.2f precio=%.2f",
            lat, lon, distance_scz, combined_factor, costo_combustible, precio
        )

        return Response(
            {
                "distances": distances,
                "times": times,
                "origins": origins,
                "paths": geometries,
                "distance_saguapac": distance_saguapac,
                "time_saguapac": time_saguapac,
                "origin_saguapac": origin_saguapac,
                "path_saguapac": geometry_saguapac,

                "distance_scz": distance_scz,
                "distancia_maxima_cotizar": p.distancia_maxima_cotizar,
                "origen": min_index,
                "costo_combustible": costo_combustible,
                "costo_otros": costo_mantenimiento + costo_saguapac_panta + costo_adicional_km_retorno,
                "detalle_otros": {
                    "mantenimiento": round(costo_mantenimiento, 1),
                    "saguapac": costo_saguapac_panta,
                    "retorno_saguapac": round(costo_adicional_km_retorno, 1),
                },
                "costo_adicional_retorno": costo_adicional_km_retorno,
                "utilidad": utilidad_total,
                "factor_zona": combined_factor,
                "tiempo_real_min": round(tiempo_total / 60, 1),
                "tiempo_cobro_min": round(tiempo_cobro / 60, 1),
                "factor_camion": factor_camion,
                "factor_cargado": factor_cargado,
                "factor_global": p.factor_global,
                "chofer": chofer,
                "precio": precio,
                "precio_sin_zona": precio_sin_zona,
            },
            status=status.HTTP_200_OK
        )


_ALLOWED_MAP_DOMAINS = {
    'maps.app.goo.gl', 'goo.gl', 'google.com', 'www.google.com', 'maps.google.com',
}

def resolve_maps_url(request):
    from urllib.parse import urlparse
    short_url = request.GET.get('url', '')
    if not short_url:
        return JsonResponse({'error': 'No URL'}, status=400)
    try:
        parsed = urlparse(short_url)
        if parsed.netloc not in _ALLOWED_MAP_DOMAINS:
            return JsonResponse({'error': 'Dominio no permitido'}, status=400)
        resp = http_requests.head(short_url, allow_redirects=True, timeout=5,
                                  headers={'User-Agent': 'Mozilla/5.0'})
        final_url = resp.url

        lat, lon = None, None

        m = re.search(r'@(-?\d+\.\d+),(-?\d+\.\d+)', final_url)
        if m:
            lat, lon = m.group(1), m.group(2)
        else:
            m = re.search(r'!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)', final_url)
            if m:
                lat, lon = m.group(1), m.group(2)
            else:
                m = re.search(r'[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)', final_url)
                if m:
                    lat, lon = m.group(1), m.group(2)

        return JsonResponse({'final_url': final_url, 'lat': lat, 'lon': lon})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)
        