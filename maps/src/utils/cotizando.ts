import { Marker } from "leaflet";
import { DataPrice } from "../types/types";

function getCsrfToken(): string {
    const name = 'csrftoken';
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
        const c = cookie.trim();
        if (c.startsWith(name + '=')) {
            return decodeURIComponent(c.substring(name.length + 1));
        }
    }
    return '';
}

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
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfToken(),
            },
            body: JSON.stringify({
                lat: marker.getLatLng().lat.toFixed(6),
                lon: marker.getLatLng().lng.toFixed(6)
            })
        });
        if (!response.ok) {
            const body = await response.json().catch(() => ({}));
            data.error = body.error || `Error ${response.status}: servicio de rutas no disponible`;
            return data;
        }
        data = await response.json();

    } catch (error) {
        data.error = 'No se pudo conectar con el servidor. Intente nuevamente.';
    }
    return data;
}
