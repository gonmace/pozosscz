// import { polyline } from "leaflet";
// import type { Marker, Path } from "leaflet";
// import { fetchOSRM } from "../Map/fetchOSRM";

import { Marker, Path } from "leaflet";

interface RutasResult {
    paths: Path[];
    distancia: number[];
    tiempo: number[];
    origen: string[];
  }

export const cotizando = async (marker: Marker): Promise<RutasResult> => {
    const colorPath = ['red', 'blue', 'green', 'cyan'];
    const paths: Path[] = [];
    const distancia: number[] = [];
    const tiempo: number[] = [];
    let origen: string[] = [];

    return {
        paths,
        distancia,
        tiempo,
        origen
    };
}
