import type { Marker } from "leaflet";


// Enviar mensaje a Whatsapp
export function mensajeWapp(
  mensaje: string, celular: string): void {
  let link = "https://wa.me/";
  link += celular;
  link += "?text=";
  mensaje = mensaje.replace(/ /g, "%20");
  link += mensaje;
  window.open(link);
}

// Para crear un toast
export function createToast(
  id: string,
  insertId: string | null,
  mensaje: string,
  posicion: 'top' | 'bottom' | 'center',
  tipo: 'success' | 'warning' | 'error'
): void {

  let posicionClass: string;
  let alertclass: string;
  let svg: string;

  switch(posicion) {
    case 'top':
      posicionClass = 'absolute top-16 centrear-w-absolute !w-10/12 sm:!w-1/2';
      break;
    case 'bottom':
      posicionClass = 'absolute bottom-24 centrear-w-absolute !w-10/12 sm:!w-1/2';
      break;
    case 'center':
      posicionClass = 'absolute centrearXY !w-10/12 sm:!w-1/2'; 
      break;
    default:
      posicionClass = '';
  }

  switch(tipo) {
    case 'success':
      alertclass = 'alert-success';
      svg = `<svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;
      break;
    case 'warning':
      alertclass = 'alert-warning';
      svg = `<svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>`;
      break;
    case 'error':
      alertclass = 'alert-error';
      svg = '<svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>';
      break;
    default:
      alertclass = '';
      svg = '';
  }

  const div = document.createElement('div');
  div.id = id;
  div.innerHTML = `
    <div role="alert" class="alert w-1/2 ${alertclass} z-[500] ${posicionClass}">
      ${svg}
      <span>${mensaje}</span>
    </div>`;

  if (insertId && document.getElementById(insertId)) {
    document.getElementById(insertId)!.appendChild(div);
  } else {
    document.body.appendChild(div);
  }

  // Eliminar el toast después de 4 segundos
  setTimeout(() => {
    div.remove();
  }, 4000);
}

export function inscrito(marker: Marker, polygon: number[][] ) : boolean {
    let x = marker.getLatLng().lat,
      y = marker.getLatLng().lng;
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      let xi = polygon[i][0],
        yi = polygon[i][1];
      let xj = polygon[j][0],
        yj = polygon[j][1];
      let intersect = ((yi > y) != (yj > y)) &&
        (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) {
        inside = !inside;
      }
    }
    return inside;
  };
