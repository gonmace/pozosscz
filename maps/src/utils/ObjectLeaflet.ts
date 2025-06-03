import { Icon } from "leaflet";
export const iconRed = new Icon({
  iconUrl: "/static/img/leaflet/marker-red.svg",
  iconRetinaUrl: "/static/img/leaflet/marker-red.svg",
  iconSize: [26, 42],
  iconAnchor: [13, 42],
  popupAnchor: [-3, -76],
  shadowUrl: "/static/img/leaflet/marker-shadow.png",
  shadowRetinaUrl: "/static/img/leaflet/marker-shadow.png",
  shadowSize: [68, 50],
  shadowAnchor: [22, 49],
});

import "leaflet.locatecontrol"; // Import plugin
// Añadir el control de localización al mapa usando control.locate con opciones
export const locateOptions = {
  keepCurrentZoomLevel: true,
  drawCircle: false,
  drawMarker: false,
  showPopup: false,
  // Opción 1: Usando clases CSS personalizadas
  icon: 'leaflet-control-locate-custom',
  iconLoading: 'leaflet-control-locate-loading',
  // Opción 2: Usando una imagen personalizada
  /*
  icon: 'custom-locate-icon',
  iconElementTag: 'div',
  */
  strings: {
    title: "Muestrame donde estoy",
    metersUnit: "meters",
    feetUnit: "feet",
    popup: "You are within {distance} {unit} from this point",
    outsideMapBoundsMsg: "You seem to be outside the boundaries of the map",
  },
};
