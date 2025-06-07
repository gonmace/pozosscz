import { Path } from "leaflet";
import { MarkerClusterGroup } from "leaflet.markercluster/dist/leaflet.markercluster";

declare global {
  interface Window {
    mcgLayerSupportGroup: MarkerClusterGroup;
  }
}

export interface MenuItem {
  name: string;
  link: string;
  icon?: string;
  protected: boolean;
}

export interface DataPrice {
  origins: string[];
  distances: number[];
  times: number[];
  paths: number[][][];
  path_saguapac: number[][][];
  origen: number;
  factor_zona: number;
  costo: number;
  chofer: number;
  utilidad: number;
  precio: number;
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
  id: number;
  name: string;
  phone: string;
  coordinates: number[];
  price: number;
  status: string;
  created_at: string;
}