// import { polyline } from "leaflet";
// import type { Marker, Path } from "leaflet";
// import { fetchOSRM } from "../Map/fetchOSRM";

import { Marker, Path } from "leaflet";

interface RutasResult {
    paths: Path[][];
    distances: number[];
    times: number[];
    origins: string[];
    path_saguapac: Path[][];
    distance_saguapac: number[];
    time_saguapac: number[];
    origin_saguapac: string[];
  }

export const cotizando = async (marker: Marker): Promise<RutasResult> => {
    let data: RutasResult = {
        paths: [],
        distances: [],
        times: [],
        origins: [],
        path_saguapac: [],
        distance_saguapac: [],
        time_saguapac: [],
        origin_saguapac: []
    };

    try {
        const response = await fetch(`/api/v1/contratar/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                lat: marker.getLatLng().lat.toFixed(6),
                lon: marker.getLatLng().lng.toFixed(6)
            })
        });
        if (!response.ok) {
            throw new Error('Failed to fetch routes');
        }
        data = await response.json();
        
    } catch (error) {
        console.error('Error fetching routes:', error);
    }
    return data;
}
