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
import { iconCamion, iconRed, locateOptions } from "./utils/ObjectLeaflet";
import "leaflet-control-custom";
import "./types/leaflet-control-custom.d.ts";
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
import { fetchClients } from "./utils/getClients";
import "leaflet.markercluster";
import "leaflet.markercluster.layersupport";
import { LocateControl } from "leaflet.locatecontrol";
import "./utils/leaflet.locate.css";
import { cotizando } from "./utils/cotizando.ts";
import { extractCoordinates, guardarBaseCamion } from "./utils/base&camion.ts";

let marker: Marker;
let markerCamion: Marker;
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
  maxZoom: 20,
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

map.getContainer().style.cursor = "crosshair";

// Boton para ubicar el marcador en el mapa
const putMarker = document.getElementById("putMarker") as HTMLButtonElement;
putMarker.disabled = true;
const URLwhatsapp = document.getElementById("URLwhatsapp") as HTMLInputElement;
URLwhatsapp.addEventListener("input", (e) => {
  URLwhatsapp.value.length >= 28
    ? (putMarker.disabled = false)
    : (putMarker.disabled = true);
});

control
  .custom({
    position: "topright",
    content: `<div class="ml-18">
                <button id="cotiza" class="btn btn-secondary btn-sm sombra">
                  COTIZA
                </button>
              </div>`,
    events: {
      click: () => cotizando(marker),
    },
  })
  .addTo(map);

const botonCotiza = document.getElementById("cotiza") as HTMLButtonElement;
botonCotiza.disabled = true;

putMarker.onclick = () => {
  let latitud: number = 0,
    longitud: number = 0;
  try {
    if (URLwhatsapp.value.indexOf("%2C") != -1) {
      let ambos = URLwhatsapp.value.split("%2C");
      let izq = ambos[0].split("?q=");
      let der = ambos[1].split("&z=");
      latitud = parseFloat(izq[1]);
      longitud = parseFloat(der[0]);
    }
    if (URLwhatsapp.value.indexOf(",") != -1) {
      let ambos = URLwhatsapp.value.split(",");
      if (ambos.length == 2) {
        let izq = ambos[0].split("?q=");
        if (izq.length == 1) {
          latitud = parseFloat(ambos[0]);
        } else {
          latitud = parseFloat(izq[1]);
        }
        longitud = parseFloat(ambos[1]);
      }
      if (ambos.length == 3) {
        let izq = ambos[0].split("/@");
        latitud = parseFloat(izq[1]);
        longitud = parseFloat(ambos[1]);
      }
    }
    URLwhatsapp.value = "";
    if (marker) {
      map.removeLayer(marker);
    } else {
      botonCotiza.disabled = false;
    }
    map.flyTo([latitud, longitud], 16);
    marker = new Marker([latitud, longitud], {
      icon: iconRed,
    }).addTo(map);
  
    putMarker.disabled = true;
  } catch {
    alert("Algo salió mal");
    URLwhatsapp.value = "";
  }
};

const BaseMarker = document.getElementById("BaseMarker") as HTMLButtonElement;
const GuardarBaseMarker = document.getElementById("GuardarBaseMarker") as HTMLButtonElement;
let coordinates: [number, number] | null = null;

// Añadir base / camion al mapa
BaseMarker.addEventListener("click", () => {
  const coordinatesInput = document.getElementById("coordinates") as HTMLInputElement;
  coordinates = extractCoordinates(coordinatesInput.value);
  
  if (!coordinates) {
    createToast(
      "coordinates",
      "map",
      "Formato de coordenadas inválido. Use lat,lon o un link de Google Maps.",
      "top",
      "error"
    );
    return;
  }

  const [lat, lon] = coordinates;
  const latLng = new LatLng(lat, lon);
  
  if (markerCamion) {
    map.removeLayer(markerCamion);
  }
  
  markerCamion = new Marker(latLng, {
    icon: iconCamion,
  }).addTo(map);
  map.flyTo(latLng, 13);
  GuardarBaseMarker.disabled = false;
});

