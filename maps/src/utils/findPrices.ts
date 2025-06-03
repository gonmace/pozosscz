import { Path, Marker, polyline } from "leaflet";
import { inscrito, poligonoInscrito } from "./inscrito";
import { scz } from "../data/zonas";
import { urubu_porongo_waypoint, torno_waypoint } from "../data/waypoints";
import { fetchOSRM, bases } from "./fetchOSRM";

interface RutasResult {
  paths: Path[];
  distancias: number[];
  tiempos: number[];
  origenes: string[];
}

export async function findRoutes(marker: Marker, opacity: number): Promise<RutasResult> {
  if (inscrito(marker, scz) === true) {
    const colorPath = ["red", "green", "orange", "cyan"];

    let paths: Path[] = [];
    let distancias: number[] = [];
    let tiempos: number[] = [];
    let origenes: string[] = [];

    const poligonos_waypoints = [urubu_porongo_waypoint, torno_waypoint];
    const indicePoligono = poligonoInscrito(marker, poligonos_waypoints);
  
    try {
      await fetchOSRM(marker, indicePoligono) //Devuelve distancia,tiempo,origen y ruta ademas considera waypoints obligatorios por el indice
      .then(
        (r) => {            
            r.forEach((r, i) => {
                if (r != null) {
                  let ruta = r.routes[0].geometry.coordinates.map((coord: any[]) => [
                    coord[1],
                    coord[0],
                  ]);
                  paths[i] = polyline(ruta, {
                    color: colorPath[i],
                    opacity: opacity
                  })
                  distancias[i] = parseFloat((r.routes[0].distance / 1000).toFixed(2)); //kilometros;
                  tiempos[i] = Math.round(1.25 * r.routes[0].duration / 60); //minutos;
                  origenes[i] = bases[i][2];
                } else {
                  alert("Algo pasó!!!");
                }
              });
            
        });
        return { paths, distancias, tiempos, origenes };
    } catch (error) {
      console.error("Error fetching paths:", error);
      // Retornar un objeto vacío en caso de error para mantener el tipo consistente
      return { paths: [], distancias: [], tiempos: [], origenes: [] };
    }
    
  }
  
  // Add a return statement here
  return { paths: [], distancias: [], tiempos: [], origenes: [] };
}

import type { Poligonos, Precios } from "../types/types";

let preciosSCZ: Precios = {
  p_km: 7,
  p_base: 250,
  p_tiempo: 5,
  p_factor: 1.0,
};

export async function getPrices() {
  try {
    const response = await fetch("http://127.0.0.1:8000/api/v1/precios/");
    if (!response.ok) {
      throw new Error(
        `La respuesta de la red no fue exitosa: ${response.statusText}`
      );
    }
    const data = await response.json();

    if (Array.isArray(data) && data.length > 0) {
      preciosSCZ = data[0];
    } else {
      throw new Error(
        "Formato de datos inesperado: los datos no son un array o están vacíos."
      );
    }
  } catch (error) {
    console.error(
      "Error al obtener los precios, se utilizarán los valores predeterminados.",
      error
    );
  }

  return preciosSCZ;
}


let poligonos: Poligonos[] = [];

export async function getPoligons() {
    try {
        const response = await fetch("http://localhost:8000/api/v1/areasfactor/");
        if (!response.ok) {
            throw new Error(
                `La respuesta de la red no fue exitosa: ${response.statusText}`
            );
        }
        poligonos = await response.json();
        return poligonos;
    } 
    catch (error) { 
      console.error("Error al obtener los polígonos:", error);
      throw error;
    };
}
