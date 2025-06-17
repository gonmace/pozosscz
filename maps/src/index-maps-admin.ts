// Remove jQuery imports
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
  LayerGroup,
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
import type { DataPrice, Poligonos } from "./types/types";
import { createToast } from "./utils/toast";
import { fetchClients } from "./utils/getClients";
import "leaflet.markercluster";
import "leaflet.markercluster.layersupport";
import { LocateControl } from "leaflet.locatecontrol";
import "./utils/leaflet.locate.css";
import { cotizando } from "./utils/cotizando.ts";
import {
  deleteTruckMarker,
  extractCoordinates,
  guardarBaseCamion,
  updateTruckMarkers,
} from "./utils/base&camion.ts";
import { modalPrecio } from "./utils/modalPrecio.ts";

import "./utils/SliderControl";
import { initializeSearchModal } from "./utils/findClients";
import { tableModal } from "./utils/tableModel";
import { findClientsInPolygon, parsePolygonCoordinates, fetchAllClients } from "./utils/findClientsInPolygon";

let marker: Marker;
let markerCamion: Marker;
let paths: Path[] = [];
let dataPrice: DataPrice;
const colorPath = ["#FF8444", "#286d31", "#3357FF", "#A633FF"];
const overlay = document.getElementById("overlay") as HTMLDivElement;

// Store truck markers with their IDs
const truckMarkers: Record<string, Marker> = {};

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

// Restore map view from localStorage if available
const savedView = localStorage.getItem("mapView");
if (savedView) {
  const { center, zoom } = JSON.parse(savedView);
  map.setView(center, zoom);
}

// Save map view to localStorage when it changes
map.on("moveend", () => {
  const center = map.getCenter();
  const zoom = map.getZoom();
  localStorage.setItem(
    "mapView",
    JSON.stringify({
      center: [center.lat, center.lng],
      zoom,
    })
  );
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
  URLwhatsapp.value.length >= 20
    ? (putMarker.disabled = false)
    : (putMarker.disabled = true);
});

const cotiza = control.custom({
  position: "bottomright",
  content: `<div class="ml-18 mb-9 sm:mb-1">
                <button id="cotiza" class="btn btn-secondary btn-sm sombra">
                  COTIZA
                </button>
              </div>`,
  events: {
    click: async () => {
      overlay.classList.remove("invisible");
      dataPrice = await cotizando(marker);
      overlay.classList.add("invisible");
      modalPrecio(dataPrice, colorPath, marker, map);
    },
  },
});
cotiza.addTo(map);

const botonCotiza = document.getElementById("cotiza") as HTMLButtonElement;
botonCotiza.disabled = true;

putMarker.onclick = () => {
  let latitud: number = 0, longitud: number = 0;
  const mensaje = URLwhatsapp.value;
  let encontrado = false;

  try {
    // 1. Coordenadas directas: -17.77,-63.18 o similares
    let match = mensaje.match(/(-?\d+\.\d+)[,\s]+(-?\d+\.\d+)/);
    if (match) {
      latitud = parseFloat(match[1]);
      longitud = parseFloat(match[2]);
      encontrado = true;
    }

    // 2. Enlace con q= (ej: maps.google.com/?q=-17.77,-63.18)
    if (!encontrado) {
      match = mensaje.match(/q=(?:\(|%28)?(-?\d+\.\d+)[,%2C\s]+(-?\d+\.\d+)(?:\)|%29)?/);
      if (match) {
        latitud = parseFloat(match[1]);
        longitud = parseFloat(match[2]);
        encontrado = true;
      }
    }

    // 3. Enlace con @lat,lon
    if (!encontrado) {
      match = mensaje.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (match) {
        latitud = parseFloat(match[1]);
        longitud = parseFloat(match[2]);
        encontrado = true;
      }
    }

    // 4. Enlace con !3d<lat>!4d<lon>
    if (!encontrado) {
      match = mensaje.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
      if (match) {
        latitud = parseFloat(match[1]);
        longitud = parseFloat(match[2]);
        encontrado = true;
      }
    }

    // 5. Coordenadas tipo shortlink ya resuelto (maps.app.goo.gl debe estar resuelto antes en backend o no se podrá acceder desde el navegador por CORS)
    // Aquí solo intentamos detectar coordenadas después de redirección
    if (!encontrado && mensaje.includes("maps.app.goo.gl")) {
      alert("Shortlinks de maps.app.goo.gl no es posible resolver el link.");
      return;
    }

    if (!encontrado) {
      alert("No se encontraron coordenadas válidas.");
      return;
    }

    // Reiniciar campo
    URLwhatsapp.value = "";

    // Mostrar marcador
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
  } catch (err) {
    alert("Algo salió mal al intentar extraer las coordenadas.");
    console.error(err);
    URLwhatsapp.value = "";
  }
};

