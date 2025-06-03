import { Map, tileLayer, Marker, control, polyline, Path } from "leaflet"; 
import "./utils/leaflet.Control.Center";
// import L from "leaflet";
import { LocateControl } from "leaflet.locatecontrol";
import type {
  LeafletMouseEvent,
  LocationEvent,
  ErrorEvent,
  Control,
} from "leaflet";
import {
  iconRed,
  locateOptions,
} from "./utils/ObjectLeaflet";
import "leaflet-control-custom";

import "leaflet/dist/leaflet.css";
import "../src/utils/leaflet.Control.Center.css";
import "leaflet.locatecontrol/dist/L.Control.Locate.min.css";
import "./utils/leaflet.locate.css";

// Importar Font Awesome desde CDN
const fontAwesome = document.createElement('link');
fontAwesome.rel = 'stylesheet';
fontAwesome.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css';
document.head.appendChild(fontAwesome);

let marker: Marker;
let paths: Path[] = [];
const overlay = document.getElementById("overlay") as HTMLDivElement;
const modalPrecio = document.getElementById("precios") as HTMLDialogElement;
const modalPrecioClose = document.getElementById("modalPrecioClose") as HTMLButtonElement;
const parrafo = modalPrecio.querySelector("p") as HTMLParagraphElement;
const botonConfirmar = document.getElementById("confirmar") as HTMLButtonElement;

const map = new Map("map", {
  center: [-17.784071, -63.180522],
  zoom: 12,
  zoomControl: true,
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

// Crear un objeto que contiene las capas base
const baseMaps = {
  OpenStreetMap: osm,
  "Esri World Imagery": esri,
};

map.getContainer().style.cursor = "crosshair";

control
.layers(baseMaps, {}, { position: "topleft", collapsed: false })
.addTo(map);

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
    click: contratar,
  },
})
.addTo(map);

const botonCotiza = document.getElementById("cotiza") as HTMLButtonElement;

function onMapClick(e: LeafletMouseEvent) {
    // Obtener el elemento nav
    const navElement = document.querySelector("nav");
    // Verificar si el clic ocurrió fuera del nav
    if (
      navElement &&
      !navElement.contains(e.originalEvent.target as Node)
    ) {
      if (marker) {
        map.removeLayer(marker);
      } else {
        botonCotiza.classList.remove("btn-disabled");
      }
      marker = new Marker(e.latlng, {
        icon: iconRed,
      }).addTo(map);
      console.log("Lat: " + e.latlng.lat.toFixed(6) + ", Lon: " + e.latlng.lng.toFixed(6));

      // Remove existing paths when placing a new marker
      paths.forEach(path => map.removeLayer(path));
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
    paths.forEach(path => map.removeLayer(path));
    paths = [];

    // Hacer zoom a la ubicación encontrada
    map.flyTo(e.latlng, 19);
    
  });

  map.on("locationerror", function (e: ErrorEvent) {
    alert(e.message);
  });

  // Agrega boton de COTIZA que haga fetch al servidor de mapas y encontrar rutas y tiempos
  async function contratar() {
    if (!marker) {
      alert("Por favor seleccione una ubicación en el mapa");
      return;
    }

    // Remove existing paths
    paths.forEach(path => map.removeLayer(path));
    paths = [];

    overlay.classList.remove("invisible");

    try {
      const response = await fetch("/api/v1/contratar/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lat: marker.getLatLng().lat,
          lon: marker.getLatLng().lng,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        overlay.classList.add("invisible");
        alert(errorData.error || "Error al procesar la solicitud");
        return;
      }

      const data = await response.json();
      
      // Draw routes on the map
      const colors = ["red", "green", "orange", "cyan"];
      data.routes.forEach((route: any, index: number) => {
        const coordinates = route.geometry.map((coord: number[]) => [coord[1], coord[0]]);
        const path = polyline(coordinates, {
          color: colors[index % colors.length],
          opacity: 0.95
        }).addTo(map);
        paths.push(path);
      });
      
      // Mostrar el modal con el precio
      parrafo.innerHTML = `Costo base para vivienda <br> Bs. ${data.price}`;
      modalPrecio.showModal();

      // Función para manejar el cierre del modal
      async function handleClose() {
        overlay.classList.add("invisible");
        modalPrecio.close();
        // Remove paths when closing the modal
        // paths.forEach(path => map.removeLayer(path));
        // paths = [];
      }

      // Función para manejar la confirmación
      async function handleConfirmar() {
        overlay.classList.add("invisible");
        modalPrecio.close();
        // Keep the paths visible when confirming
        window.location.href = data.whatsapp_url;
      }

      // Agregar listeners
      modalPrecioClose.onclick = handleClose;
      botonConfirmar.onclick = handleConfirmar;

    } catch (error) {
      console.error("Error:", error);
      overlay.classList.add("invisible");
      alert("Error al procesar la solicitud");
    }
  }