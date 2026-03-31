import httpx
import logging
import polyline as polyline_codec
from typing import Tuple, List
from geopy.distance import geodesic

logger = logging.getLogger(__name__)

VALHALLA_URL = "https://valhalla1.openstreetmap.de/route"

# Fallback: distancia real en carretera vs línea recta
ROAD_FACTOR = 1.4
AVG_SPEED_KMH = 35


def _decode_shape(encoded: str) -> List[List[float]]:
    """Decode Valhalla encoded polyline (precision 6) to [[lat, lon], ...]."""
    return [[lat, lon] for lat, lon in polyline_codec.decode(encoded, precision=6)]


def _build_valhalla_locations(
    base_lon: float, base_lat: float,
    dest_lat: float, dest_lon: float,
    waypoint: Tuple[float, float] = None
) -> List[dict]:
    locations = [{"lon": base_lon, "lat": base_lat, "type": "break"}]
    if waypoint:
        locations.append({"lon": waypoint[1], "lat": waypoint[0], "type": "through"})
    locations.append({"lon": dest_lon, "lat": dest_lat, "type": "break"})
    return locations


def _geodesic_fallback(
    lat: float, lon: float,
    bases: List[Tuple[float, float, str]],
    waypoint: Tuple[float, float] = None
) -> Tuple[List[float], List[float], List[str], List[List[List[float]]]]:
    """Fallback con distancia geodésica cuando Valhalla no está disponible."""
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
    """Calculate distances and times. Uses Valhalla, falls back to geodesic."""
    distances, times, origins, geometries = [], [], [], []

    async with httpx.AsyncClient(timeout=8.0) as client:
        for base_lon, base_lat, base_name in bases:
            locations = _build_valhalla_locations(base_lon, base_lat, lat, lon, waypoint)
            body = {
                "locations": locations,
                "costing": "auto",
                "shape_format": "polyline6",
            }
            try:
                response = await client.post(VALHALLA_URL, json=body)
                if response.status_code == 200:
                    data = response.json()
                    summary = data["trip"]["summary"]
                    shape = data["trip"]["legs"][0]["shape"]
                    distances.append(summary["length"] * 1000)   # km → m
                    times.append(summary["time"])                 # seconds
                    origins.append(base_name)
                    geometries.append(_decode_shape(shape))
            except Exception as e:
                logger.warning("Valhalla route failed for base %s: %s", base_name, e)

    if not distances:
        logger.warning("Valhalla unavailable, using geodesic fallback")
        return _geodesic_fallback(lat, lon, bases, waypoint)

    return distances, times, origins, geometries
