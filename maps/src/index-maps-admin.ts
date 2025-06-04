import "leaflet/dist/leaflet.css";
import "leaflet.locatecontrol/dist/L.Control.Locate.min.css";
import "../src/utils/leaflet.Control.Center.css";
import "leaflet-draw/dist/leaflet.draw.css";
import "leaflet.control.layers.tree/L.Control.Layers.Tree.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

import {
  Map,
  tileLayer,
  Marker,
  control,
  FeatureGroup,
  Control,
  Polygon,
  Draw,
  LatLng,
  Layer,
  markerClusterGroup,
} from "leaflet";
import "./utils/leaflet.Control.Center";
import { iconRed, locateOptions } from "./utils/ObjectLeaflet";
import "leaflet-control-custom";
import "leaflet-draw";
import "leaflet.control.layers.tree";

import type {
  LeafletMouseEvent,
  LocationEvent,
  ErrorEvent,
  LeafletEvent,
  Path,
} from "leaflet";
import type { Poligonos, Precios } from "./types/types";
import { createToast } from "./utils/toast";
import { postData } from "./utils/postCliente";
import { fetchClients } from "./utils/getClients";
import "leaflet.markercluster";
import "leaflet.markercluster.layersupport";

import { LocateControl } from "leaflet.locatecontrol";
import "./utils/leaflet.locate.css";

let marker: Marker;
let paths: Path[] = [];
const colorPath = ["red", "green", "orange", "cyan"];
const overlay = document.getElementById("overlay") as HTMLDivElement;

const colores = [
  "#B0B0B0",
  "#FF5733",
  "#286d31",
  "#3357FF",
  "#A633FF",
  "#FF8333",
  "#33FFD5",
  "#D5FF33",
  "#33A6FF",
  "#5733FF",
  "#787878",
  "#FF33A6",
];

const map = new Map("map", {
  center: [-17.784071, -63.180522],
  zoom: 12,
  zoomControl: false,
});

const osm = tileLayer("https://{s}.tile.osm.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution:
    '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

const esri = tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  {
    maxZoom: 19,
    attribution:
      "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
  }
);

const putMarker = document.getElementById("putMarker") as HTMLButtonElement;
putMarker.disabled = true;

// // Crear un objeto que contiene las capas base
// const baseMaps = {
//   OpenStreetMap: osm,
//   "Esri World Imagery": esri,
// };

map.getContainer().style.cursor = "crosshair";

// control
// .layers(baseMaps, {}, { position: "topleft", collapsed: false })
// .addTo(map);

control
  .custom({
    position: "bottomcenter",
    content: `<div>
            <button id="cotiza" class="btn btn-secondary btn-disabled sombra w-32">
            COTIZA
            </button>
          </div>`,
    classes: "pb-1",
    events: {
      click: () => {},
    },
  })
  .addTo(map);

const botonCotiza = document.getElementById("cotiza") as HTMLButtonElement;

function onMapClick(e: LeafletMouseEvent) {
  // Obtener el elemento nav
  const navElement = document.querySelector("nav");
  // Verificar si el clic ocurrió fuera del nav
  if (navElement && !navElement.contains(e.originalEvent.target as Node)) {
    if (marker) {
      map.removeLayer(marker);
    } else {
      botonCotiza.classList.remove("btn-disabled");
    }
    marker = new Marker(e.latlng, {
      icon: iconRed,
    }).addTo(map);
    console.log(
      "Lat: " + e.latlng.lat.toFixed(6) + ", Lon: " + e.latlng.lng.toFixed(6)
    );

    // Remove existing paths when placing a new marker
    paths.forEach((path) => map.removeLayer(path));
    paths = [];
  }
}
map.on("click", onMapClick);

// Control de localización locateOptions esta en el archivo UtilsLeaflet.astro
const locateControl = new LocateControl(locateOptions);
locateControl.addTo(map);

// Escucha el evento 'locationfound' para obtener lat y lon
map.on("locationfound", function (e: LocationEvent) {
  const lat = e.latlng.lat;
  const lon = e.latlng.lng;
  console.log("Lat: " + lat + ", Lon: " + lon);

  // Elimina el marcador anterior si existe
  if (marker) {
    map.removeLayer(marker);
  } else {
    botonCotiza.classList.remove("btn-disabled");
  }
  // Añade un nuevo marcador en la ubicación encontrada
  marker = new Marker(e.latlng, {
    icon: iconRed,
  }).addTo(map);

  // Remove existing paths
  paths.forEach((path) => map.removeLayer(path));
  paths = [];

  // Hacer zoom a la ubicación encontrada
  map.flyTo(e.latlng, 19);
});

map.on("locationerror", function (e: ErrorEvent) {
  alert(e.message);
});

async function fetchAreaFactor() {
  const areaFact = await fetch("/api/v1/areasfactor/")
    .then((r) => r.json())
    .then((data: Poligonos[]) => {
      return data;
    });
  return areaFact;
}