const BaseMarker = document.getElementById("BaseMarker") as HTMLButtonElement;
const GuardarBaseMarker = document.getElementById(
  "GuardarBaseMarker"
) as HTMLButtonElement;
let coordinates: [number, number] | null = null;

// Añadir base / camion al mapa
BaseMarker.addEventListener("click", () => {
  const coordinatesInput = document.getElementById(
    "coordinates"
  ) as HTMLInputElement;
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
  const name = nameInput.value;
  if (name.length < 3) {
    createToast(
      "name",
      "map",
      "El nombre debe tener al menos 3 caracteres",
      "top",
      "error"
    );
    return;
  }
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

// Manejar clicks en los botones locate-camion
document.querySelectorAll(".locate-camion").forEach((button) => {
  button.addEventListener("click", (e) => {
    const row = (e.target as HTMLElement).closest("tr");
    if (row) {
      const coordsInput = row.querySelector(
        ".camion-coords"
      ) as HTMLInputElement;
      if (coordsInput && coordsInput.value) {
        try {
          const coords = JSON.parse(coordsInput.value) as [number, number];
          map.flyTo(coords, 12);
        } catch (error) {
          console.error("Error parsing coordinates:", error);
        }
      }
    }
  });
});

document.querySelectorAll(".checkbox-camion").forEach((checkbox) => {
  checkbox.addEventListener("change", (e) => {
    const row = (e.target as HTMLElement).closest("tr");
    if (row) {
      const checkbox = row.querySelector(
        ".checkbox-camion"
      ) as HTMLInputElement;
      if (checkbox) {
        const camionId = checkbox.dataset.camionId || "";
        const checked = checkbox.checked;
        try {
          updateTruckMarkers(camionId, checked);
        } catch (error) {
          createToast(
            "camion",
            "map",
            "Hubo un error al actualizar el camion",
            "top",
            "error"
          );
        }
        // Update marker visibility
        const marker = truckMarkers[camionId];
        if (marker) {
          if (checked) {
            marker.addTo(map);
          } else {
            marker.removeFrom(map);
          }
        }
      }
    }
  });
});

document.querySelectorAll(".delete-camion").forEach((button) => {
  button.addEventListener("click", async (e) => {
    const row = (e.target as HTMLElement).closest("tr");
    if (row) {
      const camionId = row.querySelector(".camion-id") as HTMLInputElement;
      const camionName = row.querySelector("td")?.textContent || "este camión";

      if (camionId && camionId.value) {
        // Show confirmation toast
        const confirmDelete = confirm(
          `¿Está seguro que desea eliminar ${camionName}?`
        );

        if (confirmDelete) {
          try {
            await deleteTruckMarker(camionId.value);
            createToast(
              "camion",
              "map",
              "Camion eliminado exitosamente",
              "top",
              "success"
            );
            setTimeout(() => {
              location.reload();
            }, 2500);
          } catch (error) {
            createToast(
              "camion",
              "map",
              "Hubo un error al eliminar el camion",
              "top",
              "error"
            );
          }
        }
      }
    }
  });
});

// Funcion para ubicar el marcador en el mapa
function onMapClick(e: LeafletMouseEvent) {
  // Obtener el elemento nav y el contenedor del slider
  const navElement = document.querySelector("nav");
  const sliderContainer = document.querySelector(".leaflet-top.leaflet-right");
  // Verificar si el clic ocurrió fuera del nav y del slider
  if (
    navElement &&
    !navElement.contains(e.originalEvent.target as Node) &&
    sliderContainer &&
    !sliderContainer.contains(e.originalEvent.target as Node)
  ) {
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
const drawCordinates = document.getElementById(
  "submit-coordinates"
) as HTMLButtonElement;
const findClientsButton = document.getElementById(
  "find-clients"
) as HTMLButtonElement;
const coordinatesInput = document.getElementById(
  "polygon-coordinates"
) as HTMLTextAreaElement | null;

// Enable/disable find clients button based on polygon coordinates
coordinatesInput?.addEventListener("input", () => {
  if (coordinatesInput && coordinatesInput.value.trim()) {
    const coordinates = parsePolygonCoordinates(coordinatesInput.value);
    findClientsButton.disabled = !coordinates;
  } else {
    findClientsButton.disabled = true;
  }
});

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
      coordinates.every((coord) => Array.isArray(coord) && coord.length === 2)
    ) {
      const latLngs = coordinates.map(
        (coord) => new LatLng(coord[0], coord[1])
      );
      const polygon = new Polygon(latLngs, { color: "blue" });
      drawnItems.addLayer(polygon);
      map.fitBounds(polygon.getBounds());
      findClientsButton.disabled = false;
    } else {
      createToast(
        "coordenadas",
        "map",
        "Formato de coordenadas inválido. Asegúrese de que las coordenadas estén en el formato correcto.",
        "top",
        "error"
      );
      findClientsButton.disabled = true;
    }
  } catch (error) {
    createToast(
      "coordenadas",
      "map",
      "Error al parsear las coordenadas. Asegúrese de que las coordenadas estén en el formato JSON correcto.",
      "top",
      "error"
    );
    findClientsButton.disabled = true;
  }
});

