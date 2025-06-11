import { Map, tileLayer, Marker, control, Path } from "leaflet"; 
import "./utils/leaflet.Control.Center";
import { LocateControl } from "leaflet.locatecontrol";
import type {
  LeafletMouseEvent,
  LocationEvent,
  ErrorEvent
} from "leaflet";
import {
  iconRed,
  locateOptions,
} from "./utils/ObjectLeaflet";
import "leaflet-control-custom";
import "./types/leaflet-control-custom.d.ts";

import "leaflet/dist/leaflet.css";
import "../src/utils/leaflet.Control.Center.css";
import "leaflet.locatecontrol/dist/L.Control.Locate.min.css";
import "./utils/leaflet.locate.css";
import type { DataPrice } from "./types/types";
import { cotizando } from "./utils/cotizando.ts";
import { postData } from "./utils/postCliente.ts";
import { mensajeWapp } from "./utils/utils.ts";

declare global {
  interface Window {
    DATOS_GENERALES: {
      mensaje_cotizar: string;
      celular: string;
      mensaje_whatsapp: string;
      [key: string]: any;
    }
    ISAUTHENTICATED: boolean;
  }
}

const DATOS_GENERALES = window.DATOS_GENERALES;
const ISAUTHENTICATED = window.ISAUTHENTICATED;


let marker: Marker;
let paths: Path[] = [];
let dataPrice: DataPrice;
let precioFinal: number;
const overlay = document.getElementById("overlay") as HTMLDivElement;
const modalPrecio = document.getElementById("precios") as HTMLDialogElement;
const parrafo = modalPrecio.querySelector("p") as HTMLParagraphElement;
const botonConfirmar = document.getElementById("confirmar") as HTMLButtonElement;
const modalPrecioClose = document.getElementById("modalPrecioClose") as HTMLButtonElement;
const modalPrecioCancelar = document.getElementById("cancelar") as HTMLButtonElement;

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
            <button id="cotiza" class="btn btn-secondary btn-sm sm:btn-md btn-disabled sombra w-32">
            COTIZA
            </button>
          </div>`,
  classes: "pb-11 sm:pb-1",
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
    overlay.classList.remove("invisible");
    dataPrice = await cotizando(marker);
    overlay.classList.add("invisible");
    precioFinal = Math.round(dataPrice.precio / 10) * 10;
    if (dataPrice.distance_scz < dataPrice.distancia_maxima_cotizar && dataPrice.factor_zona == 0) {
      parrafo.innerHTML = `<b>Bs.${precioFinal}</b> ${DATOS_GENERALES.mensaje_cotizar} <span class=" italic">Precio referencial, sujeto a confirmación. Contáctanos para más detalles.</span>` ;
      botonConfirmar.textContent = "Contáctanos";
    } else {
      parrafo.innerHTML = `<b>Bs.${precioFinal}</b> ${DATOS_GENERALES.mensaje_cotizar}`;
    }
    if (dataPrice.distance_scz > dataPrice.distancia_maxima_cotizar) {
      parrafo.innerHTML = `La ubicación seleccionada excede la distancia máxima permitida por el sistema. Por favor, contáctanos para obtener una cotización personalizada.`;
      botonConfirmar.textContent = "Contáctanos";
    }
    modalPrecio.showModal();
    botonConfirmar.addEventListener("click", async () => {
      let codigo = generarCodigo(precioFinal);
      let celular = DATOS_GENERALES.celular;
      if (ISAUTHENTICATED) {
        console.log("Está autenticado, no guarda cotización");
      } else {
      await postData("pozosscz.com", "", precioFinal, marker, "COT", "CLC", codigo).then(() => {
        console.log("Confirmado - Cliente guardado");
      });
      }
      let menLatLon = `Código de cotización:${codigo}%0D%0A
      ¡Hola!, Requiero el servicio de limpieza en la siguiente ubicación:%0D%0A
      https://maps.google.com/maps?q=${marker.getLatLng().lat.toFixed(7)}%2C${marker.getLatLng().lng.toFixed(7)}&z=17&hl=es`;
      mensajeWapp(menLatLon, celular);
    });

    const botonesCancelar = [modalPrecioClose, modalPrecioCancelar];
    botonesCancelar.forEach(async (boton) => {
      boton.addEventListener("click", async () => {
        modalPrecio.close();
        if (ISAUTHENTICATED) {
          console.log("Está autenticado, no guarda cotización");
        } else {
          await postData("pozosscz.com", "", precioFinal, marker, "COT", "CLX").then(() => {
            console.log("Cancelado - Cliente guardado");
          });          
        }
      });
    });
    
  }

  function generarCodigo(precio) {
    const now = new Date();
    
    // Año: últimos dos dígitos
    const anio = now.getFullYear() % 100;
  
    // Mes y día con 2 dígitos
    const mes = String(now.getMonth() + 1).padStart(2, '0'); // meses van de 0 a 11
    const dia = String(now.getDate()).padStart(2, '0');
  
    // Convertir precio a string para acceder a dígitos
    const precioStr = precio.toString();
  
    let d1 = precioStr[0] || '0';
    let d2 = precioStr[1] || '0';
    let d3 = precioStr[2] || '0';
    let d4 = precioStr[3] || '';
  
    // Si el precio es de 3 dígitos, usar d3 como último
    // Si el precio es de 4 dígitos, usar d3 + d4 como último
    const final = precioStr.length === 4 ? d3 + d4 : d3;
  
    // Concatenar todos los componentes
    const codigo = `${anio}${d1}${mes}${d2}${dia}${final}`;
    return codigo;
  }
  