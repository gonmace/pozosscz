import {
  layerGroup,
  circleMarker,
  latLng,
  Marker,
  MarkerOptions,
  CircleMarkerOptions
} from "leaflet";
import type { CircleMarker, LayerGroup } from "leaflet";
import type { Clientes } from "../types/types";
import 'leaflet.markercluster';

// Extend MarkerOptions and CircleMarkerOptions to include time
declare module 'leaflet' {
  interface MarkerOptions {
    time?: string;
  }
  interface CircleMarkerOptions {
    time?: string;
  }
}

let p300: any = [],
  p350: any = [],
  p400: any = [],
  p450: any = [],
  p500: any = [],
  p600: any = [],
  p700: any = [],
  p800: any = [],
  p900: any = [],
  p1000: any = [],
  pNegro: any = [];

const colors = ['#ffff00', '#fba657', '#4ade80', '#52b551', '#ff0000', '#00ffff', '#50dbff', '#5eb9fc', '#6199ee', '#808080', 'black'];
const urlGet = '/api/v1/clientes/';

let group300 = layerGroup(),
  group350 = layerGroup(),
  group400 = layerGroup(),
  group450 = layerGroup(),
  group500 = layerGroup(),
  group600 = layerGroup(),
  group700 = layerGroup(),
  group800 = layerGroup(),
  group900 = layerGroup(),
  group1000 = layerGroup(),
  groupADM = layerGroup(),
  groupCLC = layerGroup(),
  groupCLX = layerGroup(),
  groupNegro = layerGroup();

let groupEje = [group300, group350, group400, group450, group500, group600, group700, group800, group900, group1000, groupNegro];
let groupCot = [groupADM, groupCLC, groupCLX];

var circleStyle = function (point: number): CircleMarkerOptions {
  return {
    fillColor: colors[point],
    radius: 8,
    stroke: true,
    color: "black",
    weight: 2,
    opacity: 1,
    fillOpacity: 1,
    // className: "marker",
  };
};

function formatearFecha(date: Date): string {
  const dia = date.getDate().toString().padStart(2, '0');
  const mes = (date.getMonth() + 1).toString().padStart(2, '0');
  const anio = date.getFullYear();
  return `${dia}/${mes}/${anio}`;
}

export async function fetchClients(): Promise<{ groupEje: LayerGroup[], groupCot: LayerGroup[] }> {
  const clientes: Clientes[] = await fetch(urlGet)
    .then(resp => resp.json())
    .then(data => {
      return data;
    }).catch(error => {
      console.error('Error:', error);
      throw error;
    })
  let color: number;
  let precio: number;
  let tel1: string;
  let marca: Marker | CircleMarker;
  let date: Date;

  clientes.forEach((e) => {
    // Calcular color base dividiendo el costo por 100
    color = e.cost / 100;
    // Asignación de color basado en el valor de 'color'
    if (color <= 3) {
      color = 0;
    } else if (color < 5) {
      color = Math.round(color * 2) / 2;  // Redondea a .5 más cercano
      color = color <= 3.5 ? 1 : color === 4 ? 2 : 3;
    } else if (color < 10) {
      color = Math.trunc(color) - 1;
    } else {
      color = 9;
    }
    switch (color) {
      case 0:
        p300.push([e.lat, e.lon, e.cost, e.status, e.user, e.tel1, e.name, e.created_at]);
        break;
      case 1:
        p350.push([e.lat, e.lon, e.cost, e.status, e.user, e.tel1, e.name, e.created_at]);
        break;
      case 2:
        p400.push([e.lat, e.lon, e.cost, e.status, e.user, e.tel1, e.name, e.created_at]);
        break;
      case 3:
        p450.push([e.lat, e.lon, e.cost, e.status, e.user, e.tel1, e.name, e.created_at]);
        break;
      case 4:
        p500.push([e.lat, e.lon, e.cost, e.status, e.user, e.tel1, e.name, e.created_at]);
        break;
      case 5:
        p600.push([e.lat, e.lon, e.cost, e.status, e.user, e.tel1, e.name, e.created_at]);
        break;
      case 6:
        p700.push([e.lat, e.lon, e.cost, e.status, e.user, e.tel1, e.name, e.created_at]);
        break;
      case 7:
        p800.push([e.lat, e.lon, e.cost, e.status, e.user, e.tel1, e.name, e.created_at]);
        break;
      case 8:
        p900.push([e.lat, e.lon, e.cost, e.status, e.user, e.tel1, e.name, e.created_at]);
        break;
      default:
        pNegro.push([e.lat, e.lon, e.cost, e.status, e.user, e.tel1, e.name, e.created_at]);
    }

    e.tel1 ? tel1 = e.tel1.toString() : tel1 = "ND"
    let date = convertirFechaISOaMasUno(e.created_at.toString());
    
    let markerOptions = {
      ...circleStyle(color),
      time: date
    };
    
    marca = circleMarker([e.lat, e.lon], markerOptions);
    // marca = new Marker([e.lat, e.lon], {time: date});

    let fecha = new Date(e.created_at);
    const fechaFormateada = `${fecha.getDate().toString().padStart(2, '0')}/${(fecha.getMonth() + 1).toString().padStart(2, '0')}/${fecha.getFullYear()}`;
    const contenidoPopup = `
      <strong>Precio:</strong> ${e.cost} Bs.<br>
      ${e.tel1 ? `<strong>Nombre:</strong> ${e.name}<br>` : ''}
      ${e.tel1 ? `<strong>Telefono:</strong> ${e.tel1}<br>` : ''}
      <em>${fechaFormateada}</em>
      `;
    marca.bindPopup(contenidoPopup);
    if (e.status == "COT") {
      e.user == "ADM" ? marca.addTo(groupADM) : null
      e.user == "CLC" ? marca.addTo(groupCLC) : marca.addTo(groupCLX)
    } else {
      e.status == "EJE" ? marca.addTo(groupEje[color]) : marca.addTo(groupEje[10])
    }
  });
  return { groupEje, groupCot};
}









function convertirFechaISOaMasUno(isoString: string): string {
  const fechaUtc = new Date(isoString);

  const año = fechaUtc.getFullYear();
  const mes = (fechaUtc.getMonth() + 1).toString().padStart(2, "0");
  const dia = fechaUtc.getDate().toString().padStart(2, "0");

  return `${año}-${mes}-${dia}`;
}