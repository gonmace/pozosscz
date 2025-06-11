import dragModal from "./dragModal";
import { DataPrice } from "../types/types";
import { Marker, Map, Path } from "leaflet";
import { postData } from "./postCliente";
import { createToast } from "./toast";
import { polyline } from "leaflet";
import { fetchClients } from "./getClients";

const tbValores = document.getElementById("tbValores") as HTMLTableElement;
const tbMenor = document.getElementById("tbMenor") as HTMLTableElement;
const tbFinal = document.getElementById("tbFinal") as HTMLTableElement;
const tbPrecios = document.getElementById("tbPrecios") as HTMLTableElement;

const formName = document.getElementById("formName") as HTMLInputElement;
const formPhone = document.getElementById("formPhone") as HTMLInputElement;
const formCost = document.getElementById("formCost") as HTMLInputElement;
const saveData = document.getElementById("saveData") as HTMLButtonElement;

let precio_sugerido: string = "";
let paths: Path[] = [];
let map: Map | null = null;
let currentMarker: Marker | undefined;

function limpiarModal() {
    while (tbValores.firstChild) {
      tbValores.removeChild(tbValores.firstChild);
    }
    while (tbPrecios.firstChild) {
      tbPrecios.removeChild(tbPrecios.firstChild);
    }
    while (tbMenor.firstChild) {
      tbMenor.removeChild(tbMenor.firstChild);
    }
    while (tbFinal.firstChild) {
      tbFinal.removeChild(tbFinal.firstChild);
    }
    const warning = document.getElementById("warning") as HTMLDivElement;
    while (warning.firstChild) {
      warning.removeChild(warning.firstChild);
    }
    formName.value = "";
    formPhone.value = "";
    formCost.value = "";
}

function tbVal(tbody: HTMLTableElement, origen: string[], distancia: number[], tiempo: number[], colorPath: string[]) {
origen.forEach((o, i) => {
    const row = document.createElement("tr");
    const row_origen = document.createElement("td");
    const row_dist = document.createElement("td");
    const row_tiempo = document.createElement("td");

    row_origen.textContent = o;
    row_origen.style.color = colorPath[i];
    row_dist.textContent = distancia[i].toFixed(1);
    row_tiempo.textContent = tiempo[i].toFixed(0);

    row.appendChild(row_origen);
    row.appendChild(row_dist);
    row.appendChild(row_tiempo);

    tbody.appendChild(row);
});
}

