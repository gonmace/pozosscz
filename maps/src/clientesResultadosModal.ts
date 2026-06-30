import type { Map } from "leaflet";
import { renderClientCard, attachCardListeners, type CardClient } from "./utils/clientCard";

export interface ClienteResultado {
  id: number;
  name: string;
  tel1: string;
  tel2?: string;
  address: string;
  lat: number;
  lon: number;
  cost: number;
  status: string;
  created_at?: string;
}

const STATUS_ORDER: Record<string, number> = { PRG: 0, EJE: 1, CAN: 2, COT: 3 };

export function showClientesResultadosModal(clients: ClienteResultado[], map: Map) {
  const modal   = document.getElementById("client-results-modal") as HTMLDialogElement | null;
  const countEl = document.getElementById("modal-client-count");
  const listEl  = document.getElementById("modal-client-list");
  if (!modal || !listEl) return;

  // Ordenar: PRG → EJE → CAN → COT
  const sorted = [...clients].sort((a, b) =>
    (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9)
  );

  if (countEl) countEl.textContent = sorted.length.toString();

  // Contadores por estado
  const counts: Record<string, number> = { PRG: 0, EJE: 0, CAN: 0, COT: 0 };
  for (const c of sorted) if (c.status in counts) counts[c.status]++;
  for (const [st, id] of [
    ["PRG","modal-client-prg"],["EJE","modal-client-eje"],
    ["CAN","modal-client-can"],["COT","modal-client-cot"],
  ] as [string, string][]) {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = counts[st] > 0 ? `${st} ${counts[st]}` : "";
      el.style.display = counts[st] > 0 ? "" : "none";
    }
  }

  // Render cards reutilizables
  const cardMap = new Map<number, CardClient>();
  listEl.innerHTML = sorted.map(c => {
    cardMap.set(c.id, c);
    return renderClientCard(c, { clickable: true, showFlyTo: false });
  }).join("");

  // Fly-to al hacer click en la card
  attachCardListeners(listEl, cardMap, {
    onFly: (c) => { modal.close(); map.flyTo([c.lat, c.lon], 17); },
  });

  // CSV export
  const exportBtn = document.getElementById("export-csv");
  if (exportBtn) {
    exportBtn.onclick = () => {
      const rows = [
        ["Nombre", "Teléfono", "Precio", "Dirección", "Estado", "Fecha"].join(","),
        ...sorted.map(c => [
          `"${(c.name || "").replace(/"/g, '""')}"`,
          `"${(c.tel1 || "").replace(/"/g, '""')}"`,
          c.cost || "",
          `"${(c.address || "").replace(/"/g, '""')}"`,
          c.status,
          c.created_at ? new Date(c.created_at).toLocaleDateString("es-BO") : "",
        ].join(",")),
      ].join("\n");
      const blob = new Blob([`\ufeff${rows}`], { type: "text/csv;charset=utf-8;" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `clientes_${new Date().toISOString().split("T")[0]}.csv`;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    };
  }

  modal.showModal();
}