let polygonLayers: { label: string; layer: Polygon }[] = [];
let groupCot, groupEje;

async function initializeAreas() {
  try {
    const areaFact = await fetchAreaFactor();

    // Añadir todos los polígonos obtenidos desde la API al mapa
    areaFact.forEach((polygonData, index) => {
      const apiPolygonCoords = polygonData.polygon;
      const apiPolygonLatLngs = apiPolygonCoords.map(
        (coord) => new LatLng(coord[0], coord[1])
      );
      polygonLayers.push({
        label: `<span style="color: ${colores[index % colores.length]}">   ${
          polygonData.name
        } ${polygonData.factor}</span>`,
        layer: new Polygon(apiPolygonLatLngs, { color: colores[index] }),
      });
    });

    ({ groupEje, groupCot } = await fetchClients());

    var options = {
      spiderLegPolylineOptions: { weight: 0 }, // Lienas del spider
      // spiderfyOnMaxZoom: $("#spiderfyOnMaxZoom-select").val() === "true",
      spiderfyOnMaxZoom: true,
      zoomToBoundsOnClick: false,
      removeOutsideVisibleBounds: true,
      // document.getElementById("zoomToBoundsOnClick-select").value === "true",
      // showCoverageOnHover: document.getElementById("showCoverageOnHover-select").value === "true",
      showCoverageOnHover: true,
      disableClusteringAtZoom: 18,
      maxClusterRadius: 50,
      // maxClusterRadius: parseInt(document.getElementById("maxClusterRadius-select").value),
      spiderfyDistanceMultiplier: 1,
      chunkedLoading: true,
      chunkInterval: 100,
      // chunkProgress: updateProgressBar
      singleAddRemoveBufferDuration: 200,
    };

    var mcgLayerSupportGroup = markerClusterGroup.layerSupport(options);
    mcgLayerSupportGroup.addTo(map);

    mcgLayerSupportGroup.checkIn(groupCot);
    mcgLayerSupportGroup.checkIn(groupEje);
    
    groupEje.forEach((g) => {
      g.addTo(map);
    });

    // Añadir los polígonos al mapa
    polygonLayers.forEach((layer) => layer.layer.addTo(map));

    var baseTree = {
      label: "<strong>Capas Base</strong>",
      children: [
        { label: "OpenStreetMap", layer: osm },
        { label: "Esri World Imagery", layer: esri },
      ],
    };

    var overlayTree = {
      label: "<strong> Zonas / Clientes</strong>",
      selectAllCheckbox: 'Un/select all',
      children: [
        {
          label: " Factor por zona",
          selectAllCheckbox: true,
          children: polygonLayers,
        },
        {
          label: " Ejecutados",
          selectAllCheckbox: 'Un/select all',
          collapsed: true,
          children: [
          {label: `<div class="puntos bg-precio300">&zwnj;</div>...300`, layer: groupEje[0]},
          {label: `<div class="puntos bg-precio350">&zwnj;</div>\xa0\xa0\xa0350`, layer: groupEje[1]},
          {label: `<div class="puntos bg-precio400">&zwnj;</div>\xa0\xa0\xa0400`, layer: groupEje[2]},
          {label: `<div class="puntos bg-precio450">&zwnj;</div>\xa0\xa0\xa0450`, layer: groupEje[3]},
          {label: `<div class="puntos bg-precio500">&zwnj;</div>\xa0\xa0\xa0500`, layer: groupEje[4]},
          {label: `<div class="puntos bg-precio600">&zwnj;</div>\xa0\xa0\xa0600`, layer: groupEje[5]},
          {label: `<div class="puntos bg-precio700">&zwnj;</div>\xa0\xa0\xa0700`, layer: groupEje[6]},
          {label: `<div class="puntos bg-precio800">&zwnj;</div>\xa0\xa0\xa0800`, layer: groupEje[7]},
          {label: `<div class="puntos bg-precio900">&zwnj;</div>\xa0\xa0\xa0900`, layer: groupEje[8]},
          {label: `<div class="puntos bg-precio1000">&zwnj;</div>\xa01000...`, layer: groupEje[9]},
          {label: `<div class="puntos bg-precioNegro">&zwnj;</div>\xa0\xa0L.N`, layer: groupEje[10]},
          ],
        },
        {
          label: " Cotizados",
          selectAllCheckbox: 'Un/select all',
          collapsed: true,
          children: [
            {label: "Administrador" , layer: groupCot[0]},
            {label: "Cliente Confirma" , layer: groupCot[1]},
            {label: "Cliente Cancela" , layer: groupCot[2]},
          ],
        }
        
      ],
    };

    control.layers
    .tree(baseTree, overlayTree, {
      position: "bottomleft",
      collapsed: false,
    })
    .addTo(map);

  } catch (error) {
    console.error("Error al obtener las áreas:", error);
  }
}

// Inicializar las áreas cuando se carga el mapa
initializeAreas();
