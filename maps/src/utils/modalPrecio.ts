import dragModal from "./dragModal";
import { DataPrice } from "../types/types";
import { Marker, Map, Path } from "leaflet";
import { postData } from "./postCliente";
import { createToast } from "./toast";
import { polyline } from "leaflet";


let tbValores: HTMLTableElement;
let tbConstantes: HTMLTableElement;
let formName: HTMLInputElement;
let formPhone: HTMLInputElement;
let formPrecioSistema: HTMLInputElement;
let formCost: HTMLInputElement;
let saveData: HTMLButtonElement;

function initElements() {
    tbValores    = document.getElementById("tbValores")    as HTMLTableElement;
    tbConstantes = document.getElementById("tbConstantes") as HTMLTableElement;
    formName          = document.getElementById("formName")          as HTMLInputElement;
    formPhone         = document.getElementById("formPhone")         as HTMLInputElement;
    formPrecioSistema = document.getElementById("formPrecioSistema") as HTMLInputElement;
    formCost          = document.getElementById("formCost")          as HTMLInputElement;
    saveData          = document.getElementById("saveData")          as HTMLButtonElement;
}

let precio_sugerido: string = "";
let paths: Path[] = [];
let map: Map | null = null;
let currentMarker: Marker | undefined;

function limpiarModal() {
    while (tbValores.firstChild) {
      tbValores.removeChild(tbValores.firstChild);
    }
    while (tbConstantes.firstChild) {
      tbConstantes.removeChild(tbConstantes.firstChild);
    }
    formPrecioSistema.value = "";
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

const STATUS_COLORS: Record<string, string> = {
    PRG: '#2196F3',
    EJE: '#43A047',
    COT: '#FF9800',
    CAN: '#E53935',
    NEG: '#E53935',
};

function insertSeparator(tbody: HTMLTableElement) {
    const trSep = document.createElement("tr");
    const tdSep = document.createElement("td");
    tdSep.colSpan = 9;
    tdSep.style.padding = "2px 0";
    tdSep.innerHTML = '<hr style="border-color:rgba(255,255,255,0.15)">';
    trSep.appendChild(tdSep);
    tbody.appendChild(trSep);
}

function tbVal(tbody: HTMLTableElement, origen: string[], distancia: number[], tiempo: number[], colorPath: string[], origenSeleccionado: number, costos: number[], utilidades: number[], otros: number[], chofers: number[], precios: number[], onSelect: (i: number) => void, grupos?: { bases: number; clientes: number; camiones: number }, originsStatus?: (string | null)[]) {
    // Guardamos referencias a los tds de color para poder actualizarlos al cambiar el radio
    const rowCells: HTMLTableCellElement[][] = [];

    const sep1 = grupos && grupos.bases > 0 && grupos.clientes > 0 ? grupos.bases : -1;
    const sep2 = grupos && (grupos.clientes > 0 || grupos.bases > 0) && grupos.camiones > 0
        ? grupos.bases + grupos.clientes : -1;

    origen.forEach((o, i) => {
        if (i === sep1 || i === sep2) insertSeparator(tbody);

        const row = document.createElement("tr");
        const row_origen  = document.createElement("td");
        const row_dist    = document.createElement("td");
        const row_tiempo  = document.createElement("td");
        const row_costo   = document.createElement("td");
        const row_util    = document.createElement("td");
        const row_otros   = document.createElement("td");
        const row_chofer  = document.createElement("td");
        const row_precio  = document.createElement("td");
        const row_radio   = document.createElement("td");

        const esSeleccionado = i === origenSeleccionado;
        const colorVal = esSeleccionado ? "white" : "#9ca3af";

        const statusColor = originsStatus?.[i] ? STATUS_COLORS[originsStatus[i]!] : null;
        row_origen.textContent  = o;
        row_origen.style.color  = statusColor ?? colorPath[i];
        row_origen.style.textAlign = "left";
        row_dist.textContent   = distancia[i].toFixed(1);
        row_tiempo.textContent = tiempo[i].toFixed(0);

        row_costo.textContent   = costos[i]    != null ? `${costos[i].toFixed(0)}`     : '';
        row_util.textContent    = utilidades[i] != null ? `${utilidades[i].toFixed(0)}` : '';
        row_otros.textContent   = otros[i]      != null ? `${otros[i].toFixed(0)}`      : '';
        row_chofer.textContent  = chofers[i]    != null ? `${chofers[i].toFixed(0)}`    : '';
        row_precio.textContent  = precios[i]    != null ? `${precios[i]}`               : '';

        const numCells = [row_costo, row_util, row_otros, row_chofer, row_precio];
        numCells.forEach(td => {
            td.style.color    = colorVal;
            td.style.fontSize = "0.75rem";
        });
        [row_dist, row_tiempo].forEach(td => td.style.color = colorVal);
        if (esSeleccionado) row_precio.style.fontWeight = "600";

        rowCells.push([row_dist, row_tiempo, ...numCells]);

        // Radio button
        const radio = document.createElement("input");
        radio.type    = "radio";
        radio.name    = "origen-base";
        radio.value   = String(i);
        radio.checked = esSeleccionado;
        radio.classList.add("radio", "radio-xs");
        radio.addEventListener("change", () => {
            // Actualizar colores de todas las filas
            rowCells.forEach((cells, j) => {
                const color = j === i ? "white" : "#9ca3af";
                cells.forEach(td => td.style.color = color);
                // fontWeight en precio
                const precioTd = cells[cells.length - 1];
                precioTd.style.fontWeight = j === i ? "600" : "";
            });
            onSelect(i);
        });
        row_radio.appendChild(radio);
        row_radio.style.paddingLeft = "8px";

        row.appendChild(row_origen);
        row.appendChild(row_dist);
        row.appendChild(row_tiempo);
        row.appendChild(row_costo);
        row.appendChild(row_util);
        row.appendChild(row_otros);
        row.appendChild(row_chofer);
        row.appendChild(row_precio);
        row.appendChild(row_radio);

        tbody.appendChild(row);
    });
}

export const modalPrecio = (data: DataPrice, colorPath: string[], marker: Marker, mapInstance: Map) => {
    map = mapInstance;
    currentMarker = marker;
    const modalPrecio = document.getElementById("modalPrecio") as HTMLDialogElement;
    initElements();
    limpiarModal();

    // Store paths in the global array
    data.paths.forEach((path: any, index: number) => {
        const ruta = polyline(path, {
            color: colorPath[index % colorPath.length],
            opacity: 0.95
        }).addTo(map!);
        paths.push(ruta);
    });

    console.log('[modal] chofer_bases:', data.chofer_bases, 'otros_bases:', data.otros_bases);

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

    // Celdas del Total row — se actualizan al cambiar radio o checkbox
    const totalCells: Partial<Record<number, HTMLTableCellElement>> = {};

    // updateTotal se define más abajo; tbVal lo llama por referencia
    let updateTotal = (_i: number) => {};

    // checkboxes se declara antes de tbVal para que el closure onSelect lo capture por referencia
    const checkboxes: HTMLInputElement[] = [];

    tbVal(tbValores, data.origins, data.distances.map(d => d/1000), tiemposAjustados, colorPath, data.origen, data.costos_combustible_bases ?? [], data.utilidades_bases ?? [], data.otros_bases ?? [], data.chofer_bases ?? [], data.precios_bases ?? [], (i) => {
        updateTotal(i);
    }, data.grupos, data.origins_status);

    // Tabla de valores constantes — 9 cols alineadas con la tabla de arriba
    // col: 0=Origen/Base, 1=Dist, 2=T., 3=Comb., 4=Util., 5=Mant., 6=Chofer, 7=Precio, 8=checkbox
    const constantes = [
        { tramo: 'Comb.Saguapac',   dist: data.distance_saguapac[0] / 1000, tiempo: parseFloat((data.time_saguapac[0] * data.factor_camion * data.factor_cargado / 60).toFixed(0)), val: data.costo_combustible_retorno ?? 0, col: 3 },
        { tramo: 'Utilidad Retorno', dist: null as number | null, tiempo: null as number | null, val: data.detalle_otros?.retorno_saguapac ?? 0, col: 4 },
        { tramo: 'Comb.Operación',   dist: null as number | null, tiempo: data.tiempo_trabajo_min, val: data.costo_combustible_trabajo ?? 0, col: 3 },
        { tramo: 'Saguapac',         dist: null as number | null, tiempo: null as number | null, val: data.detalle_otros?.saguapac ?? 0, col: 5 },
    ];

    constantes.forEach(({ tramo, dist, tiempo, val, col }) => {
        const tr = document.createElement("tr");
        for (let c = 0; c < 9; c++) {
            const td = document.createElement("td");
            if (c === 0) {
                td.textContent = tramo;
                td.style.textAlign = "left";
            } else if (c === 1 && dist != null) {
                td.textContent = dist.toFixed(1);
            } else if (c === 2 && tiempo != null) {
                td.textContent = tiempo.toFixed(0);
            } else if (c === col) {
                td.textContent = val ? val.toFixed(0) : '';
                td.style.fontSize = "0.75rem";
            } else if (c === 8) {
                const cb = document.createElement("input");
                cb.type = "checkbox";
                cb.checked = true;
                cb.classList.add("checkbox", "checkbox-xs");
                cb.addEventListener("change", () => recalcAndUpdate());
                checkboxes.push(cb);
                td.appendChild(cb);
                td.style.paddingLeft = "4px";
            }
            tr.appendChild(td);
        }
        tbConstantes.appendChild(tr);
    });

    // Fila Total — suma vertical: constantes activas + fila seleccionada por radio
    const trTotal = document.createElement("tr");
    trTotal.style.borderTop = "1px solid rgba(255,255,255,0.2)";
    for (let c = 0; c < 9; c++) {
        const td = document.createElement("td");
        if (c === 0) {
            td.textContent = "Total";
            td.style.textAlign = "left";
            td.style.fontWeight = "600";
        } else if ([3, 4, 5, 6, 7].includes(c)) {
            td.style.fontWeight = "600";
            td.style.fontSize = "0.75rem";
            if (c === 7) td.style.color = "yellow";
            totalCells[c] = td;
        }
        trTotal.appendChild(td);
    }
    tbConstantes.appendChild(trTotal);

    // Suma de constantes activas (solo filas con checkbox marcado)
    const recalcConsts = () => {
        let c3 = 0, c4 = 0, c5 = 0;
        constantes.forEach(({ val, col }, ci) => {
            if (checkboxes[ci]?.checked) {
                if (col === 3) c3 += val;
                else if (col === 4) c4 += val;
                else if (col === 5) c5 += val;
            }
        });
        return { c3, c4, c5 };
    };

    // Función que recalcula el Total al cambiar radio o checkbox
    const costos_b  = data.costos_combustible_bases ?? [];
    const utils_b   = data.utilidades_bases ?? [];
    const otros_b   = data.otros_bases ?? [];
    const chofers_b = data.chofer_bases ?? [];
    const precios_b = data.precios_bases ?? [];
    let currentIdx  = data.origen;

    updateTotal = (i: number) => {
        currentIdx = i;
        const { c3, c4, c5 } = recalcConsts();
        const t3 = costos_b[i]  != null ? c3 + costos_b[i]  : null;
        const t4 = utils_b[i]   != null ? c4 + utils_b[i]   : null;
        const t5 = otros_b[i]   != null ? c5 + otros_b[i]   : null;
        const t6 = chofers_b[i] != null ? chofers_b[i]       : null;
        const horizTotal = (t3 ?? 0) + (t4 ?? 0) + (t5 ?? 0) + (t6 ?? 0);
        if (totalCells[3]) totalCells[3].textContent = t3 != null ? t3.toFixed(0) : '';
        if (totalCells[4]) totalCells[4].textContent = t4 != null ? t4.toFixed(0) : '';
        if (totalCells[5]) totalCells[5].textContent = t5 != null ? t5.toFixed(0) : '';
        if (totalCells[6]) totalCells[6].textContent = t6 != null ? t6.toFixed(0) : '';
        if (totalCells[7]) totalCells[7].textContent = horizTotal ? horizTotal.toFixed(0) : '';
        // Actualizar Precio Final con el Total (redondeado a múltiplo de 10)
        formCost.value = horizTotal ? String(Math.round(horizTotal / 10) * 10) : '';
    };

    const recalcAndUpdate = () => updateTotal(currentIdx);

    // Inicializar con la base seleccionada por defecto
    updateTotal(data.origen);

    // Filas de resumen de precios (base más corta, estáticas)
    const factorReal = data.factor_zona === 0 ? 1 : data.factor_zona;
    const precioFacturado = Math.round(data.precio * 1.18 / 10) * 10;
    const resumen = [
        { label: 'Factor zona',      valor: factorReal.toFixed(2),          color: Math.abs(factorReal - 1) > 0.001 ? 'yellow' : '',  col: 7 },
        { label: 'P. Sin Factor',    valor: String(data.precio_sin_zona),    color: data.precio_sin_zona !== data.precio ? '#aaaaaa' : '', col: 7 },
        { label: 'P. Cotizado',      valor: String(data.precio),             color: '#FFD54F',                                           col: 7 },
        { label: 'P. Facturado',     valor: String(precioFacturado),         color: '',                                                  col: 7 },
    ];

    // Fila espaciadora
    const trSpacer = document.createElement("tr");
    const tdSpacer = document.createElement("td");
    tdSpacer.colSpan = 9;
    tdSpacer.style.paddingTop = "6px";
    trSpacer.appendChild(tdSpacer);
    tbConstantes.appendChild(trSpacer);

    resumen.forEach(({ label, valor, color, col }) => {
        const tr = document.createElement("tr");
        for (let c = 0; c < 9; c++) {
            const td = document.createElement("td");
            if (c === 0) {
                td.textContent = label;
                td.style.textAlign = "left";
                if (label === 'P. Cotizado') td.style.color = '#FFD54F';
            } else if (c === col) {
                td.textContent = valor;
                td.style.fontSize = "0.75rem";
                td.style.fontWeight = label === 'P. Cotizado' ? "700" : "500";
                if (color) td.style.color = color;
            }
            tr.appendChild(td);
        }
        tbConstantes.appendChild(tr);
    });

    precio_sugerido = data.precio.toFixed(0);
    formPrecioSistema.value = precio_sugerido;

    // Notas informativas
    const warning = document.getElementById("warning") as HTMLDivElement;

    // Retorno a Saguapac
    const notaRetorno = document.createElement("p");
    notaRetorno.style.color = colorSaguapac;
    const distSag = (data.distance_saguapac[0] / 1000).toFixed(1);
    const tiempoRetSag = (data.time_saguapac[0] * data.factor_camion * data.factor_cargado / 60).toFixed(0);
    const costoSag = data.costo_combustible_retorno ? ` · ${data.costo_combustible_retorno.toFixed(0)} Bs` : '';
    notaRetorno.textContent = `↩ Saguapac: ${distSag} km · ${tiempoRetSag} min (×${data.factor_cargado} cargado)${costoSag}`;
    warning.appendChild(notaRetorno);

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
    // show() en vez de showModal() → sin backdrop, el mapa y el panel siguen siendo interactivos
    (modalPrecio as HTMLDialogElement).show();
    // Inicializar el arrastre inmediatamente
    dragModal('draggableModal', 'modalHeader');

    // Colapsar / expandir contenido del modal
    const collapseBtn = document.getElementById("modalCollapseBtn") as HTMLButtonElement;
    const modalContent = document.getElementById("modalContent") as HTMLDivElement;
    collapseBtn.textContent = "▼";
    modalContent.style.display = "";
    collapseBtn.onclick = () => {
        const collapsed = modalContent.style.display === "none";
        modalContent.style.display = collapsed ? "" : "none";
        collapseBtn.textContent = collapsed ? "▼" : "▲";
    };

    // formCost se inicializa via updateTotal(data.origen) llamado arriba
    
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
        const pCotizado = parseInt(formPrecioSistema.value);
        const response = await postData(formName.value, formPhone.value, parseInt(formCost.value), currentMarker!, "COT", "ADM", "", isNaN(pCotizado) ? undefined : pCotizado);
        
        // Si la respuesta es exitosa
        createToast('postData', 'map', 'Datos guardados con éxito', 'top', 'success');
        
        // Actualizar capas de clientes y jornada
        if ((window as any).refreshClientLayers) {
          (window as any).refreshClientLayers();
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


