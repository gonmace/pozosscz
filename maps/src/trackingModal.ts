import type { Map, Polyline } from "leaflet";
import { polyline as leafletPolyline, LatLngBounds } from "leaflet";
import dragModal from "./utils/dragModal";
import { confirmDialog, createToast } from "./utils/toast";

interface PuntoTracking {
  id: number;
  hora: string;
  lat: number;
  lon: number;
  velocidad: number;
  direccion: number;
  activo: boolean;
  comentario: string;
}

interface CamionDia {
  camion_id: number;
  camion_nombre: string;
  registros: number;
  puntos: PuntoTracking[];
}

interface DiaTracking {
  fecha: string;
  camiones: CamionDia[];
}

const ROUTE_COLORS = ["#42A5F5", "#66BB6A", "#FFA726", "#AB47BC", "#EF5350", "#26C6DA", "#D4E157", "#EC407A"];

function getCsrf(): string {
  return document.cookie.match(/csrftoken=([^;]+)/)?.[1] ?? "";
}

function isWeekend(iso: string): boolean {
  const [y, m, d] = iso.split("-");
  const day = new Date(parseInt(y), parseInt(m) - 1, parseInt(d)).getDay();
  return day === 0 || day === 6;
}

function fmtFecha(iso: string): string {
  const [y, m, d] = iso.split("-");
  const dt = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
  return dt.toLocaleDateString("es-BO", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
}

export function initTrackingModal(map: Map) {
  let _dias = 1;
  let _camionFiltro = "";
  let _data: DiaTracking[] = [];
  let _colapsados = new Set<string>();
  let _loading = false;

  // Rutas dibujadas en el mapa: key = "fecha|camion_id"
  const _rutas = new Map<string, Polyline>();

  function rutaKey(fecha: string, camionId: number): string {
    return `${fecha}|${camionId}`;
  }

  function limpiarRutas() {
    _rutas.forEach(pl => map.removeLayer(pl));
    _rutas.clear();
  }

  function toggleRuta(fecha: string, cam: CamionDia, colorIdx: number): boolean {
    const key = rutaKey(fecha, cam.camion_id);
    if (_rutas.has(key)) {
      map.removeLayer(_rutas.get(key)!);
      _rutas.delete(key);
      return false;
    }
    // Puntos vienen del más reciente al más antiguo; invertir para trazar cronológicamente
    const coords = [...cam.puntos].reverse().map(p => [p.lat, p.lon] as [number, number]);
    if (coords.length === 0) return false;
    const color = ROUTE_COLORS[colorIdx % ROUTE_COLORS.length];
    const pl = leafletPolyline(coords, { color, weight: 3, opacity: 0.8 }).addTo(map);
    _rutas.set(key, pl);
    return true;
  }

  function mostrarRutasDia(dia: DiaTracking) {
    dia.camiones.forEach((cam, i) => {
      const key = rutaKey(dia.fecha, cam.camion_id);
      if (!_rutas.has(key)) {
        toggleRuta(dia.fecha, cam, i);
      }
    });
  }

  function flyToRutas() {
    if (_rutas.size === 0) return;
    const bounds = new LatLngBounds([]);
    _rutas.forEach(pl => bounds.extend(pl.getBounds()));
    if (bounds.isValid()) map.flyToBounds(bounds.pad(0.15), { duration: 1 });
  }

  dragModal("draggableTracking", "modalTrackingHeader");

  const collapseBtn = document.getElementById("modalTrackingCollapseBtn");
  const content = document.getElementById("modalTrackingContent");
  if (collapseBtn && content) {
    collapseBtn.onclick = () => {
      const collapsed = content.style.display === "none";
      content.style.display = collapsed ? "" : "none";
      collapseBtn.textContent = collapsed ? "▼" : "▲";
    };
  }
  const closeBtn = document.getElementById("modalTrackingCloseBtn");
  if (closeBtn) {
    closeBtn.onclick = () => {
      (document.getElementById("modal-tracking") as HTMLDialogElement)?.close();
      limpiarRutas();
    };
  }

  async function cargar() {
    if (_loading) return;
    _loading = true;
    limpiarRutas();
    const body = document.getElementById("tracking-body");
    if (body) body.innerHTML = `<p class="text-xs text-base-content/40 text-center py-4">Cargando…</p>`;
    try {
      const params = new URLSearchParams({ dias: String(_dias) });
      if (_camionFiltro) params.set("camion", _camionFiltro);
      const resp = await fetch(`/maps/api/tracking-camion/?${params}`);
      if (!resp.ok) throw new Error();
      _data = await resp.json();
      render();
      // Mostrar rutas del primer día (más reciente) por defecto
      if (_data.length > 0) {
        mostrarRutasDia(_data[0]);
        flyToRutas();
      }
    } catch {
      if (body) body.innerHTML = `<p class="text-xs text-error text-center py-4">Error al cargar</p>`;
    } finally {
      _loading = false;
    }
  }

  function render() {
    const body = document.getElementById("tracking-body");
    if (!body) return;

    if (_data.length === 0) {
      body.innerHTML = `<p class="text-xs text-base-content/40 text-center py-4">Sin registros de tracking</p>`;
      return;
    }

    body.innerHTML = _data.map(dia => {
      const totalRegistros = dia.camiones.reduce((s, c) => s + c.registros, 0);
      const collapsed = _colapsados.has(dia.fecha);
      const wknd = isWeekend(dia.fecha);
      const header = `
        <div class="tracking-dia-toggle cursor-pointer select-none flex items-center gap-2 px-2 py-2 rounded-lg mb-1"
             data-fecha="${dia.fecha}"
             style="background:${wknd ? "rgba(255,152,0,0.15)" : "rgba(255,255,255,0.04)"};border:1px solid rgba(255,255,255,0.08);">
          <span class="text-[10px] transition-transform ${collapsed ? "" : "rotate-90"}" style="color:rgba(255,255,255,0.4);">▶</span>
          <span class="text-xs font-bold capitalize flex-1">${fmtFecha(dia.fecha)}</span>
          <span class="text-[10px] font-semibold" style="color:rgba(255,255,255,0.35);">
            ${dia.camiones.length} camión${dia.camiones.length !== 1 ? "es" : ""} · ${totalRegistros} reg.
          </span>
        </div>`;

      const camiones = dia.camiones.map((cam, i) => {
        const primerPunto = cam.puntos[cam.puntos.length - 1];
        const ultimoPunto = cam.puntos[0];
        const horaInicio = primerPunto ? primerPunto.hora : "—";
        const horaFin = ultimoPunto ? ultimoPunto.hora : "—";
        const maxVel = Math.max(...cam.puntos.map(p => p.velocidad));
        const activo = ultimoPunto?.activo ?? false;
        const color = ROUTE_COLORS[i % ROUTE_COLORS.length];
        const key = rutaKey(dia.fecha, cam.camion_id);
        const visible = _rutas.has(key);

        return `
          <div class="tracking-dia-content tracking-camion-row flex items-center gap-2 px-3 py-1.5 rounded-lg mb-0.5 cursor-pointer"
               data-fecha="${dia.fecha}" data-camion-idx="${i}" data-camion-id="${cam.camion_id}"
               style="display:${collapsed ? "none" : ""};background:${visible ? color + "18" : "rgba(255,255,255,0.02)"};border-left:3px solid ${color};">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-1.5">
                <span class="text-xs font-semibold">${cam.camion_nombre}</span>
                <span class="inline-block w-2 h-2 rounded-full" style="background:${activo ? "#43A047" : "#78909C"};"></span>
              </div>
              <div class="text-[10px] flex gap-3 mt-0.5" style="color:rgba(255,255,255,0.5);">
                <span>${horaInicio} — ${horaFin}</span>
                <span>${cam.registros} puntos</span>
                <span>Máx. ${maxVel.toFixed(0)} km/h</span>
              </div>
            </div>
            <span class="tracking-eye shrink-0 text-xs" style="opacity:${visible ? "1" : "0.3"};color:${color};" title="${visible ? "Ocultar ruta" : "Mostrar ruta"}">
              ${visible
                ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`
                : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`}
            </span>
            <button type="button" class="tracking-delete-camion btn btn-xs btn-ghost btn-square shrink-0"
                    data-fecha="${dia.fecha}" data-camion-id="${cam.camion_id}" data-camion-nombre="${cam.camion_nombre}" data-registros="${cam.registros}"
                    title="Eliminar tracking de ${cam.camion_nombre}" style="opacity:0.4;" onclick="event.stopPropagation()">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#E53935" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
              </svg>
            </button>
          </div>`;
      }).join("");

      return header + camiones;
    }).join("");

    // Toggle colapso por día
    body.querySelectorAll<HTMLElement>(".tracking-dia-toggle").forEach(el => {
      el.addEventListener("click", () => {
        const fecha = el.dataset.fecha!;
        if (_colapsados.has(fecha)) _colapsados.delete(fecha);
        else _colapsados.add(fecha);
        const collapsed = _colapsados.has(fecha);
        const arrow = el.querySelector<HTMLElement>("span.transition-transform");
        if (arrow) arrow.classList.toggle("rotate-90", !collapsed);
        body.querySelectorAll<HTMLElement>(`.tracking-dia-content[data-fecha="${fecha}"]`)
          .forEach(row => { row.style.display = collapsed ? "none" : ""; });
      });
    });

    // Borrar tracking de un camión en una fecha
    body.querySelectorAll<HTMLButtonElement>(".tracking-delete-camion").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const fecha = btn.dataset.fecha!;
        const camionId = btn.dataset.camionId!;
        const camionNombre = btn.dataset.camionNombre || "";
        const registros = btn.dataset.registros || "0";
        const ok = await confirmDialog(
          `¿Eliminar ${registros} registros de ${camionNombre} del ${fmtFecha(fecha)}?`
        );
        if (!ok) return;
        btn.setAttribute("disabled", "");
        try {
          const resp = await fetch(`/maps/api/tracking-camion/delete/`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
            body: JSON.stringify({ fecha, camion_id: parseInt(camionId) }),
          });
          if (!resp.ok) throw new Error();
          const data = await resp.json();
          // Limpiar ruta de ese camión
          const key = rutaKey(fecha, parseInt(camionId));
          if (_rutas.has(key)) {
            map.removeLayer(_rutas.get(key)!);
            _rutas.delete(key);
          }
          // Remover camión del día
          const dia = _data.find(d => d.fecha === fecha);
          if (dia) {
            dia.camiones = dia.camiones.filter(c => c.camion_id !== parseInt(camionId));
          }
          _data = _data.filter(d => d.camiones.length > 0);
          render();
          createToast("tracking", "map", `${data.deleted} registros eliminados`, "top", "success");
        } catch {
          btn.removeAttribute("disabled");
          createToast("tracking", "map", "Error al eliminar tracking", "top", "error");
        }
      });
    });

    // Click en fila de camión: toggle ruta en el mapa
    body.querySelectorAll<HTMLElement>(".tracking-camion-row").forEach(el => {
      el.addEventListener("click", () => {
        const fecha = el.dataset.fecha!;
        const camIdx = parseInt(el.dataset.camionIdx!);
        const dia = _data.find(d => d.fecha === fecha);
        if (!dia) return;
        const cam = dia.camiones[camIdx];
        if (!cam) return;
        const shown = toggleRuta(fecha, cam, camIdx);
        // Actualizar visual de la fila
        const color = ROUTE_COLORS[camIdx % ROUTE_COLORS.length];
        el.style.background = shown ? color + "18" : "rgba(255,255,255,0.02)";
        const eye = el.querySelector<HTMLElement>(".tracking-eye");
        if (eye) {
          eye.style.opacity = shown ? "1" : "0.3";
          eye.innerHTML = shown
            ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`
            : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
        }
        if (shown) {
          const key = rutaKey(fecha, cam.camion_id);
          const pl = _rutas.get(key);
          if (pl) map.flyToBounds(pl.getBounds().pad(0.15), { duration: 1 });
        }
      });
    });
  }

  // Filtros
  const selDias = document.getElementById("tracking-sel-dias") as HTMLSelectElement | null;
  const selCamion = document.getElementById("tracking-sel-camion") as HTMLSelectElement | null;
  const btnRecargar = document.getElementById("tracking-btn-recargar");

  if (selDias) {
    selDias.addEventListener("change", () => { _dias = parseInt(selDias.value); cargar(); });
  }
  if (selCamion) {
    selCamion.addEventListener("change", () => { _camionFiltro = selCamion.value; cargar(); });
  }
  if (btnRecargar) {
    btnRecargar.addEventListener("click", () => cargar());
  }

  return {
    open() {
      const modal = document.getElementById("modal-tracking") as HTMLDialogElement;
      const cnt = document.getElementById("modalTrackingContent");
      const btn = document.getElementById("modalTrackingCollapseBtn");
      if (cnt) cnt.style.display = "";
      if (btn) btn.textContent = "▼";
      modal?.show();
      cargar();
    },
  };
}
