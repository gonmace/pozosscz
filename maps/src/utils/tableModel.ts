import { Map as LeafletMap, Marker } from "leaflet";
import { iconRed } from "./ObjectLeaflet";
import { createToast } from "./toast";
import { buildCamionOptions } from "./camiones";

interface Client {
  id: number;
  name: string;
  tel1: string;
  address: string;
  lat: number;
  lon: number;
  cost: number;
  precio_cotizado?: number | null;
  status: string;
  activo: boolean;
  user: string;
  service: string;
  created_at: string;
  camion?: number | null;
  camion_iniciales?: string | null;
}

function hexAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

const STATUS_COLOR: Record<string, string> = {
  PRG: "#2196F3", EJE: "#43A047", CAN: "#E53935", COT: "#FF9800", NEG: "#E53935",
};

const STATUS_CLASS: Record<string, string> = {
  PRG: "st-prg", EJE: "st-eje", CAN: "st-can", COT: "st-cot", NEG: "st-neg",
};

const ST_ALL = ["st-prg","st-eje","st-can","st-cot","st-neg"];

const STATUS_LABEL: Record<string, string> = {
  PRG: "Programado",
  EJE: "Ejecutado",
  CAN: "Cancelado",
  COT: "Cotizado",
  NEG: "Negado",
};

let currentPage = 1;
const itemsPerPage = 50;
let totalPages = 1;
let clients: Client[] = [];

