import httpx
import logging
import polyline as polyline_codec
from typing import Tuple, List
from geopy.distance import geodesic

logger = logging.getLogger(__name__)

OSRM_URL = "http://router.project-osrm.org/route/v1/driving"

# Fallback: distancia real en carretera vs línea recta
ROAD_FACTOR = 1.4
AVG_SPEED_KMH = 35


def _decode_polyline(encoded: str) -> List[List[float]]:
    """Decode OSRM encoded polyline (precision 5) to [[lat, lon], ...]."""
    return [[lat, lon] for lat, lon in polyline_codec.decode(encoded)]


def _geodesic_fallback(
    lat: float, lon: float,
    bases: List[Tuple[float, float, str]],
    waypoint: Tuple[float, float] = None
) -> Tuple[List[float], List[float], List[str], List[List[List[float]]]]:
    """Fallback con distancia geodésica cuando OSRM no está disponible."""
    distances, times, origins, geometries = [], [], [], []

    for base_lon, base_lat, base_name in bases:
        if waypoint:
            d1 = geodesic((base_lat, base_lon), waypoint).km
            d2 = geodesic(waypoint, (lat, lon)).km
            dist_km = (d1 + d2) * ROAD_FACTOR
        else:
            dist_km = geodesic((base_lat, base_lon), (lat, lon)).km * ROAD_FACTOR

        distances.append(dist_km * 1000)
        times.append((dist_km / AVG_SPEED_KMH) * 3600)
        origins.append(base_name)
        geometries.append([[base_lat, base_lon], [lat, lon]])

    return distances, times, origins, geometries


async def calculate_route_metrics(
    lat: float, lon: float,
    bases: List[Tuple[float, float, str]],
    waypoint: Tuple[float, float] = None
) -> Tuple[List[float], List[float], List[str], List[List[List[float]]]]:
    """Calculate distances and times. Uses OSRM, falls back to geodesic."""
    distances, times, origins, geometries = [], [], [], []

    async with httpx.AsyncClient(timeout=8.0) as client:
        for base_lon, base_lat, base_name in bases:
            # Coordenadas en formato OSRM: lon,lat separadas por ;
            coords = [f"{base_lon},{base_lat}"]
            if waypoint:
                coords.append(f"{waypoint[1]},{waypoint[0]}")
            coords.append(f"{lon},{lat}")
            url = f"{OSRM_URL}/{';'.join(coords)}?overview=full&geometries=polyline"
            try:
                response = await client.get(url)
                if response.status_code == 200:
                    data = response.json()
                    if data["code"] == "Ok" and data["routes"]:
                        route = data["routes"][0]
                        distances.append(route["distance"])  # metros
                        times.append(route["duration"])      # segundos
                        origins.append(base_name)
                        geometries.append(_decode_polyline(route["geometry"]))
                    else:
                        raise ValueError(f"OSRM code: {data.get('code')}")
                else:
                    raise ValueError(f"HTTP {response.status_code}")
            except Exception as e:
                logger.warning("OSRM route failed for base %s: %s — using geodesic fallback", base_name, e)
                fb_d, fb_t, _, fb_g = _geodesic_fallback(lat, lon, [(base_lon, base_lat, base_name)], waypoint)
                distances.extend(fb_d)
                times.extend(fb_t)
                origins.append(base_name)
                geometries.extend(fb_g)

    if not distances:
        logger.warning("All routes failed, using geodesic fallback")
        return _geodesic_fallback(lat, lon, bases, waypoint)

    return distances, times, origins, geometries
