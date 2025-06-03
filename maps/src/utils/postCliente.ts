import { Marker } from "leaflet";

const urlPost = "http://127.0.0.1:8000/api/v1/clientes/";

export async function postData(
  name: string,
  phone: string,
  cost: number,
  marker: Marker,
  status: "COT" | "EJE" | "NEG" = "COT",
  user: "ADM" | "CLC" | "CLX" = "ADM",
  cod: string = ""
) {
  const data = {
    name: name,
    tel1: phone,
    cost: cost,
    lat: marker.getLatLng().lat.toFixed(6),
    lon: marker.getLatLng().lng.toFixed(6),
    status: status,
    user: user,
    cod: cod,
  };
  return fetch(urlPost, {
    method: "POST",
    body: JSON.stringify(data),
    headers: {
      "Accept": "application/json, text/plain, */*",
      "Content-Type": "application/json",
      "User-Agent": "BE pzosSCZ",
    },
  })
    .then((res) => {
      if (!res.ok) {
        console.log(res);
        throw new Error(`${res.statusText} - Status: ${res.status}`);
      }
      return res.json();
    })
    .then((response) => {
      return response;
    })
    .catch((error) => {
      console.error("Error:", error);
      throw error; // Lanzar el error o manejarlo según tu caso de uso
    })
    .finally(() => {
      // Limpiar la data
      console.log("Data cleared after fetch.");
    });;

}
