import type { Map } from "leaflet";
import dragModal from "./utils/dragModal";
import { confirmDialog, createToast } from "./utils/toast";

interface EventoCamion {
  id: number;
  camion_id: number;
  camion_nombre: string;
  camion_marca: string;
  cliente_id: number | null;
  cliente_nombre: string | null;
  tipo: string;
  tipo_display: string;
  lat: number;
  lon: number;
  comentario: string;
  nivel_tanque: number | null;
  monto: number | null;
  factura: number | null;
  qr: boolean;
  registrado_at: string;
}

interface DiaEventos {
  fecha: string;
  eventos: EventoCamion[];
}

const TIPO_CONFIG: Record<string, { color: string; bg: string; icon: string }> = {
  SRV_EJE: { color: "#43A047", bg: "#43A04718", icon: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>` },
  SRV_CAN: { color: "#E53935", bg: "#E5393518", icon: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>` },
  TKQ_VAC: { color: "#ECEFF1", bg: "#ECEFF118", icon: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v14"/><path d="m6 11 6 6 6-6"/><path d="M19 21H5"/></svg>` },
  TKQ_UPD: { color: "#29B6F6", bg: "#29B6F618", icon: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.51"/></svg>` },
  TKQ_LLE: { color: "#E53935", bg: "#E5393518", icon: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>` },
  DSL_CAR: { color: "#FDD835", bg: "#FDD83518", icon: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="22" x2="15" y2="22"/><line x1="4" y1="9" x2="14" y2="9"/><path d="M14 22V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v18"/><path d="M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2a2 2 0 0 0 2-2V9.83a2 2 0 0 0-.59-1.42L18 5"/></svg>` },
  TRK_ACT: { color: "#66BB6A", bg: "#66BB6A18", icon: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>` },
  TRK_DES: { color: "#78909C", bg: "#78909C18", icon: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" y1="2" x2="12" y2="12"/></svg>` },
};

function isWeekend(iso: string): boolean {
  const [y, m, d] = iso.split("-");
  const day = new Date(parseInt(y), parseInt(m) - 1, parseInt(d)).getDay();
  return day === 0 || day === 6;
}

function fmtHora(iso: string): string {
  const dt = new Date(iso);
  return isNaN(dt.getTime()) ? iso : dt.toLocaleString("es-BO", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function fmtFecha(iso: string): string {
  const [y, m, d] = iso.split("-");
  const dt = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
  return dt.toLocaleDateString("es-BO", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
}

function fmtNivel(n: number | null): string {
  if (n == null) return "";
  return `${Math.round(n * 100)}%`;
}

function qrIconHtml(qr: boolean): string {
  return qr
    ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#43A047" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;"><polyline points="20 6 9 17 4 12"/></svg>`
    : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E53935" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
}

function getCsrf(): string {
  return document.cookie.match(/csrftoken=([^;]+)/)?.[1] ?? "";
}

function fmtNeto(n: number): string {
  const color = n < 0 ? "#E53935" : "rgba(255,255,255,0.8)";
  return `<span style="color:${color};">Bs. ${n.toLocaleString()}</span>`;
}

function pctChofer(chofer: number, admin: number): string {
  const total = chofer + admin;
  if (total <= 0) return "0%";
  return `${Math.round((chofer / total) * 100)}%`;
}

function pctSocios(chofer: number, admin: number): string {
  const total = chofer + admin;
  if (total <= 0) return "0%";
  return `${Math.round((admin / total) * 100)}%`;
}

function nivelColor(n: number | null): string {
  if (n == null) return "rgba(255,255,255,0.25)";
  if (n >= 0.99) return "#E53935";
  if (n >= 0.60) return "#FDD835";
  if (n >= 0.25) return "#43A047";
  return "#ECEFF1";
}

function renderTipoBadge(tipo: string, display: string, nivel: number | null = null): string {
  const cfg = TIPO_CONFIG[tipo] ?? { color: "#9E9E9E", bg: "#9E9E9E18", icon: "" };
  const color = tipo === "TKQ_UPD" && nivel != null ? nivelColor(nivel) : cfg.color;
  const bg = `${color}18`;
  return `<span class="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md"
                style="background:${bg};color:${color};border:1px solid ${color}40;">
            ${cfg.icon}${display}
          </span>`;
}

export function initEventosCamionModal(map: Map) {
  let _dias = 30;
  let _camionFiltro = "";
  let _data: DiaEventos[] = [];
  let _colapsados = new Set<string>();
  let _loading = false;

  dragModal("draggableEventosCamion", "modalEventosCamionHeader");

  const collapseBtn = document.getElementById("modalEventosCamionCollapseBtn");
  const content = document.getElementById("modalEventosCamionContent");
  if (collapseBtn && content) {
    collapseBtn.onclick = () => {
      const collapsed = content.style.display === "none";
      content.style.display = collapsed ? "" : "none";
      collapseBtn.textContent = collapsed ? "▼" : "▲";
    };
  }
  const closeBtn = document.getElementById("modalEventosCamionCloseBtn");
  if (closeBtn) {
    closeBtn.onclick = () => {
      (document.getElementById("modal-eventos-camion") as HTMLDialogElement)?.close();
    };
  }

  function mostrarMensajeSeleccionar() {
    const list = document.getElementById("eventos-camion-body");
    if (list) list.innerHTML = `<tr><td colspan="10" class="text-center py-6 text-xs opacity-40">Seleccione un camión para ver sus eventos</td></tr>`;
  }

  async function cargar() {
    if (!_camionFiltro) {
      _data = [];
      mostrarMensajeSeleccionar();
      return;
    }
    if (_loading) return;
    _loading = true;
    const list = document.getElementById("eventos-camion-body");
    if (list) list.innerHTML = `<tr><td colspan="10" class="text-center py-6 text-xs opacity-40">Cargando…</td></tr>`;
    try {
      const params = new URLSearchParams({ dias: String(_dias), camion: _camionFiltro });
      const resp = await fetch(`/maps/api/eventos-camion/?${params}`);
      if (!resp.ok) throw new Error("Error al cargar eventos");
      _data = await resp.json();
      render();
    } catch (e) {
      const list2 = document.getElementById("eventos-camion-body");
      if (list2) list2.innerHTML = `<tr><td colspan="10" class="text-center py-6 text-xs text-error">Error al cargar</td></tr>`;
    } finally {
      _loading = false;
    }
  }

  function recomputarTotales(id: number) {
    const tbody = document.getElementById("eventos-camion-body");
    if (!tbody) return;
    const dia = _data.find(d => d.eventos.some(e => e.id === id));
    if (!dia) return;
    const totalAdmin = dia.eventos.reduce((s, e) => s + (e.qr ? (e.factura ?? e.monto ?? 0) : 0), 0);
    const totalChofer = dia.eventos.reduce((s, e) => s + (!e.qr ? (e.factura ?? e.monto ?? 0) : 0), 0);
    const totalSrvEje = dia.eventos
      .filter(e => e.tipo === "SRV_EJE")
      .reduce((s, e) => s + (e.factura ?? e.monto ?? 0), 0);
    const totalDia = dia.eventos.reduce((s, e) => s + (e.factura ?? e.monto ?? 0), 0);
    const valChofer = Math.round(totalSrvEje * 0.15);
    const valSocios = totalDia - valChofer;
    const cell = tbody.querySelector<HTMLElement>(`.eventos-dia-totales[data-fecha="${dia.fecha}"]`);
    if (cell) {
      cell.innerHTML = `<div>Bs. ${totalChofer.toLocaleString()}</div><div>Bs. ${totalAdmin.toLocaleString()}</div>`;
    }
    const cellPct = tbody.querySelector<HTMLElement>(`.eventos-dia-pct[data-fecha="${dia.fecha}"]`);
    if (cellPct) {
      cellPct.innerHTML = `<div>% Chofer</div><div>% Socios</div>`;
    }
    const cellPctVal = tbody.querySelector<HTMLElement>(`.eventos-dia-pct-val[data-fecha="${dia.fecha}"]`);
    if (cellPctVal) {
      cellPctVal.innerHTML = `<div>Bs. ${valChofer.toLocaleString()}</div><div>Bs. ${valSocios.toLocaleString()}</div>`;
    }
    const cellNeto = tbody.querySelector<HTMLElement>(`.eventos-dia-neto[data-fecha="${dia.fecha}"]`);
    if (cellNeto) {
      cellNeto.innerHTML = `<div>${fmtNeto(totalChofer - valChofer)}</div><div>&nbsp;</div>`;
    }
  }

  function render() {
    const tbody = document.getElementById("eventos-camion-body");
    if (!tbody) return;

    if (_data.length === 0) {
      const lbl = _dias === 1 ? "el último día" : `los últimos ${_dias} días`;
      tbody.innerHTML = `<tr><td colspan="10" class="text-center py-6 text-xs opacity-40">Sin eventos en ${lbl}</td></tr>`;
      return;
    }

    tbody.innerHTML = _data.map(dia => {
      const collapsed = _colapsados.has(dia.fecha);
      const totalAdmin = dia.eventos.reduce((s, e) => s + (e.qr ? (e.factura ?? e.monto ?? 0) : 0), 0);
      const totalChofer = dia.eventos.reduce((s, e) => s + (!e.qr ? (e.factura ?? e.monto ?? 0) : 0), 0);
      const totalSrvEje = dia.eventos
        .filter(e => e.tipo === "SRV_EJE")
        .reduce((s, e) => s + (e.factura ?? e.monto ?? 0), 0);
      const totalDia = dia.eventos.reduce((s, e) => s + (e.factura ?? e.monto ?? 0), 0);
      const valChofer = Math.round(totalSrvEje * 0.15);
      const valSocios = totalDia - valChofer;
      const wknd = isWeekend(dia.fecha);
      const header = `
        <tr class="cursor-pointer select-none eventos-dia-toggle"
            data-fecha="${dia.fecha}"
            style="background:${wknd ? "rgba(255,152,0,0.15)" : "rgba(255,255,255,0.04)"};border-top:1px solid rgba(255,255,255,0.08);">
          <td colspan="3" class="px-3 py-2">
            <div class="flex items-center gap-2">
              <span class="text-[10px] transition-transform ${collapsed ? "" : "rotate-90"}" style="color:rgba(255,255,255,0.4);">▶</span>
              <span class="text-xs font-bold capitalize" style="color:rgba(255,255,255,0.8);">${fmtFecha(dia.fecha)}</span>
              <span class="text-[10px] font-semibold ml-1" style="color:rgba(255,255,255,0.35);">${dia.eventos.length} evento${dia.eventos.length !== 1 ? "s" : ""}</span>
            </div>
          </td>
          <td class="px-2 py-1 text-left text-[10px] whitespace-nowrap leading-tight" style="color:#FFFFFF;">
            <div>Chofer</div>
            <div>Administrador</div>
          </td>
          <td></td>
          <td class="eventos-dia-totales px-2 py-1 text-right text-[10px] whitespace-nowrap leading-tight" data-fecha="${dia.fecha}" style="color:#FFD54F;">
            <div>Bs. ${totalChofer.toLocaleString()}</div>
            <div>Bs. ${totalAdmin.toLocaleString()}</div>
          </td>
          <td class="eventos-dia-pct px-2 py-1 text-center text-[10px] whitespace-nowrap leading-tight" data-fecha="${dia.fecha}" style="color:rgba(255,255,255,0.6);">
            <div>% Chofer</div>
            <div>% Socios</div>
          </td>
          <td class="eventos-dia-pct-val px-2 py-1 text-left text-[10px] whitespace-nowrap leading-tight" data-fecha="${dia.fecha}" style="color:rgba(255,255,255,0.8);">
            <div>Bs. ${valChofer.toLocaleString()}</div>
            <div>Bs. ${valSocios.toLocaleString()}</div>
          </td>
          <td class="eventos-dia-neto px-2 py-1 text-center text-[10px] whitespace-nowrap leading-tight" data-fecha="${dia.fecha}">
            <div>${fmtNeto(totalChofer - valChofer)}</div>
            <div>&nbsp;</div>
          </td>
        </tr>`;

      const rows = dia.eventos.map(ev => {
        const cfg = TIPO_CONFIG[ev.tipo] ?? { color: "#9E9E9E", bg: "#9E9E9E18", icon: "" };
        return `
          <tr class="eventos-dia-row" data-fecha="${dia.fecha}"
              style="display:${collapsed ? "none" : ""};border-bottom:1px solid rgba(255,255,255,0.04);">
            <td class="px-3 py-1.5 text-[11px] font-mono whitespace-nowrap" style="color:rgba(255,255,255,0.5);">${fmtHora(ev.registrado_at)}</td>
            <td class="px-2 py-1.5 text-[11px] font-medium whitespace-nowrap">${ev.camion_nombre}</td>
            <td class="px-2 py-1.5">${renderTipoBadge(ev.tipo, ev.tipo_display, ev.nivel_tanque)}</td>
            <td class="px-2 py-1.5 text-[11px] max-w-[120px] truncate" style="color:rgba(255,255,255,0.6);" title="${ev.cliente_nombre ?? ""}">
              ${ev.cliente_nombre ?? '<span style="opacity:0.25">—</span>'}
            </td>
            <td class="px-2 py-1.5 text-[11px] text-center" style="color:${nivelColor(ev.nivel_tanque)};">
              ${fmtNivel(ev.nivel_tanque) || '<span style="opacity:0.25;font-weight:normal;">—</span>'}
            </td>
            <td class="px-2 py-1.5 text-[11px] text-right whitespace-nowrap">
              <span class="eventos-monto-cell" data-id="${ev.id}" data-monto="${ev.monto ?? ""}"
                    style="color:#FFD54F;cursor:pointer;" title="Click para editar">
                ${ev.monto != null ? `Bs. ${ev.monto.toLocaleString()}` : '<span style="opacity:0.25;color:rgba(255,255,255,0.25);">—</span>'}
              </span>
            </td>
            <td class="px-2 py-1.5 text-[11px] text-right whitespace-nowrap">
              ${ev.tipo === "SRV_EJE"
                ? `<input type="number" class="eventos-factura-input" data-id="${ev.id}" data-prev="${ev.factura ?? ""}"
                          data-monto="${ev.monto ?? ""}"
                          value="${ev.factura ?? ""}" placeholder="—" min="0" step="1"
                          style="width:64px;background:transparent;border:1px solid rgba(255,255,255,0.1);border-radius:4px;padding:1px 4px;color:#FFB74D;font-weight:bold;text-align:right;font-size:11px;"
                          title="Factura (click para calcular monto − 16%)" />`
                : `<span style="color:#FFB74D;font-weight:bold;">${ev.factura != null ? `Bs. ${ev.factura.toLocaleString()}` : '<span style="opacity:0.25;font-weight:normal;">—</span>'}</span>`}
            </td>
            <td class="px-2 py-1.5 text-center">
              ${ev.monto != null
                ? `<button type="button" class="eventos-qr-toggle" data-id="${ev.id}" data-qr="${ev.qr ? "1" : "0"}"
                          title="Click para cambiar QR"
                          style="cursor:pointer;border:none;background:transparent;padding:2px;border-radius:4px;line-height:0;">
                    ${qrIconHtml(ev.qr)}
                   </button>`
                : `<span style="opacity:0.25">—</span>`}
            </td>
            <td class="px-2 py-1.5 text-[10px] max-w-[100px] truncate" style="color:rgba(255,255,255,0.4);" title="${ev.comentario}">
              ${ev.comentario || '<span style="opacity:0.25">—</span>'}
            </td>
            <td class="px-2 py-1.5 text-center">
              <button type="button" class="eventos-delete-btn" data-id="${ev.id}" title="Eliminar evento"
                      style="cursor:pointer;border:none;background:transparent;padding:2px;border-radius:4px;line-height:0;opacity:0.5;">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#E53935" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                </svg>
              </button>
            </td>
          </tr>`;
      }).join("");

      return header + rows;
    }).join("");

    // Editar Monto inline
    tbody.querySelectorAll<HTMLElement>(".eventos-monto-cell").forEach(span => {
      span.addEventListener("click", () => {
        if (span.querySelector("input")) return;
        const id = parseInt(span.dataset.id!);
        const prev = span.dataset.monto === "" ? null : parseInt(span.dataset.monto!);
        const original = span.innerHTML;
        const inp = document.createElement("input");
        inp.type = "number";
        inp.value = prev != null ? String(prev) : "";
        inp.placeholder = "—";
        inp.min = "0";
        inp.step = "1";
        inp.style.cssText = "width:64px;background:transparent;border:1px solid rgba(255,255,255,0.2);border-radius:4px;padding:1px 4px;color:#FFD54F;font-weight:bold;text-align:right;font-size:11px;";
        span.innerHTML = "";
        span.appendChild(inp);
        inp.focus();
        inp.select();

        let saved = false;
        const commit = async () => {
          if (saved) return;
          saved = true;
          const raw = inp.value.trim();
          const nuevo = raw === "" ? null : parseInt(raw);
          if (nuevo === prev) { span.innerHTML = original; return; }
          try {
            const resp = await fetch(`/maps/api/eventos-camion/${id}/monto/`, {
              method: "POST",
              headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
              body: JSON.stringify({ monto: nuevo }),
            });
            if (!resp.ok) throw new Error();
            const data = await resp.json();
            const val: number | null = data.monto;
            span.dataset.monto = val != null ? String(val) : "";
            span.innerHTML = val != null ? `Bs. ${val.toLocaleString()}` : '<span style="opacity:0.25;color:rgba(255,255,255,0.25);">—</span>';
            for (const dia of _data) {
              const ev = dia.eventos.find(x => x.id === id);
              if (ev) { ev.monto = val; break; }
            }
            recomputarTotales(id);
          } catch {
            span.innerHTML = original;
            createToast("monto", "map", "Error al actualizar monto", "top", "error");
          }
        };
        inp.addEventListener("blur", commit);
        inp.addEventListener("keydown", (e) => {
          if (e.key === "Enter") { e.preventDefault(); inp.blur(); }
          if (e.key === "Escape") { saved = true; span.innerHTML = original; }
        });
      });
    });

    // Editar Factura por evento
    tbody.querySelectorAll<HTMLInputElement>(".eventos-factura-input").forEach(inp => {
      const commit = async () => {
        const id = parseInt(inp.dataset.id!);
        const prev = inp.dataset.prev === "" ? null : parseInt(inp.dataset.prev!);
        const raw = inp.value.trim();
        // 0 y vacío se tratan como "sin valor" (se recalcula desde monto − 16% al hacer focus)
        const parsed = raw === "" ? null : parseInt(raw);
        const nuevo = parsed === 0 ? null : parsed;
        if (nuevo === prev) {
          if (raw !== (inp.dataset.prev ?? "")) inp.value = inp.dataset.prev ?? "";
          return;
        }
        inp.disabled = true;
        try {
          const resp = await fetch(`/maps/api/eventos-camion/${id}/factura/`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
            body: JSON.stringify({ factura: nuevo }),
          });
          if (!resp.ok) throw new Error("Error al actualizar factura");
          const data = await resp.json();
          const serverVal: number | null = data.factura;
          inp.value = serverVal != null ? String(serverVal) : "";
          inp.dataset.prev = inp.value;
          for (const dia of _data) {
            const ev = dia.eventos.find(x => x.id === id);
            if (ev) { ev.factura = serverVal; break; }
          }
          recomputarTotales(id);
        } catch (err) {
          console.error(err);
          inp.value = prev != null ? String(prev) : "";
        } finally {
          inp.disabled = false;
        }
      };
      inp.addEventListener("focus", () => {
        if (inp.value !== "") return;
        const montoStr = inp.dataset.monto ?? "";
        if (montoStr === "") return;
        const monto = parseInt(montoStr);
        if (!isFinite(monto)) return;
        inp.value = String(Math.round(monto * 0.84));
        inp.select();
      });
      inp.addEventListener("blur", commit);
      inp.addEventListener("keydown", (e) => {
        if (e.key === "Enter") { e.preventDefault(); inp.blur(); }
        if (e.key === "Escape") {
          inp.value = inp.dataset.prev ?? "";
          inp.blur();
        }
      });
    });

    // Toggle QR por evento
    tbody.querySelectorAll<HTMLButtonElement>(".eventos-qr-toggle").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const id = parseInt(btn.dataset.id!);
        const nuevoQr = btn.dataset.qr !== "1";
        btn.disabled = true;
        btn.style.opacity = "0.4";
        try {
          const resp = await fetch(`/maps/api/eventos-camion/${id}/qr/`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
            body: JSON.stringify({ qr: nuevoQr }),
          });
          if (!resp.ok) throw new Error("Error al actualizar QR");
          const data = await resp.json();
          btn.dataset.qr = data.qr ? "1" : "0";
          btn.innerHTML = qrIconHtml(!!data.qr);
          for (const dia of _data) {
            const ev = dia.eventos.find(x => x.id === id);
            if (ev) { ev.qr = !!data.qr; break; }
          }
          recomputarTotales(id);
        } catch (err) {
          console.error(err);
        } finally {
          btn.disabled = false;
          btn.style.opacity = "";
        }
      });
    });

    // Borrar evento
    tbody.querySelectorAll<HTMLButtonElement>(".eventos-delete-btn").forEach(btn => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const id = parseInt(btn.dataset.id!);
        const ok = await confirmDialog("¿Está seguro que desea eliminar este evento?");
        if (!ok) return;
        btn.disabled = true;
        btn.style.opacity = "0.3";
        try {
          const resp = await fetch(`/maps/api/eventos-camion/${id}/`, {
            method: "DELETE",
            headers: { "X-CSRFToken": getCsrf() },
          });
          if (!resp.ok) throw new Error();
          for (const dia of _data) {
            const idx = dia.eventos.findIndex(x => x.id === id);
            if (idx >= 0) { dia.eventos.splice(idx, 1); break; }
          }
          _data = _data.filter(d => d.eventos.length > 0);
          render();
          createToast("evento", "map", "Evento eliminado", "top", "success");
        } catch {
          btn.disabled = false;
          btn.style.opacity = "0.5";
          createToast("evento", "map", "Error al eliminar evento", "top", "error");
        }
      });
    });

    // Toggle colapso por día
    tbody.querySelectorAll<HTMLElement>(".eventos-dia-toggle").forEach(tr => {
      tr.addEventListener("click", () => {
        const fecha = tr.dataset.fecha!;
        if (_colapsados.has(fecha)) {
          _colapsados.delete(fecha);
        } else {
          _colapsados.add(fecha);
        }
        // Actualizar visibilidad y flecha sin re-render completo
        const collapsed = _colapsados.has(fecha);
        const arrow = tr.querySelector<HTMLElement>("span.transition-transform");
        if (arrow) arrow.classList.toggle("rotate-90", !collapsed);
        tbody.querySelectorAll<HTMLElement>(`.eventos-dia-row[data-fecha="${fecha}"]`)
          .forEach(row => { row.style.display = collapsed ? "none" : ""; });
      });
    });
  }

  // Filtros
  const selDias = document.getElementById("eventos-sel-dias") as HTMLSelectElement | null;
  const selCamion = document.getElementById("eventos-sel-camion") as HTMLSelectElement | null;
  const btnRecargar = document.getElementById("eventos-btn-recargar");
  const trackingToggle = document.getElementById("eventos-tracking-toggle") as HTMLInputElement | null;
  const trackingLabel = document.getElementById("eventos-tracking-label") as HTMLElement | null;
  const intervaloInput = document.getElementById("eventos-intervalo") as HTMLInputElement | null;
  let _updatingToggle = false;

  function updateTrackingLabel(activo: boolean) {
    if (!trackingLabel) return;
    trackingLabel.textContent = activo ? "Activo" : "Inactivo";
    trackingLabel.style.color = activo ? "#43A047" : "";
  }

  function updateTrackingToggle() {
    if (!trackingToggle || !selCamion) return;
    const opt = selCamion.selectedOptions[0];
    if (!opt || !selCamion.value) {
      trackingToggle.checked = false;
      trackingToggle.setAttribute("disabled", "");
      if (intervaloInput) { intervaloInput.value = ""; intervaloInput.setAttribute("disabled", ""); }
      updateTrackingLabel(false);
      return;
    }
    trackingToggle.removeAttribute("disabled");
    const activo = opt.getAttribute("data-tracking") === "1";
    _updatingToggle = true;
    trackingToggle.checked = activo;
    _updatingToggle = false;
    updateTrackingLabel(activo);
    if (intervaloInput) {
      intervaloInput.removeAttribute("disabled");
      const intVal = opt.getAttribute("data-intervalo") || "30";
      intervaloInput.value = intVal;
      intervaloInput.dataset.prev = intVal;
    }
  }

  if (selDias) {
    selDias.addEventListener("change", () => { _dias = parseInt(selDias.value); cargar(); });
  }
  if (selCamion) {
    const savedCamion = localStorage.getItem("eventos.camionFiltro");
    if (savedCamion && selCamion.querySelector<HTMLOptionElement>(`option[value="${savedCamion}"]`)) {
      selCamion.value = savedCamion;
      _camionFiltro = savedCamion;
      updateTrackingToggle();
    }
    selCamion.addEventListener("change", () => {
      _camionFiltro = selCamion.value;
      localStorage.setItem("eventos.camionFiltro", _camionFiltro);
      updateTrackingToggle();
      cargar();
    });
  }
  if (trackingToggle) {
    trackingToggle.addEventListener("change", async () => {
      if (_updatingToggle || !_camionFiltro) return;
      const nuevoValor = trackingToggle.checked;
      trackingToggle.disabled = true;
      try {
        const resp = await fetch(`/maps/api/camion/${_camionFiltro}/tracking/`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
          body: JSON.stringify({ tracking_activo: nuevoValor }),
        });
        if (!resp.ok) throw new Error();
        const data = await resp.json();
        trackingToggle.checked = data.tracking_activo;
        updateTrackingLabel(data.tracking_activo);
        if (selCamion) {
          const opt = selCamion.querySelector<HTMLOptionElement>(`option[value="${_camionFiltro}"]`);
          if (opt) opt.dataset.tracking = data.tracking_activo ? "1" : "0";
        }
        createToast("tracking", "map", `Teléfono ${data.tracking_activo ? "activado" : "desactivado"}`, "top", "success");
      } catch {
        trackingToggle.checked = !nuevoValor;
        createToast("tracking", "map", "Error al cambiar tracking", "top", "error");
      } finally {
        trackingToggle.disabled = false;
      }
    });
  }
  const intervaloBtn = document.getElementById("eventos-intervalo-btn") as HTMLButtonElement | null;

  function updateIntervaloBtn() {
    if (!intervaloBtn || !intervaloInput) return;
    const changed = intervaloInput.value !== intervaloInput.dataset.prev;
    if (changed && !intervaloInput.disabled) {
      intervaloBtn.removeAttribute("disabled");
      intervaloBtn.style.opacity = "1";
      intervaloBtn.style.color = "#43A047";
    } else {
      intervaloBtn.setAttribute("disabled", "");
      intervaloBtn.style.opacity = "0.3";
      intervaloBtn.style.color = "";
    }
  }

  if (intervaloInput) {
    intervaloInput.addEventListener("input", updateIntervaloBtn);
    intervaloInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); intervaloBtn?.click(); }
      if (e.key === "Escape") { intervaloInput.value = intervaloInput.dataset.prev || "30"; updateIntervaloBtn(); }
    });
  }
  if (intervaloBtn) {
    intervaloBtn.addEventListener("click", async () => {
      if (!_camionFiltro || !intervaloInput) return;
      const val = parseInt(intervaloInput.value);
      if (!isFinite(val) || val < 10) { intervaloInput.value = intervaloInput.dataset.prev || "30"; updateIntervaloBtn(); return; }
      intervaloBtn.setAttribute("disabled", "");
      intervaloBtn.style.opacity = "0.3";
      intervaloInput.disabled = true;
      try {
        const resp = await fetch(`/maps/api/camion/${_camionFiltro}/tracking/`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
          body: JSON.stringify({ intervalo_tracking: val }),
        });
        if (!resp.ok) throw new Error();
        const data = await resp.json();
        intervaloInput.value = String(data.intervalo_tracking);
        intervaloInput.dataset.prev = String(data.intervalo_tracking);
        if (selCamion) {
          const opt = selCamion.querySelector<HTMLOptionElement>(`option[value="${_camionFiltro}"]`);
          if (opt) opt.dataset.intervalo = String(data.intervalo_tracking);
        }
        createToast("intervalo", "map", `Intervalo: ${data.intervalo_tracking} seg`, "top", "success");
      } catch {
        intervaloInput.value = intervaloInput.dataset.prev || "30";
        createToast("intervalo", "map", "Error al cambiar intervalo", "top", "error");
      } finally {
        intervaloInput.disabled = false;
        updateIntervaloBtn();
      }
    });
  }
  if (btnRecargar) {
    btnRecargar.addEventListener("click", () => cargar());
  }

  async function refreshTrackingState() {
    if (!_camionFiltro || !trackingToggle || !selCamion) return;
    try {
      const resp = await fetch(`/maps/api/camion/${_camionFiltro}/tracking/`);
      if (!resp.ok) return;
      const data = await resp.json();
      const opt = selCamion.querySelector<HTMLOptionElement>(`option[value="${_camionFiltro}"]`);
      if (opt) {
        opt.dataset.tracking = data.tracking_activo ? "1" : "0";
        opt.dataset.intervalo = String(data.intervalo_tracking);
      }
      _updatingToggle = true;
      trackingToggle.checked = data.tracking_activo;
      _updatingToggle = false;
      updateTrackingLabel(data.tracking_activo);
      if (intervaloInput) {
        intervaloInput.value = String(data.intervalo_tracking);
        intervaloInput.dataset.prev = String(data.intervalo_tracking);
      }
    } catch {}
  }

  return {
    open() {
      const modal = document.getElementById("modal-eventos-camion") as HTMLDialogElement;
      const cnt = document.getElementById("modalEventosCamionContent");
      const btn = document.getElementById("modalEventosCamionCollapseBtn");
      if (cnt) cnt.style.display = "";
      if (btn) btn.textContent = "▼";
      modal?.show();
      cargar();
    },
    refreshTrackingState,
  };
}