export function tableModal(map: LeafletMap) {
  // Create modal container
  const modalContainer = document.createElement("div");
  modalContainer.className = "modal modal-open z-[9999]";
  modalContainer.innerHTML = `
    <div class="modal-box w-full max-w-6xl sm:w-11/12 relative z-[9999] p-0 overflow-hidden rounded-none sm:rounded-box">
      <!-- Encabezado -->
      <div class="flex items-center justify-between px-5 py-3.5 border-b border-base-300">
        <div class="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="opacity-60">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          <h3 class="font-bold text-base">Lista de Clientes</h3>
          <span id="tableClientCount" class="badge badge-sm badge-primary"></span>
        </div>
        <button class="btn btn-sm btn-circle btn-ghost" id="closeModal">✕</button>
      </div>
      <!-- Tabla -->
      <div class="overflow-x-auto max-h-[70vh] overflow-y-auto">
        <table class="table table-sm w-full">
          <thead class="sticky top-0 z-10 bg-base-200">
            <tr class="text-xs text-base-content/50 uppercase tracking-wider">
              <th>Nombre</th>
              <th>Teléfono</th>
              <th class="text-right">Precio</th>
              <th class="text-center">Est.</th>
              <th class="text-center">Act.</th>
              <th class="text-center">Cam.</th>
              <th class="w-[100px]">Comentario</th>
              <th class="text-center">Fecha</th>
              <th class="text-center">Acc.</th>
            </tr>
          </thead>
          <tbody id="clientsTableBody">
          </tbody>
        </table>
      </div>
      <!-- Paginación -->
      <div class="flex items-center justify-between px-5 py-3 border-t border-base-300 bg-base-200">
        <span class="text-xs text-base-content/40">Página <span id="currentPage">1</span> de <span id="totalPages">1</span></span>
        <div class="join">
          <button class="join-item btn btn-sm" id="prevPage">«</button>
          <button class="join-item btn btn-sm" id="nextPage">»</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modalContainer);

  // ── Constantes declaradas ANTES de cualquier uso (evita TDZ) ─────────────
  const closeModal  = modalContainer.querySelector<HTMLElement>("#closeModal");
  const prevPage    = modalContainer.querySelector<HTMLElement>("#prevPage");
  const nextPage    = modalContainer.querySelector<HTMLElement>("#nextPage");
  const tableBody   = modalContainer.querySelector<HTMLElement>("#clientsTableBody")!;

  // Mapa id→cliente para event delegation — sin JSON en data-*
  const clientMap = new Map<number, Client>();

  // Formateador de fecha reutilizable (más rápido que toLocaleDateString en loop)
  const fmtFecha = new Intl.DateTimeFormat("es-BO", { day: "2-digit", month: "2-digit", year: "numeric" });

  const WA_ICON = `<svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M20.52 3.48A11.93 11.93 0 0 0 12 0C5.37 0 0 5.37 0 12c0 2.11.55 4.16 1.6 5.97L0 24l6.18-1.62A11.93 11.93 0 0 0 12 24c6.63 0 12-5.37 12-12 0-3.21-1.25-6.22-3.48-8.52zm-8.52 18.4a9.89 9.89 0 0 1-5.04-1.38l-.36-.22-3.67.96.98-3.58-.23-.37A9.93 9.93 0 0 1 2.07 12c0-5.48 4.46-9.93 9.93-9.93 2.65 0 5.15 1.03 7.02 2.91A9.88 9.88 0 0 1 21.93 12c0 5.48-4.45 9.93-9.93 9.93zm5.44-7.44c-.3-.15-1.77-.87-2.04-.97-.28-.1-.48-.15-.68.15-.2.3-.77.97-.94 1.17-.18.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.47-.89-.79-1.49-1.76-1.66-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.44-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.68-1.63-.93-2.23-.24-.58-.49-.5-.68-.51-.17 0-.37-.02-.57-.02s-.52.07-.8.37c-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.1 4.49.71.31 1.27.49 1.7.63.72.23 1.37.2 1.88.12.57-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35z"/></svg>`;

  // ── Listeners de navegación ───────────────────────────────────────────────
  closeModal?.addEventListener("click", () => modalContainer.remove());

  prevPage?.addEventListener("click", () => {
    if (currentPage > 1) { currentPage--; loadClients(); }
  });

  nextPage?.addEventListener("click", () => {
    if (currentPage < totalPages) { currentPage++; loadClients(); }
  });

  // ── Event delegation — UN solo listener para toda la tabla ────────────────
  tableBody.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>("[data-action]");
    if (!btn) return;
    const id     = parseInt(btn.dataset.id!);
    const client = clientMap.get(id);
    if (!client) return;
    if (btn.dataset.action === "locate") {
      map.flyTo([client.lat, client.lon], 16);
      new Marker([client.lat, client.lon], { icon: iconRed }).addTo(map);
    } else if (btn.dataset.action === "edit") {
      editClient(client);
    } else if (btn.dataset.action === "comment") {
      showCommentTooltip(btn, client.address || "Sin comentario");
    } else if (btn.dataset.action === "status-open") {
      showStatusPicker(btn, client, clientMap);
    }
  });

  tableBody.addEventListener("change", async (e) => {
    const target = e.target as HTMLElement;

    // Toggle activo
    const toggle = target.closest<HTMLInputElement>("input[type=checkbox]");
    if (toggle) {
      const id         = parseInt(toggle.dataset.id!);
      const nuevoValor = toggle.checked;
      try {
        const resp = await fetch(`/api/v1/clientes/${id}/`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", "X-CSRFToken": getCookie("csrftoken") },
          body: JSON.stringify({ activo: nuevoValor }),
        });
        if (!resp.ok) throw new Error();
        const c = clientMap.get(id);
        if (c) c.activo = nuevoValor;
      } catch {
        toggle.checked = !nuevoValor;
        createToast("activo", "map", "Error al actualizar", "top", "error");
      }
      return;
    }

  });

  // ── Carga inicial ─────────────────────────────────────────────────────────
  loadClients();

  async function loadClients() {
    try {
      const response = await fetch(`/api/v1/clientes/`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const allClients: Client[] = Array.isArray(data) ? data : (data.results ?? []);

      const startIndex = (currentPage - 1) * itemsPerPage;
      clients      = allClients.slice(startIndex, startIndex + itemsPerPage);
      totalPages   = Math.max(1, Math.ceil(allClients.length / itemsPerPage));

      updateTable();
      updatePagination();
    } catch (error) {
      console.error("tableModal loadClients:", error);
      createToast("clients", "map", `Error al cargar los clientes: ${error}`, "top", "error");
    }
  }

  // Dos tonos claramente distintos para grupos de días alternos (sobre el tinte de estado)
  const ZEBRA_OVERLAY = [
    "rgba(255,255,255,0.0)",   // día par  — deja ver solo el color de estado
    "rgba(0,0,0,0.18)",        // día impar — oscurece notablemente la fila
  ];

  const fmtFechaLarga = new Intl.DateTimeFormat("es-BO", {
    weekday: "short", day: "2-digit", month: "long", year: "numeric",
  });

  function updateTable() {
    const countEl = modalContainer.querySelector<HTMLElement>("#tableClientCount");
    if (countEl) countEl.textContent = clients.length.toString();

    // Actualizar mapa id→cliente para el event delegation
    clientMap.clear();
    clients.forEach(c => clientMap.set(c.id, c));

    // Ordenar por fecha descendente para que el zebra agrupe días correlativos
    const sorted = [...clients].sort((a, b) => {
      const da = a.created_at ?? "";
      const db = b.created_at ?? "";
      return db.localeCompare(da);
    });

    let zebraDayKey = "";
    let zebraIdx    = -1;

    tableBody.innerHTML = sorted.map(client => {
      const dayKey = client.created_at ? client.created_at.slice(0, 10) : "__";

      // Nuevo día → insertar separador y rotar color
      let separator = "";
      if (dayKey !== zebraDayKey) {
        zebraDayKey = dayKey;
        zebraIdx    = 1 - zebraIdx;   // alterna 0 ↔ 1

        const dayLabel = client.created_at
          ? fmtFechaLarga.format(new Date(client.created_at))
          : "Sin fecha";

        separator = `
        <tr class="day-separator" style="background:rgba(255,255,255,0.12);border-top:2px solid rgba(255,255,255,0.25);">
          <td colspan="9"
              style="padding:5px 10px 4px;font-size:10px;font-weight:800;letter-spacing:0.1em;
                     text-transform:uppercase;opacity:0.85;">
            ${dayLabel}
          </td>
        </tr>`;
      }

      const color   = STATUS_COLOR[client.status] ?? "#9E9E9E";
      const stClass = STATUS_CLASS[client.status] ?? "";
      // Combinar: tinte de estado + overlay de día
      const rowBg   = `linear-gradient(${ZEBRA_OVERLAY[zebraIdx]},${ZEBRA_OVERLAY[zebraIdx]}),${hexAlpha(color, 0.08)}`;
      const fecha   = client.created_at ? fmtFecha.format(new Date(client.created_at)) : "—";

      const waCell = client.tel1
        ? `<a href="https://wa.me/${client.tel1.replace(/[^\d+]/g, "")}" target="_blank"
               class="inline-flex items-center gap-1 text-xs"
               style="color:inherit;font-weight:400;" onclick="event.stopPropagation()">
             <span style="color:#25D366;flex-shrink:0;">${WA_ICON}</span>${client.tel1}
           </a>`
        : `<span class="text-xs italic" style="opacity:0.3;">—</span>`;

      return separator + `
      <tr class="hover transition-colors" style="border-left:3px solid ${color};background:${rowBg};">
        <td class="text-xs w-[80px] max-w-[80px]">
          <span class="font-medium line-clamp-2 leading-tight">${client.name || '<span class="italic" style="opacity:0.3;">Sin nombre</span>'}</span>
        </td>
        <td class="w-[90px] max-w-[90px]">${waCell}</td>
        <td class="text-right">
          ${client.cost
            ? `<span class="text-xs font-bold px-1.5 py-0.5 rounded"
                     style="background:rgba(255,213,79,0.1);border:1px solid rgba(255,213,79,0.35);color:#FFD54F;">
                 Bs.${client.cost}
               </span>`
            : `<span class="text-xs" style="opacity:0.3;">—</span>`}
        </td>
        <td class="text-center">
          <button class="status-badge ${stClass} text-[10px] font-bold rounded-full border w-[52px] py-0.5 text-center cursor-pointer leading-none"
                  data-action="status-open" data-id="${client.id}">
            ${client.status}
          </button>
        </td>
        <td class="text-center">
          <input type="checkbox" class="toggle toggle-xs toggle-success"
                 data-id="${client.id}" ${client.activo ? "checked" : ""} />
        </td>
        <td class="text-center">
          ${client.camion_iniciales
            ? `<span class="inline-flex items-center justify-center w-6 h-6 rounded-full text-[9px] font-bold"
                     title="${client.camion_iniciales}"
                     style="background:rgba(255,255,255,0.95);border:1.5px solid rgba(0,0,0,0.08);color:rgba(0,0,0,0.75);box-shadow:0 0 0 2px var(--color-base-200,#1d2430);">
                 ${client.camion_iniciales}
               </span>`
            : `<span class="text-xs" style="opacity:0.2;">—</span>`}
        </td>
        <td class="text-xs w-[100px] max-w-[100px] cursor-pointer" style="opacity:0.6;">
          <span class="line-clamp-1" data-action="comment" data-id="${client.id}">${client.address || '<span class="italic" style="opacity:0.5;">—</span>'}</span>
        </td>
        <td class="text-center text-xs" style="opacity:0.4;">${fecha}</td>
        <td>
          <div class="flex items-center gap-1 justify-center">
            <button class="btn btn-xs btn-ghost btn-square status-fly-btn"
                    data-action="locate" data-id="${client.id}"
                    title="Ver en mapa">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
              </svg>
            </button>
            <button class="btn btn-xs btn-ghost btn-square"
                    data-action="edit" data-id="${client.id}"
                    title="Editar cliente">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5"/>
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
          </div>
        </td>
      </tr>`;
    }).join("");
  }

  function showStatusPicker(anchor: HTMLElement, client: Client, cMap: Map<number, Client>) {
    document.getElementById("__status-picker")?.remove();

    const STATUSES: [string, string][] = [
      ["PRG", "Programado"], ["EJE", "Ejecutado"], ["COT", "Cotizado"],
      ["CAN", "Cancelado"], ["NEG", "Negado"],
    ];

    const picker = document.createElement("div");
    picker.id = "__status-picker";
    picker.style.cssText = "position:fixed;z-index:99999;border-radius:10px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.5);border:1px solid rgba(255,255,255,0.1);min-width:130px;";
    picker.style.background = "#1e293b";
    picker.innerHTML = STATUSES.map(([val, label]) => {
      const c = STATUS_COLOR[val] ?? "#9E9E9E";
      return `<button data-pick="${val}"
                style="display:block;width:100%;text-align:left;padding:7px 14px;font-size:11px;font-weight:600;color:${c};background:transparent;border:none;cursor:pointer;"
                onmouseover="this.style.background='rgba(255,255,255,0.07)'"
                onmouseout="this.style.background='transparent'">
                ${val} <span style="opacity:0.6;font-weight:400;">— ${label}</span>
              </button>`;
    }).join("");

    document.body.appendChild(picker);

    const rect = anchor.getBoundingClientRect();
    let left = rect.left + window.scrollX;
    let top  = rect.bottom + window.scrollY + 4;
    if (left + 140 > window.innerWidth) left = window.innerWidth - 144;
    picker.style.left = `${left}px`;
    picker.style.top  = `${top}px`;

    picker.addEventListener("click", async (ev) => {
      const pickBtn = (ev.target as HTMLElement).closest<HTMLElement>("[data-pick]");
      if (!pickBtn) return;
      const newStatus = pickBtn.dataset.pick!;
      const newColor  = STATUS_COLOR[newStatus] ?? "#9E9E9E";
      picker.remove();

      // Actualizar badge y color de fila
      anchor.textContent = newStatus;
      anchor.classList.remove(...ST_ALL);
      anchor.classList.add(STATUS_CLASS[newStatus] ?? "");
      const row = anchor.closest<HTMLElement>("tr");
      if (row) {
        row.style.borderLeft = `3px solid ${newColor}`;
        row.style.background = hexAlpha(newColor, 0.07);
      }

      const c = cMap.get(client.id);
      if (c) c.status = newStatus;

      try {
        const resp = await fetch(`/api/v1/clientes/${client.id}/`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", "X-CSRFToken": getCookie("csrftoken") },
          body: JSON.stringify({ status: newStatus }),
        });
        if (!resp.ok) throw new Error();
      } catch {
        createToast("status", "map", "Error al actualizar estado", "top", "error");
      }
    });

    const close = () => { picker.remove(); document.removeEventListener("click", close, true); };
    setTimeout(() => document.addEventListener("click", close, true), 0);
  }

  function showCommentTooltip(anchor: HTMLElement, text: string) {
    // Eliminar tooltip anterior si existe
    document.getElementById("__comment-tip")?.remove();

    const tip = document.createElement("div");
    tip.id = "__comment-tip";
    tip.className = "fixed z-[99999] max-w-[220px] rounded-lg px-3 py-2 text-xs shadow-xl";
    tip.style.cssText = "background:#1e293b;color:#e2e8f0;border:1px solid rgba(255,255,255,0.12);word-break:break-word;pointer-events:none;";
    tip.textContent = text;
    document.body.appendChild(tip);

    // Posicionar cerca del elemento
    const rect = anchor.getBoundingClientRect();
    const tipW = 220;
    let left = rect.left + window.scrollX;
    let top  = rect.bottom + window.scrollY + 6;
    // Evitar que se salga por la derecha
    if (left + tipW > window.innerWidth - 8) left = window.innerWidth - tipW - 8;
    tip.style.left = `${left}px`;
    tip.style.top  = `${top}px`;

    // Cerrar al primer click en cualquier lugar
    const close = () => { tip.remove(); document.removeEventListener("click", close, true); };
    setTimeout(() => document.addEventListener("click", close, true), 0);
  }

  function updatePagination() {
    const currentPageEl = document.getElementById("currentPage");
    const totalPagesEl  = document.getElementById("totalPages");
    if (currentPageEl) currentPageEl.textContent = currentPage.toString();
    if (totalPagesEl)  totalPagesEl.textContent  = totalPages.toString();
    if (prevPage) prevPage.classList.toggle("btn-disabled", currentPage === 1);
    if (nextPage) nextPage.classList.toggle("btn-disabled", currentPage === totalPages);
  }
}

