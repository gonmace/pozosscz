import type { Marker } from "leaflet";

// Verificar si el punto se encuentra dentro un poligono
export function inscrito(marker:Marker, polygon: Array<number[]>) {
  let x = marker.getLatLng().lat,
    y = marker.getLatLng().lng;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    let xi = polygon[i][0],
      yi = polygon[i][1];
    let xj = polygon[j][0],
      yj = polygon[j][1];
    let intersect =
      yi > y != yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) {
      inside = !inside;
    }
  }
  return inside;
}

// Función modificada para determinar en cuál de los polígonos se encuentra el punto
export function poligonoInscrito(marker: Marker, poligonos: [number, number][][]) {
  for (let i = 0; i < poligonos.length; i++) {
    if (inscrito(marker, poligonos[i])) {
      return i; // Devuelve el índice del polígono en el que se encuentra el punto
    }
  }
  return -1; // Si el punto no está inscrito en ninguno de los polígonos, se devuelve -1
}
