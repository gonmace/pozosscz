import { Marker } from "leaflet";
import { DataPrice } from "../types/types";

export const cotizando = async (marker: Marker): Promise<DataPrice> => {
    let data: DataPrice = {
        error: null,
        distances: [],
        times: [],
        origins: [],
        paths: [],
        distance_saguapac: [],
        time_saguapac: [],
        origin_saguapac: [],
        path_saguapac: [],
        costo: 0,
        costo_adicional_retorno: 0,
        utilidad: 0,
        factor_zona: 0,
        chofer: 0,
        precio: 0,
        origen: 0,
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