// Guardar base / camion en la DB
GuardarBaseMarker.disabled = true;
GuardarBaseMarker.addEventListener("click", async () => {
  const nameInput = document.getElementById("nameCamion") as HTMLInputElement;
  const coordinatesInput = document.getElementById("coordinates") as HTMLInputElement;
  const name = nameInput.value;
  try {
    if (coordinates) {
      await guardarBaseCamion(name, coordinates);
      createToast(
        "name",
        "map",
        "Base agregada exitosamente",
        "top",
        "success"
      );
      // Reset inputs and disable save button
      setTimeout(() => {
        location.reload();
      }, 2500);
    } else {
      createToast(
        "name",
        "map",
        "No se encontraron coordenadas para la base",
        "top",
        "error"
      );
    }
  } catch (error) {
    createToast(
      "name",
      "map",
      "Hubo un error al agregar la base",
      "top",
      "error"
    );
  }
});






// Funcion para ubicar el marcador en el mapa
function onMapClick(e: LeafletMouseEvent) {
  
  // Obtener el elemento nav
  const navElement = document.querySelector("nav");
  // Verificar si el clic ocurrió fuera del nav
  if (navElement && !navElement.contains(e.originalEvent.target as Node)) {
    if (marker) {
      map.removeLayer(marker);
    } else {
      botonCotiza.disabled = false;
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

// Control de localización del dispositivo
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
    botonCotiza.disabled = false;
  }
  // Añade un nuevo marcador en la ubicación encontrada
  marker = new Marker(e.latlng, {
    icon: iconRed,
  }).addTo(map);


  // Remove existing paths
  paths.forEach((path) => map.removeLayer(path));
  paths = [];
  
});

map.on("locationerror", function (e: ErrorEvent) {
  alert(e.message);
});

// Dibujar polígonos
var drawnItems = new FeatureGroup();
map.addLayer(drawnItems);

const drawControl = new Control.Draw({
  edit: {
    featureGroup: drawnItems,
  },
  draw: {
    polygon: {
      allowIntersection: true, // No permitir intersecciones
      showArea: true, // Mostrar área del polígono
      drawError: {
        color: "#e1e100", // Color de error
        message: "<strong>¡Oh no!</strong> no puedes dibujar eso!", // Mensaje de error
      },
      shapeOptions: {
        color: "#4e6afc",
      },
    },
    polyline: false, // Desactiva la opción de Polyline
    rectangle: false, // Desactiva la opción de Rectangle
    circle: false, // Desactiva la opción de Circle
    marker: false, // Desactiva la opción de Marker
    circlemarker: false, // Desactiva la opción de CircleMarker
  },
});

map.addControl(drawControl);


// Desactivar el click listener cuando comienza el dibujo
map.on(Draw.Event.DRAWSTART, function () {
  map.off("click", onMapClick);
});

map.on(Draw.Event.CREATED, function (event: LeafletEvent) {
  const layer = event.layer;
  drawnItems.clearLayers();
  drawnItems.addLayer(layer);
  updateTextareaWithCoordinates(layer);

  // Volver a activar el click listener
  map.on("click", onMapClick);
});

