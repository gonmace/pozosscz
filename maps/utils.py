import httpx  # en lugar de requests
from typing import Tuple, List
import json

async def calculate_route_metrics(lat: float, lon: float, bases: List[Tuple[float, float, str]], waypoint: Tuple[float, float] = None) -> Tuple[List[float], List[float], List[str], List[List[List[float]]]]:
    """Calculate distances and times from service bases to target location."""
    distances = []
    times = []
    origins = []
    geometries = []
    
    async with httpx.AsyncClient() as client:
        for base_lat, base_lon, base_name in bases:
            # Construct URL with waypoint if provided
            url_parts = [f"{base_lat},{base_lon}"]
            if waypoint:
                url_parts.append(f"{waypoint[1]},{waypoint[0]}")
            url_parts.append(f"{lon},{lat}")
            
            url = f"http://router.project-osrm.org/route/v1/driving/{';'.join(url_parts)}?overview=full&geometries=geojson"
            
            try:
                response = await client.get(url)
                if response.status_code == 200:
                    data = response.json()
                    if data["code"] == "Ok" and len(data["routes"]) > 0:
                        route = data["routes"][0]
                        distances.append(route["distance"])  # Distance in meters
                        times.append(route["duration"])  # Duration in seconds
                        origins.append(base_name)
                        # Invertir de lon,lat a lat,lon
                        coords = route["geometry"]["coordinates"]
                        inverted_coords = [[lat, lon] for lon, lat in coords]
                        geometries.append(inverted_coords)
            except Exception as e:
                print(f"Error calculating route: {e}")


    return distances, times, origins, geometries 