// Find clients in polygon
findClientsButton.addEventListener("click", async () => {
  if (!coordinatesInput || !coordinatesInput.value.trim()) {
    createToast(
      "clientes",
      "map",
      "No hay coordenadas de polígono para buscar clientes.",
      "top",
      "error"
    );
    return;
  }

  const coordinates = parsePolygonCoordinates(coordinatesInput.value);
  if (!coordinates) {
    createToast(
      "clientes",
      "map",
      "Formato de coordenadas inválido.",
      "top",
      "error"
    );
    return;
  }

  // Show loading state
  findClientsButton.disabled = true;
  findClientsButton.innerHTML = '<span class="loading loading-spinner loading-sm"></span>';

  try {
    // Fetch all clients from API
    const clients = await fetchAllClients();
    
    // Find clients in polygon
    const clientsInPolygon = findClientsInPolygon(clients, coordinates);

    // Update UI with results
    const modal = document.getElementById("client-results-modal") as HTMLDialogElement;
    const modalClientCount = document.getElementById("modal-client-count");
    const modalClientList = document.getElementById("modal-client-list");

    if (modal && modalClientCount && modalClientList) {
      modalClientCount.textContent = clientsInPolygon.length.toString();
      
      // Clear previous results
      modalClientList.innerHTML = "";
      
      // Add new results
      clientsInPolygon.forEach(client => {
        const clientItem = document.createElement("div");
        clientItem.className = "text-sm p-2 hover:bg-base-200 border-b border-base-300";
        clientItem.innerHTML = `
          <div class="font-medium">${client.name || 'Sin nombre'}</div>
          <div class="text-xs text-gray-400">${client.address || 'Sin dirección'}</div>
          <div class="text-xs text-gray-300">
            <span class="font-medium">Código:</span> ${client.cod || 'N/A'} | 
            <span class="font-medium">Costo:</span> ${client.cost || 'N/A'} | 
            <span class="font-medium">Servicio:</span> ${client.service || 'N/A'}
          </div>
          <div class="text-xs text-gray-400">
            <span class="font-medium">Tel:</span> ${client.tel1 || 'N/A'} ${client.tel2 ? `| ${client.tel2}` : ''}
          </div>
          <div class="text-xs text-gray-400">
            <span class="font-medium">Coords:</span> ${client.lat.toFixed(6)}, ${client.lon.toFixed(6)}
          </div>
        `;
        modalClientList.appendChild(clientItem);
      });

      // Show modal
      modal.showModal();

      // Handle export to CSV
      const exportButton = document.getElementById("export-csv");
      if (exportButton) {
        exportButton.onclick = () => {
          const csvContent = [
            // CSV Header
            ['Nombre', 'Teléfono', 'Precio', 'Dirección', 'Fecha'].join(','),
            // CSV Data
            ...clientsInPolygon.map(client => [
              `"${(client.name || '').replace(/"/g, '""')}"`,
              `"${(client.tel1 || '').replace(/"/g, '""')}"`,
              client.cost || '',
              `"${(client.address || '').replace(/"/g, '""')}"`,
              client.created_at ? new Date(client.created_at).toLocaleDateString() : ''
            ].join(','))
          ].join('\n');

          // Create and download file
          const blob = new Blob([`\ufeff${csvContent}`], { type: 'text/csv;charset=utf-8;' });
          const link = document.createElement('a');
          const url = URL.createObjectURL(blob);
          link.setAttribute('href', url);
          link.setAttribute('download', `clientes_${new Date().toISOString().split('T')[0]}.csv`);
          link.style.visibility = 'hidden';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        };
      }

      // Handle close button
      const closeButton = document.getElementById("close-client-modal");
      if (closeButton) {
        closeButton.onclick = () => {
          modal.close();
        };
      }

      createToast(
        "clientes",
        "map",
        `Se encontraron ${clientsInPolygon.length} clientes en el polígono.`,
        "top",
        "success"
      );
    }
  } catch (error) {
    console.error('Error fetching clients:', error);
    createToast(
      "clientes",
      "map",
      "Error al buscar clientes. Por favor, intente nuevamente.",
      "top",
      "error"
    );
  } finally {
    // Reset button state
    findClientsButton.disabled = false;
    findClientsButton.textContent = "Clientes";
  }
});

