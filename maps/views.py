from django.shortcuts import render
from pozosscz.models import AreasFactor, PreciosPozosSCZ, DatosGenerales
from clientes.models import Cliente
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
import math
import requests
from typing import Tuple, List, Dict, Any
import random

# Service bases coordinates
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
    return render(request, 'cotiza.html')

def mapa(request):
    return render(request, 'mapa.html')

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

    def calculate_route_metrics(self, lat: float, lon: float, bases: List[Tuple[float, float, str]], waypoint: Tuple[float, float] = None) -> Tuple[List[float], List[float], List[str], List[List[List[float]]]]:
        """Calculate distances and times from service bases to target location."""
        distances = []
        times = []
        origins = []
        geometries = []
        
        for base_lat, base_lon, base_name in bases:
            # Construct URL with waypoint if provided
            url_parts = [f"{base_lon},{base_lat}"]
            if waypoint:
                url_parts.append(f"{waypoint[1]},{waypoint[0]}")
            url_parts.append(f"{lon},{lat}")
            
            url = f"http://router.project-osrm.org/route/v1/driving/{';'.join(url_parts)}?overview=full&geometries=geojson"
            
            try:
                response = requests.get(url)
                if response.status_code == 200:
                    data = response.json()
                    if data["code"] == "Ok" and len(data["routes"]) > 0:
                        route = data["routes"][0]
                        distances.append(route["distance"] / 1000)  # Convert to km
                        times.append(route["duration"] / 60 * 1.25)  # Convert to minutes and add 25% buffer
                        origins.append(base_name)
                        geometries.append(route["geometry"]["coordinates"])
            except Exception as e:
                print(f"Error calculating route: {e}")
                
        return distances, times, origins, geometries

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

        # Get area factors
        factors = self.get_area_factors(lat, lon)
        if not factors:
            return Response(
                {"error": "Location is outside service area"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Calculate combined factor
        combined_factor = math.prod(factors)

        # Get waypoint if location is in special areas
        waypoint = self.get_waypoint_for_location(lat, lon)

        # Calculate routes with waypoint if needed
        distances, times, origins, geometries = self.calculate_route_metrics(lat, lon, BASES, waypoint)
        
        if not distances:
            return Response(
                {"error": "Could not calculate route to location"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Find shortest route
        min_index = distances.index(min(distances))
        distance = distances[min_index]
        time = times[min_index]

        # Get pricing configuration
        try:
            pricing = PreciosPozosSCZ.objects.first()
            if not pricing:
                return Response(
                    {"error": "Pricing configuration not found"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        except PreciosPozosSCZ.DoesNotExist:
            return Response(
                {"error": "Pricing configuration not found"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        # Calculate price
        distance_price = distance * pricing.p_km
        time_price = time * pricing.p_tiempo
        base_price = pricing.p_base
        
        # Use the higher of distance or time-based price
        final_price = base_price + max(distance_price, time_price)
        final_price_with_factor = final_price * combined_factor
        
        # Round to nearest 10
        rounded_price = round(final_price_with_factor / 10) * 10

        # Generate unique code
        code_parts = list(str(rounded_price))
        for _ in range(4):
            code_parts.insert(random.randint(0, len(code_parts)), str(random.randint(0, 9)))
        unique_code = ''.join(code_parts)

        # Create client record
        try:
            client = Cliente.objects.create(
                # name=name,
                # tel1=phone,
                cost=rounded_price,
                lat=lat,
                lon=lon,
                cod=unique_code,
                status='COT',
                user='CLC'  # Client confirmed
            )
        except Exception as e:
            return Response(
                {"error": f"Failed to create client record: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        # Get WhatsApp message template
        try:
            datos_generales = DatosGenerales.objects.first()
            whatsapp_number = datos_generales.celular if datos_generales else "+59167728817"
            message_template = datos_generales.mensaje_cotizar if datos_generales else "¡Hola!, Requiero el servicio de limpieza en la siguiente ubicación:"
        except Exception:
            whatsapp_number = "+59167728817"
            message_template = "¡Hola!, Requiero el servicio de limpieza en la siguiente ubicación:"

        # Format WhatsApp message
        message = f"Código de cotización:{unique_code}\n{message_template}\nhttps://maps.google.com/maps?q={lat},{lon}&z=17&hl=es"
        whatsapp_url = f"https://wa.me/{whatsapp_number}?text={message}"

        response_data = {
            "price": rounded_price,
            "code": unique_code,
            "whatsapp_url": whatsapp_url,
            "distance": distance,
            "time": time,
            "origin": origins[min_index],
            "routes": [
                {
                    "geometry": geometry,
                    "origin": origin,
                    "distance": dist,
                    "time": t
                }
                for geometry, origin, dist, t in zip(geometries, origins, distances, times)
            ]
        }

        return Response(response_data, status=status.HTTP_200_OK)