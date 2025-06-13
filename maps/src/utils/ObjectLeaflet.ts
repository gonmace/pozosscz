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
  keepCurrentZoomLevel: false,
  drawCircle: false,
  drawMarker: false,
  showPopup: false,
  flyTo: true,
  icon: 'leaflet-control-locate-custom',
  iconLoading: 'leaflet-control-locate-loading',
  strings: {
    title: "Muestrame donde estoy",
    metersUnit: "meters",
    feetUnit: "feet",
    popup: "You are within {distance} {unit} from this point",
    outsideMapBoundsMsg: "You seem to be outside the boundaries of the map",
  },
};

export const iconCamion = new Icon({
  iconUrl: "/static/img/leaflet/marker-camion-filled.svg",
  iconRetinaUrl: "/static/img/leaflet/marker-camion-filled.svg",
  iconSize: [26, 42],
  iconAnchor: [13, 42],
  popupAnchor: [-3, -76],
  shadowUrl: "/static/img/leaflet/marker-shadow.png",
  shadowRetinaUrl: "/static/img/leaflet/marker-shadow.png",
  shadowSize: [68, 50],
  shadowAnchor: [22, 49],
});