export const modalPrecio = (data: DataPrice, colorPath: string[], marker: Marker, mapInstance: Map) => {
    map = mapInstance;
    currentMarker = marker;
    const modalPrecio = document.getElementById("modalPrecio") as HTMLDialogElement;
    limpiarModal();

    // Store paths in the global array
    data.paths.forEach((path: any, index: number) => {
        const ruta = polyline(path, {
            color: colorPath[index % colorPath.length],
            opacity: 0.95
        }).addTo(map!);
        paths.push(ruta);
    });

    data.path_saguapac.forEach((path: any) => {
        const ruta = polyline(path, {
            color: "black",
            opacity: 0.35
        }).addTo(map!);
        paths.push(ruta);
    });

    // Tabla de valores
    tbVal(tbValores, data.origins, data.distances.map(d => d/1000), data.times.map(t => t/60), colorPath)

    // Tabla de menor distancia
    const row = document.createElement("tr");
    const row_origen = document.createElement("td");
    const row_dist = document.createElement("td");
    const row_factor = document.createElement("td");
    row_origen.textContent = data.origins[data.origen];
    row_dist.textContent = (data.distances[data.origen]/1000).toFixed(1);
    row_factor.textContent = (data.factor_zona).toFixed(2);
    row_factor.style.color = Math.abs(data.factor_zona - 1) > 0.001 ? "yellow" : "white";
    row.appendChild(row_origen);
    row.appendChild(row_dist);
    row.appendChild(row_factor);
    tbMenor.appendChild(row);

    // Tabla de final
    const row2 = document.createElement("tr");
    const row_costo = document.createElement("td");
    const row_chofer = document.createElement("td");
    const row_utilidad = document.createElement("td");
    row_costo.textContent = data.costo.toFixed(0);
    row_chofer.textContent = data.chofer.toFixed(0);
    row_utilidad.textContent = data.utilidad.toFixed(0);
    row2.appendChild(row_costo);
    row2.appendChild(row_chofer);
    row2.appendChild(row_utilidad);
    tbFinal.appendChild(row2);

    // Tabla de precios
    const row3 = document.createElement("tr");
    const row_precio = document.createElement("td");
    const row_sugerido = document.createElement("td");
    const row_facturado = document.createElement("td");
    row_precio.textContent = data.precio.toFixed(0);
    precio_sugerido = (Math.round(data.precio / 10) * 10).toFixed(0);
    row_sugerido.textContent = precio_sugerido
    row_sugerido.style.color = "yellow";
    row_sugerido.classList.add("text-lg", "font-medium");
    row_facturado.textContent = (Math.ceil(data.precio / 5) * 5 *1.18).toFixed(0);
    row3.appendChild(row_precio);
    row3.appendChild(row_sugerido);
    row3.appendChild(row_facturado);
    tbPrecios.appendChild(row3);

    const warning = document.getElementById("warning") as HTMLDivElement;
    warning.style.color = "yellow";
    if (data.costo_adicional_retorno > 0) {
        const ojo = document.createElement("p");
        ojo.textContent = "* Costo adicional de retorno (>20km): " + data.costo_adicional_retorno.toFixed(0)+" Bs.";
        warning.appendChild(ojo);
    }
    if (data.factor_zona < 1) {
        const ojo2 = document.createElement("p");
        ojo2.textContent = "* Punto fuera de cualquier zona";
        ojo2.style.color = "red";
        warning.appendChild(ojo2);
    }

    if (data.distance_scz > data.distancia_maxima_cotizar) {
        const ojo3 = document.createElement("p");
        ojo3.innerHTML = "* Distancia desde al centro de SCZ: " + 
        data.distance_scz.toFixed(0) + "km.<br>   Distancia máxima para cotizar: " + 
        data.distancia_maxima_cotizar + "km.";
        ojo3.style.color = "orange";
        warning.appendChild(ojo3);
    }
    modalPrecio.showModal();
    // Inicializar el arrastre inmediatamente
    dragModal('draggableModal', 'modalHeader');

    formCost.value = precio_sugerido;
    
    // Asegurarnos que el campo de teléfono reciba el foco después de que el modal esté visible
    setTimeout(() => {
        formPhone.focus();
    }, 100);

    saveData.onclick = async () => {
        // Validación del campo de teléfono
      if (formPhone.value.length < 8) {
        createToast('validación', 'map', 'El teléfono debe tener al menos 8 dígitos.', 'top', 'error');
        return;
      }

      // Validación del campo de precio
      if (precio_sugerido === "" || parseInt(precio_sugerido) < 300) {
        createToast('validación', 'map', 'El precio no debe quedar en blanco o es un valor inválido.', 'top', 'error');
        return;
      }

      try {
        // Asegúrate de que postData es una función asíncrona que retorna una promesa
        const response = await postData(formName.value, formPhone.value, parseInt(precio_sugerido), currentMarker!);
        
        // Si la respuesta es exitosa
        createToast('postData', 'map', 'Datos guardados con éxito', 'top', 'success');
        
        // Actualizar la lista de clientes
        const { groupEje, groupCot } = await fetchClients();
        
        // Remover los grupos antiguos y añadir los nuevos
        if (window.mcgLayerSupportGroup) {
          window.mcgLayerSupportGroup.checkIn(groupCot);

          // Desactivar capa de ejecutados
          groupEje.forEach(group => {
            if (group) group.removeFrom(map!);
          });

          // Activar capa de cotizados
          groupCot.forEach(group => {
            if (group) group.addTo(map!);
          });
        }
        
        // Cerrar el modal
        modalPrecio.close();
        
        // Limpiar el modal
        limpiarModal();
        
        // Remover los paths del mapa si existen
        if (paths && paths.length > 0) {
          paths.forEach(path => {
            if (path && map) {
              map.removeLayer(path);
            }
          });
          paths = [];
        }
        
      } catch (error) {
        createToast('postData', 'map', `${error}`, 'top', 'error');
      }
    }
}


