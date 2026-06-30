import { Path } from "leaflet";
// import { MarkerClusterGroup } from "leaflet.markercluster/dist/leaflet.markercluster";

// declare global {
//   interface Window {
//     mcgLayerSupportGroup: MarkerClusterGroup;
//   }
// }

export interface MenuItem {
  name: string;
  link: string;
  icon?: string;
  protected: boolean;
}

export interface DataPrice {
  error: any;
  origins: string[];
  distances: number[];
  times: number[];
  paths: number[][][];
  distance_saguapac: number[];
  time_saguapac: number[];
  origin_saguapac: string[];
  path_saguapac: number[][][];
  costo_combustible: number;
  costo_combustible_ida: number;
  costo_combustible_retorno: number;
  costo_combustible_trabajo: number;
  costos_combustible_bases: number[];
  utilidades_bases: number[];
  chofer_bases: number[];
  otros_bases: number[];
  precios_bases: number[];
  costo_otros: number;
  detalle_otros: { mantenimiento: number; saguapac: number; retorno_saguapac: number };
  costo_adicional_retorno: number;
  utilidad: number;
  factor_zona: number;
  chofer: number;
  precio: number;
  precio_sin_zona: number;
  origen: number;
  distance_scz: number;
  distancia_maxima_cotizar: number;
  tiempo_trabajo_min: number;
  tiempo_real_min: number;
  tiempo_cobro_min: number;
  factor_camion: number;
  factor_cargado: number;
  factor_global: number;
  grupos?: { bases: number; clientes: number; camiones: number };
  origins_status?: (string | null)[];
}

export interface RutasResult {
  paths: Path[][];
  distances: number[];
  times: number[];
  origins: string[];
  path_saguapac: Path[][];
  distance_saguapac: number[];
  time_saguapac: number[];
  origin_saguapac: string[];
}

export interface Poligonos {
  id: number;
  name: string;
  factor: number;
  polygon: number[][];
}

export interface Clientes {
  id:         number;
  tel1:       string;
  tel2:       string;
  name:       string;
  address:    string;
  cod:        string;
  cost:       number;
  service:    string;
  lat:        number;
  lon:        number;
  status:     string;
  user:       string;
  created_at: Date;
  updated_at: Date;
}