// Function to get CSRF token
function getCookie(name: string): string {
  let cookieValue = '';
  const cookies = document.cookie.split(';');
  for (let i = 0; i < cookies.length; i++) {
    const cookie = cookies[i].trim();
    if (cookie.substring(0, name.length + 1) === (name + '=')) {
      cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
      break;
    }
  }
  return cookieValue;
}

export function editClient(client: Client) {
  const statusColor = STATUS_COLOR[client.status] ?? "#9E9E9E";

  const editModal = document.createElement('dialog');
  editModal.className = 'modal items-start justify-center z-[9999]';
  editModal.innerHTML = `
    <div class="modal-box w-11/12 max-w-lg relative z-[9999] pt-0 px-0 overflow-hidden">
      <!-- Header con color de estado -->
      <div class="flex items-center gap-3 px-4 py-3 bg-base-300"
           style="border-left:4px solid ${statusColor};">
        <div class="flex-1 min-w-0">
          <p class="font-bold text-sm leading-snug truncate">${client.name || "(sin nombre)"}</p>
          <p class="text-[10px] font-mono" style="opacity:0.4;">ID ${client.id}</p>
        </div>
        <span class="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
              style="background:${statusColor}22;color:${statusColor};border:1px solid ${statusColor}55;">
          ${STATUS_LABEL[client.status] ?? client.status}
        </span>
      </div>

      <!-- Form -->
      <form id="editClientForm" class="flex flex-col gap-3 px-4 py-4">

        <!-- Nombre (ancho completo) -->
        <div class="flex flex-col gap-1">
          <span class="text-xs pl-1" style="opacity:0.5;">Nombre</span>
          <label class="input input-bordered input-sm flex w-full">
            <input type="text" id="editName" class="grow min-w-0" value="${client.name || ''}" placeholder="Nombre" />
          </label>
        </div>

        <!-- Teléfono + Estado -->
        <div class="flex gap-2">
          <div class="flex flex-col gap-1 flex-1 min-w-0">
            <span class="text-xs pl-1" style="opacity:0.5;">Teléfono</span>
            <label class="input input-bordered input-sm flex w-full">
              <input type="text" id="editPhone" class="grow min-w-0" value="${client.tel1 || ''}" placeholder="Teléfono" />
            </label>
          </div>
          <div class="flex flex-col gap-1 w-36 shrink-0">
            <span class="text-xs pl-1" style="opacity:0.5;">Estado</span>
            <select id="editStatus" class="select select-bordered select-sm w-full"
                    style="border-color:${statusColor}55;color:${statusColor};">
              <option value="PRG" ${client.status === 'PRG' ? 'selected' : ''}>Programado</option>
              <option value="COT" ${client.status === 'COT' ? 'selected' : ''}>Cotizado</option>
              <option value="EJE" ${client.status === 'EJE' ? 'selected' : ''}>Ejecutado</option>
              <option value="CAN" ${client.status === 'CAN' ? 'selected' : ''}>Cancelado</option>
              <option value="NEG" ${client.status === 'NEG' ? 'selected' : ''}>Negado</option>
            </select>
          </div>
        </div>

        <!-- P. Cotizado sistema (readonly) + Precio Final -->
        <div class="flex gap-2">
          ${client.precio_cotizado ? `
          <div class="flex flex-col gap-1 flex-1 min-w-0">
            <span class="text-xs pl-1" style="color:#FF9800;opacity:0.8;">P. Cotizado sistema</span>
            <label class="input input-sm flex w-full" style="border:1px solid #FF9800;border-radius:var(--radius-field,0.5rem);opacity:0.7;">
              <input type="text" class="grow min-w-0 text-xs font-semibold bg-transparent outline-none"
                     style="color:#FF9800;" value="Bs. ${client.precio_cotizado}" readonly />
            </label>
          </div>` : ''}
          <div class="flex flex-col gap-1 flex-1 min-w-0">
            <span class="text-xs pl-1" style="color:yellow;">P. Final</span>
            <label class="input input-sm flex w-full" style="border:1px solid yellow;border-radius:var(--radius-field,0.5rem);">
              <input type="number" id="editCost" class="grow min-w-0 text-xs font-bold bg-transparent outline-none"
                     style="color:yellow;" value="${client.cost || ''}" placeholder="—" />
            </label>
          </div>
        </div>

        <!-- Dirección -->
        <div class="flex flex-col gap-1">
          <span class="text-xs pl-1" style="opacity:0.5;">Dirección / Comentario</span>
          <label class="input input-bordered input-sm flex w-full">
            <input type="text" id="editAddress" class="grow min-w-0" value="${client.address || ''}" placeholder="Dirección" />
          </label>
        </div>

        <!-- Chofer / Camión -->
        <div class="flex flex-col gap-1">
          <span class="text-xs pl-1" style="opacity:0.5;">Chofer / Camión</span>
          <select id="editCamion" class="select select-bordered select-sm w-full">
            ${buildCamionOptions(client.camion ?? null)}
          </select>
        </div>

        <!-- Botones -->
        <div class="flex gap-2 pt-1">
          <button type="button" class="btn btn-sm flex-1 btn-ghost border border-base-content/20"
                  onclick="this.closest('dialog').close()">Cancelar</button>
          <button type="submit" class="btn btn-sm flex-1 btn-accent">Guardar</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(editModal);
  editModal.showModal();

  // Handle form submission
  const form = editModal.querySelector('#editClientForm') as HTMLFormElement;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const camionVal = (document.getElementById('editCamion') as HTMLSelectElement).value;
    const updatedClient = {
      ...client,
      name: (document.getElementById('editName') as HTMLInputElement).value,
      tel1: (document.getElementById('editPhone') as HTMLInputElement).value.slice(0, 13),
      address: (document.getElementById('editAddress') as HTMLInputElement).value,
      cost: Number((document.getElementById('editCost') as HTMLInputElement).value),
      status: (document.getElementById('editStatus') as HTMLSelectElement).value,
      camion: camionVal ? Number(camionVal) : null,
      lat: client.lat,
      lon: client.lon,
      service: client.service || 'NOR',
      user: client.user || 'ADM'
    };

    try {
      const response = await fetch(`/api/v1/clientes/${client.id}/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCookie('csrftoken'),
        },
        body: JSON.stringify(updatedClient),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      createToast('editClient', 'map', 'Cliente actualizado correctamente', 'top', 'success');
      
      setTimeout(() => {
        editModal.close();
        editModal.remove();
        // Trigger a custom event to notify that a client was updated
        window.dispatchEvent(new CustomEvent('clientUpdated'));
      }, 500);
    } catch (error) {
      console.error('Error updating client:', error);
      createToast('editClient', 'map', `Error: ${error.message}`, 'top', 'error');
    }
  });
}