// Guardar zona en la base de datos
const savePolygon = document.getElementById("savePolygon") as HTMLFormElement;
savePolygon.addEventListener("submit", (event: SubmitEvent): boolean => {
  event.preventDefault();

  const form = event.target as HTMLFormElement;
  const factorInput = document.getElementById("factor") as HTMLInputElement;
  let factorValue = factorInput.value.replace(",", ".");

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
      spiderLegPolylineOptions: { weight: 0 },
      spiderfyOnMaxZoom: true,
      zoomToBoundsOnClick: false,
      removeOutsideVisibleBounds: true,
      showCoverageOnHover: true,
      disableClusteringAtZoom: 18,
      maxClusterRadius: 50,
      spiderfyDistanceMultiplier: 1,
      chunkedLoading: true,
      chunkInterval: 100,
      singleAddRemoveBufferDuration: 200,
    };

    var mcgLayerSupportGroup = markerClusterGroup.layerSupport(options);
    mcgLayerSupportGroup.addTo(map);

    mcgLayerSupportGroup.checkIn(groupCot);
    mcgLayerSupportGroup.checkIn(groupEje);

    groupEje.forEach((g) => {
      g.addTo(map);
    });

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

    // SLIDER
    const grupoEjecutados = groupEje.flatMap((group) => group.getLayers());
    const grupoCotizados = groupCot.flatMap((group) => group.getLayers());
    const allLayers = [...grupoEjecutados, ...grupoCotizados];

    let lg = new LayerGroup(allLayers);

    const sliderControl = control.sliderControl({
      position: "topright",
      layer: lg,
      timeAttribute: "time",
      isEpoch: false,
      startTimeIdx: 0,
      timeStrLength: 19,
      maxValue: -1,
      minValue: 0,
      showAllOnStart: true,
      alwaysShowDate: true,
      range: true,
    });

    map.addControl(sliderControl);
    sliderControl.startSlider();
  } catch (error) {
    console.error("Error al obtener las áreas:", error);
  }

  const buscarCliente = control.custom({
    position: "topright",
    content: `<div class="ml-18 mb-9 sm:mb-1">
  <button id="buscarCliente" class="btn btn-accent btn-sm sombra flex items-center gap-2">
    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 sombra" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  </button>
</div>`,
    events: {
      click: () => {
        initializeSearchModal(map);
      },
    },
  });
  buscarCliente.addTo(map);

  const tableClientes = control.custom({
    position: "topright",
    content: `<div class="ml-18 mb-9 sm:mb-1">
      <button id="tableClientes" class="btn btn-accent btn-sm sombra flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 sombra" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      </button>
    </div>`,
    events: {
      click: () => {
        tableModal(map);
      },
    },
  });
  tableClientes.addTo(map);
}

// Inicializar las áreas cuando se carga el mapa
initializeAreas();
function loadTruckMarkers() {
  document.querySelectorAll(".camion-coords").forEach((coordsInput) => {
    if (coordsInput instanceof HTMLInputElement && coordsInput.value) {
      try {
        const coords = JSON.parse(coordsInput.value) as [number, number];
        const row = coordsInput.closest("tr");
        if (row) {
          const checkbox = row.querySelector(
            ".checkbox-camion"
          ) as HTMLInputElement;
          const camionId = checkbox?.dataset.camionId;
          if (camionId) {

            const marker = new Marker(coords, {
              icon: iconCamion,
            });
            if (checkbox.checked) {
              marker.addTo(map);
            }
            truckMarkers[camionId] = marker;
          }
        }
      } catch (error) {
        console.error("Error loading truck marker:", error);
      }
    }
  });
}

// Call loadTruckMarkers after map initialization
map.whenReady(() => {
  loadTruckMarkers();
});
