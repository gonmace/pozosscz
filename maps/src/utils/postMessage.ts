const urlPost = "http://127.0.0.1:8000/api/v1/formcontacto";

export async function postMessage(
  name: string,
  phone: string,
  message: string,
) {
  const data = {
    nombre: name,
    telefono: phone,
    mensaje: message,
  };
  return await fetch(urlPost, {
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
        throw new Error(`Error - Status: ${res.status}`);
      }
      return res.json();
    })
    .then((response) => {
      return response;
    })
    .catch((error) => {

      return error; // Lanzar el error o manejarlo según tu caso de uso
    })
    .finally(() => {
      // Limpiar la data
      console.log("Data cleared after fetch.");
    });

}
