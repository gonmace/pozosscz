import { Marker } from "leaflet";
import { inscrito } from "./inscrito";

interface Client {
  id: number;
  tel1: string;
  tel2: string;
  name: string;
  address: string;
  cod: string;
  cost: number;
  service: string;
  lat: number;
  lon: number;
  status: string;
  user: string;
  created_at: string;
}

export async function fetchAllClients(): Promise<Client[]> {
  try {
    const response = await fetch('/api/v1/clientes/');
    if (!response.ok) {
      throw new Error('Error fetching clients');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching clients:', error);
    return [];
  }
}

export function findClientsInPolygon(clients: Client[], polygon: number[][]): Client[] {
  return clients.filter(client => {
    const marker = new Marker([client.lat, client.lon]);
    return inscrito(marker, polygon);
  });
}

export function parsePolygonCoordinates(coordinatesText: string): number[][] | null {
  try {
    const coordinates = JSON.parse(coordinatesText);
    if (Array.isArray(coordinates) && coordinates.every(coord => 
      Array.isArray(coord) && coord.length === 2 && 
      typeof coord[0] === 'number' && typeof coord[1] === 'number'
    )) {
      return coordinates;
    }
  } catch (error) {
    console.error('Error parsing polygon coordinates:', error);
  }
  return null;
} 