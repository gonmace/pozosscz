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
  costo: number;
  costo_adicional_retorno: number;
  utilidad: number;
  factor_zona: number;
  chofer: number;
  precio: number;
  origen: number;
  distance_scz: number;
  distancia_maxima_cotizar: number;
  factor_global: number;
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