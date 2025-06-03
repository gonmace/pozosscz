export interface MenuItem {
  name: string;
  link: string;
  icon?: string;
  protected: boolean;
}

export interface Precios {
  id?: number;
  p_km: number;
  p_base: number;
  p_tiempo: number;
  p_factor: number;
}

export interface Poligonos {
  id:      number;
  name:    string;
  factor:  number;
  polygon: [number, number][];
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