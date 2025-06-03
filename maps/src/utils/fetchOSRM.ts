/**
 * Realiza una solicitud a OSRM para obtener las rutas desde un marcador hasta una serie de puntos de referencia.
 * @param marker El marcador desde el cual se calcularán las rutas.
 * @param indice El índice que indica qué punto de referencia utilizar para calcular la ruta.
 * @returns Una promesa que se resuelve en un array de resultados de ruta de OSRM.
 */
import type OSRM from "osrm";
import type { Marker } from "leaflet";

type Waypoint = [number, number];
type Base = [Waypoint[0], Waypoint[1], string];

const saguapac: Base = [-17.74620847, -63.12672898, "saguapac"];
const garaje: Base = [-17.78595813, -63.12451243, "garaje"];
export const bases: Base[] = [saguapac, garaje];

const waypointPuenteUrubo: Waypoint = [-17.7498515, -63.2154661];
const waypoinPuenteTorno: Waypoint = [-17.988987, -63.389942];

export function fetchOSRM(marker: Marker, indice: number) {
  const request = async (
    lat: number,
    lon: number,
    marker: Marker,
  ) => {

    let waypoint: string;
    if (indice === 0) {
      waypoint = `;${waypointPuenteUrubo[1]},${waypointPuenteUrubo[0]};`;
    } else if (indice === 1) {
      waypoint = `;${waypoinPuenteTorno[1]},${waypoinPuenteTorno[0]};`;
    } else {
      waypoint = ";";
    }

    const url = `http://router.project-osrm.org/route/v1/driving/${lon},${lat}${waypoint}${marker.getLatLng().lng},${marker.getLatLng().lat};${saguapac[1]},${saguapac[0]}?steps=true&geometries=geojson&overview=full&continue_straight=true`;

    try {
      const resp = await fetch(url);
      const data: OSRM.RouteResults = await resp.json();
      return data;
    } catch (error) {
      console.error("Error fetching OSRM data:", error);
      // TODO
    }
  };

  const promises = bases.map((o) => request(o[0], o[1], marker));
  const filteredPromises = promises.filter((p) => p !== null);
  return Promise.all(filteredPromises);
}