// Actualizar el textarea con las coordenadas del polígono
function updateTextareaWithCoordinates(layer: Layer) {
  if (layer instanceof Polygon) {
    const coordinates = layer.getLatLngs();
    // Aplanar las coordenadas del polígono
    const flatCoordinates = (coordinates[0] as LatLng[]).map((latLng) => [
      Number(latLng.lat.toFixed(6)),
      Number(latLng.lng.toFixed(6)),
    ]);

    // Convertir las coordenadas a formato JSON
    const coordinatesJSON = JSON.stringify(flatCoordinates);

    // Obtener el textarea y establecer su valor
    const coordinatesInput = document.getElementById(
      "polygon-coordinates"
    ) as HTMLTextAreaElement;
    coordinatesInput.value = coordinatesJSON;
    createToast(
      "polygon-coordinates",
      "map",
      "Las coordenadas del polígono han sido capturadas.",
      "top",
      "success"
    );
  } else {
    createToast(
      "polygon-coordinates",
      "map",
      "El tipo de capa no es un polígono.",
      "top",
      "error"
    );
  }
}

    // Dibujar pligonos
    const drawCordinates = document.getElementById("submit-coordinates") as HTMLButtonElement;
    const coordinatesInput = document.getElementById("polygon-coordinates") as HTMLTextAreaElement | null;
    drawCordinates.addEventListener("click", () => {
      if (!coordinatesInput) {
        createToast(
          "coordenadas",
          "map",
          "El área de texto para las coordenadas no se encontró.",
          "top",
          "error"
        );
        return;
      }
      try {
        const coordinates = JSON.parse(coordinatesInput.value);
        if (
          Array.isArray(coordinates) &&
          coordinates.every(
            (coord) => Array.isArray(coord) && coord.length === 2
          )
        ) {
          const latLngs = coordinates.map(
            (coord) => new LatLng(coord[0], coord[1])
          );
          const polygon = new Polygon(latLngs, { color: "blue" });
          drawnItems.addLayer(polygon);
          map.fitBounds(polygon.getBounds());
        } else {
          createToast(
            "coordenadas",
            "map",
            "Formato de coordenadas inválido. Asegúrese de que las coordenadas estén en el formato correcto.",
            "top",
            "error"
          );
        }
      } catch (error) {
        createToast(
          "coordenadas",
          "map",
          "Error al parsear las coordenadas. Asegúrese de que las coordenadas estén en el formato JSON correcto.",
          "top",
          "error"
        );
      }
    });

    // Guardar zona en la base de datos
    const savePolygon = document.getElementById("savePolygon") as HTMLFormElement;
    savePolygon.addEventListener("submit", (event: SubmitEvent): boolean => {
      event.preventDefault();

      const form = event.target as HTMLFormElement;
      const factorInput = document.getElementById("factor") as HTMLInputElement;
      let factorValue = factorInput.value.replace(",", ".");
      console.log(factorValue);

      if (isNaN(parseFloat(factorValue))) {
        createToast(
          "factor",
          "map",
          "Ingrese un valor numérico válido para el factor.",
          "top",
          "warning"
        );
        return false;
      }

      // Set the value back to the input in a valid format
      factorInput.value = factorValue;

      const formData = new FormData(form);

      fetch(form.action, {
        method: form.method,
        body: formData,
      })
        .then((response) => {
          if (response.ok) {
            createToast(
              "creaArea",
              "map",
              "Area agregada exitosamente",
              "top",
              "success"
            );
            setTimeout(() => {
              location.reload();
            }, 3000); // Retraso de 3 segundos
          } else {
            createToast(
              "creaArea",
              "map",
              "Hubo un error al agregar el área",
              "top",
              "error"
            );
          }
        })
        .catch((error) => {
          createToast(
            "creaArea",
            "map",
            "Hubo un error al agregar el área",
            "top",
            "error"
          );
        });

      return false;
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
      selectAllCheckbox: "Un/select all",
      children: [
        {
          label: " Factor por zona",
          selectAllCheckbox: true,
          children: polygonLayers,
        },
        {
          label: " Ejecutados",
          selectAllCheckbox: "Un/select all",
          collapsed: true,
          children: [
            {
              label: `<div class="puntos bg-precio300">&zwnj;</div>...300`,
              layer: groupEje[0],
            },
            {
              label: `<div class="puntos bg-precio350">&zwnj;</div>\xa0\xa0\xa0350`,
              layer: groupEje[1],
            },
            {
              label: `<div class="puntos bg-precio400">&zwnj;</div>\xa0\xa0\xa0400`,
              layer: groupEje[2],
            },
            {
              label: `<div class="puntos bg-precio450">&zwnj;</div>\xa0\xa0\xa0450`,
              layer: groupEje[3],
            },
            {
              label: `<div class="puntos bg-precio500">&zwnj;</div>\xa0\xa0\xa0500`,
              layer: groupEje[4],
            },
            {
              label: `<div class="puntos bg-precio600">&zwnj;</div>\xa0\xa0\xa0600`,
              layer: groupEje[5],
            },
            {
              label: `<div class="puntos bg-precio700">&zwnj;</div>\xa0\xa0\xa0700`,
              layer: groupEje[6],
            },
            {
              label: `<div class="puntos bg-precio800">&zwnj;</div>\xa0\xa0\xa0800`,
              layer: groupEje[7],
            },
            {
              label: `<div class="puntos bg-precio900">&zwnj;</div>\xa0\xa0\xa0900`,
              layer: groupEje[8],
            },
            {
              label: `<div class="puntos bg-precio1000">&zwnj;</div>\xa01000...`,
              layer: groupEje[9],
            },
            {
              label: `<div class="puntos bg-precioNegro">&zwnj;</div>\xa0\xa0L.N`,
              layer: groupEje[10],
            },
          ],
        },
        {
          label: " Cotizados",
          selectAllCheckbox: "Un/select all",
          collapsed: true,
          children: [
            { label: "Administrador", layer: groupCot[0] },
            { label: "Cliente Confirma", layer: groupCot[1] },
            { label: "Cliente Cancela", layer: groupCot[2] },
          ],
        },
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
