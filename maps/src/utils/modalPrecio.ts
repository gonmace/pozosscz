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
    // Limpiar tooltips custom del body
    const modalBox = document.getElementById("draggableModal");
    if (modalBox) modalBox.querySelectorAll("div[style*='position:absolute']").forEach(el => el.remove());
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

    const colorSaguapac = colorPath[data.origen % colorPath.length];
    data.path_saguapac.forEach((path: any) => {
        const ruta = polyline(path, {
            color: colorSaguapac,
            opacity: 0.95
        }).addTo(map!);
        paths.push(ruta);
    });

    // Tabla de valores — tiempos ajustados al camión
    const tiemposAjustados = data.times.map(t => t * data.factor_camion / 60);
    tbVal(tbValores, data.origins, data.distances.map(d => d/1000), tiemposAjustados, colorPath)

    // Fila del tramo punto→SAGUAPAC (tiempo ajustado: ×factor_camion ×factor_cargado)
    const rowSag = document.createElement("tr");
    const rowSag_origen = document.createElement("td");
    const rowSag_dist = document.createElement("td");
    const rowSag_tiempo = document.createElement("td");
    rowSag_origen.textContent = "→ saguapac";
    rowSag_origen.style.color = colorSaguapac;
    rowSag_dist.textContent = (data.distance_saguapac[0] / 1000).toFixed(1);
    rowSag_tiempo.textContent = (data.time_saguapac[0] * data.factor_camion * data.factor_cargado / 60).toFixed(0);
    rowSag.appendChild(rowSag_origen);
    rowSag.appendChild(rowSag_dist);
    rowSag.appendChild(rowSag_tiempo);
    tbValores.appendChild(rowSag);

    // Tabla de base seleccionada
    const row = document.createElement("tr");
    const row_origen = document.createElement("td");
    const row_dist = document.createElement("td");
    const row_factor = document.createElement("td");
    row_origen.textContent = data.origins[data.origen];
    row_origen.style.color = colorPath[data.origen % colorPath.length];
    row_dist.textContent = (data.distances[data.origen]/1000).toFixed(1);
    const factorReal = data.factor_zona === 0 ? 1 : data.factor_zona;
    row_factor.textContent = factorReal.toFixed(2);
    row_factor.style.color = Math.abs(factorReal - 1) > 0.001 ? "yellow" : "white";
    row.appendChild(row_origen);
    row.appendChild(row_dist);
    row.appendChild(row_factor);
    tbMenor.appendChild(row);

    // Tabla de final
    const row2 = document.createElement("tr");
    const row_costo = document.createElement("td");
    const row_chofer = document.createElement("td");
    const row_utilidad = document.createElement("td");
    const row_otros_td = document.createElement("td");
    row_costo.textContent = data.costo_combustible.toFixed(0);
    row_chofer.textContent = data.chofer.toFixed(0);
    row_utilidad.textContent = data.utilidad.toFixed(0);

    // Tooltip "Otros" al final a la derecha — custom para evitar desbordamiento del modal
    const d = data.detalle_otros;
    const otrosLabel = document.createElement("span");
    otrosLabel.textContent = `+${data.costo_otros.toFixed(0)}`;
    otrosLabel.style.cssText = "color:#9ca3af;font-size:0.7rem;text-decoration:underline dotted;cursor:help;";

    const tooltip = document.createElement("div");
    tooltip.style.cssText = `
        position:absolute;
        top:2px;
        left:50%;
        transform:translateX(-50%);
        background:white;
        color:#111;
        font-size:0.75rem;
        font-weight:500;
        line-height:1.6;
        padding:4px 10px;
        border-radius:4px;
        box-shadow:0 2px 8px rgba(0,0,0,0.3);
        pointer-events:none;
        white-space:nowrap;
        display:none;
    `;
    tooltip.innerHTML =
        `Mant.: ${d.mantenimiento} Bs &nbsp;|&nbsp; ` +
        `Saguapac: ${d.saguapac} Bs &nbsp;|&nbsp; ` +
        `Retorno: ${d.retorno_saguapac} Bs &nbsp;|&nbsp; ` +
        `<b>Total: ${data.costo_otros.toFixed(0)} Bs</b>`;

    const modalBox = document.getElementById("draggableModal") as HTMLElement;
    modalBox.appendChild(tooltip);

    otrosLabel.addEventListener("mouseenter", () => { tooltip.style.display = "block"; });
    otrosLabel.addEventListener("mouseleave", () => { tooltip.style.display = "none"; });

    row_otros_td.appendChild(otrosLabel);

    row2.appendChild(row_costo);
    row2.appendChild(row_chofer);
    row2.appendChild(row_utilidad);
    row2.appendChild(row_otros_td);
    tbFinal.appendChild(row2);

    // Tabla de precios: sin zona | con zona | facturado
    const row3 = document.createElement("tr");
    const row_sin_zona = document.createElement("td");
    const row_con_zona = document.createElement("td");
    const row_facturado = document.createElement("td");
    precio_sugerido = data.precio.toFixed(0);
    row_sin_zona.textContent = data.precio_sin_zona.toFixed(0);
    row_sin_zona.style.color = data.precio_sin_zona !== data.precio ? "#aaaaaa" : "white";
    row_con_zona.textContent = precio_sugerido;
    row_con_zona.style.color = "yellow";
    row_con_zona.classList.add("text-lg", "font-medium");
    row_facturado.textContent = (data.precio * 1.18).toFixed(0);
    row3.appendChild(row_sin_zona);
    row3.appendChild(row_con_zona);
    row3.appendChild(row_facturado);
    tbPrecios.appendChild(row3);

    // Notas informativas
    const warning = document.getElementById("warning") as HTMLDivElement;

    // Tiempo mínimo de cobro aplicado
    if (data.tiempo_cobro_min > data.tiempo_real_min) {
        const notaMin = document.createElement("p");
        notaMin.style.color = "#60a5fa";
        notaMin.textContent = `⏱ Tiempo mínimo aplicado: ${data.tiempo_cobro_min} min (real: ${data.tiempo_real_min} min)`;
        warning.appendChild(notaMin);
    }

    // Retorno a Saguapac (siempre visible)
    const notaSag = document.createElement("p");
    notaSag.style.color = colorSaguapac;
    notaSag.textContent = `↩ Retorno Saguapac: ${(data.distance_saguapac[0]/1000).toFixed(1)} km → ${data.costo_adicional_retorno.toFixed(0)} Bs`;
    warning.appendChild(notaSag);

    // Factor zona
    if (data.factor_zona === 0) {
        const notaZona = document.createElement("p");
        notaZona.style.color = "tomato";
        notaZona.textContent = "⚠ Punto fuera de zona — factor aplicado: 1.00";
        warning.appendChild(notaZona);
    } else if (Math.abs(data.factor_zona - 1) > 0.001) {
        const notaZona = document.createElement("p");
        const diff = data.precio - data.precio_sin_zona;
        const pct = data.precio_sin_zona > 0 ? (diff / data.precio_sin_zona * 100) : 0;
        const signo = diff >= 0 ? "+" : "";
        notaZona.style.color = diff >= 0 ? "#4ade80" : "tomato";
        notaZona.textContent = `★ Factor de zona: ${data.factor_zona.toFixed(2)}  (${signo}${diff.toFixed(0)} Bs / ${signo}${pct.toFixed(1)}%)`;
        warning.appendChild(notaZona);
    }

    // Factor global distinto de 1
    if (data.factor_global && Math.abs(data.factor_global - 1) > 0.001) {
        const notaGlobal = document.createElement("p");
        notaGlobal.style.color = "orange";
        notaGlobal.textContent = `⬆ Factor global activo: ×${data.factor_global.toFixed(2)}`;
        warning.appendChild(notaGlobal);
    }

    // Distancia máxima excedida
    if (data.distance_scz > data.distancia_maxima_cotizar) {
        const notaDist = document.createElement("p");
        notaDist.style.color = "orange";
        notaDist.textContent = `⚠ Dist. desde SCZ: ${data.distance_scz.toFixed(0)} km (máx. ${data.distancia_maxima_cotizar} km)`;
        warning.appendChild(notaDist);
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
      if (formCost.value === "" || parseInt(formCost.value) < 300) {
        createToast('validación', 'map', 'El precio no debe quedar en blanco o es un valor inválido.', 'top', 'error');
        return;
      }

      try {
        // Asegúrate de que postData es una función asíncrona que retorna una promesa
        const response = await postData(formName.value, formPhone.value, parseInt(formCost.value), currentMarker!);
        
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


