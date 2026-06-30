import type { Map } from 'leaflet';
import { createToast } from './toast';
import { renderClientCard, attachCardListeners, type CardClient } from './clientCard';
import { buildCamionOptions } from './camiones';

interface Client {
  id: number;
  name: string;
  tel1: string;
  address: string;
  lat: number;
  lon: number;
  cost: number;
  status: string;
  user: string;
  service: string;
  created_at: string;
  camion?: number | null;
  camion_iniciales?: string | null;
}


function normalizeText(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function getCookie(name: string): string {
  let cookieValue = '';
  for (const cookie of document.cookie.split(';')) {
    const c = cookie.trim();
    if (c.startsWith(name + '=')) {
      cookieValue = decodeURIComponent(c.substring(name.length + 1));
      break;
    }
  }
  return cookieValue;
}

async function editClient(client: Client): Promise<void> {
  const editModal = document.createElement('dialog');
  editModal.className = 'modal';
  editModal.innerHTML = `
    <div class="modal-box w-11/12 max-w-2xl bg-primary/20">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-bold text-lg">Editar cliente</h3>
        <button type="button" class="btn btn-sm btn-circle btn-ghost text-lg" onclick="this.closest('dialog').close()">✕</button>
      </div>
      <form id="editClientForm" class="flex flex-col gap-3">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div class="form-control">
            <label class="label"><span class="label-text">Nombre</span></label>
            <input type="text" id="editName" class="input input-bordered" value="${client.name || ''}" />
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text">Teléfono</span></label>
            <input type="text" id="editPhone" class="input input-bordered" value="${client.tel1 || ''}" />
          </div>
          <div class="form-control sm:col-span-2">
            <label class="label"><span class="label-text">Dirección / Comentario</span></label>
            <input type="text" id="editAddress" class="input input-bordered" value="${client.address || ''}" />
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text">Precio Bs.</span></label>
            <input type="number" id="editCost" class="input input-bordered" value="${client.cost || ''}" />
          </div>
          <div class="form-control">
            <label class="label"><span class="label-text">Estado</span></label>
            <select id="editStatus" class="select select-bordered">
              <option value="PRG" ${client.status === 'PRG' ? 'selected' : ''}>Programado</option>
              <option value="COT" ${client.status === 'COT' ? 'selected' : ''}>Cotizado</option>
              <option value="EJE" ${client.status === 'EJE' ? 'selected' : ''}>Ejecutado</option>
              <option value="CAN" ${client.status === 'CAN' ? 'selected' : ''}>Cancelado</option>
              <option value="NEG" ${client.status === 'NEG' ? 'selected' : ''}>L. negra</option>
            </select>
          </div>
          <div class="form-control sm:col-span-2">
            <label class="label"><span class="label-text">Chofer / Camión</span></label>
            <select id="editCamion" class="select select-bordered">
              ${buildCamionOptions(client.camion ?? null)}
            </select>
          </div>
        </div>
        <div class="flex gap-2 justify-end mt-2">
          <button type="button" class="btn btn-ghost" onclick="this.closest('dialog').close()">Cancelar</button>
          <button type="submit" class="btn btn-primary">Guardar</button>
        </div>
      </form>
    </div>
    <form method="dialog" class="modal-backdrop"><button>Cerrar</button></form>
  `;

  document.body.appendChild(editModal);
  editModal.showModal();

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
      service: client.service || 'NOR',
      user: client.user || 'ADM',
    };

    try {
      const response = await fetch(`/api/v1/clientes/${client.id}/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken') },
        body: JSON.stringify(updatedClient),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      createToast('editClient', 'map', 'Cliente actualizado', 'top', 'success');
      setTimeout(() => {
        editModal.close();
        editModal.remove();
        const searchInput = document.getElementById('searchNameInput') as HTMLInputElement;
        if (searchInput) searchInput.dispatchEvent(new Event('input'));
      }, 500);
    } catch (error) {
      createToast('editClient', 'map', `Error: ${(error as Error).message}`, 'top', 'error');
    }
  });
}

function renderResults(clients: Client[], container: HTMLElement, map: Map, modal: HTMLDialogElement) {
  if (clients.length === 0) {
    container.innerHTML = `<p class="text-sm text-base-content/50 text-center col-span-2 py-4">No se encontraron resultados</p>`;
    return;
  }

  const cardMap = new Map<number, CardClient>();
  container.innerHTML = clients.map(c => {
    cardMap.set(c.id, c);
    return renderClientCard(c, { showFlyTo: true, showEdit: true });
  }).join("");

  attachCardListeners(container, cardMap, {
    onFly:  (c) => { map.flyTo([c.lat, c.lon], 16); modal.close(); },
    onEdit: (c) => editClient(c as Client),
  });
}

export function initializeSearchModal(map: Map): void {
  const modal = document.getElementById('searchClientModal') as HTMLDialogElement;
  if (!modal) { console.error('Modal element not found'); return; }

  const nameInput  = document.getElementById('searchNameInput') as HTMLInputElement;
  const phoneInput = document.getElementById('searchPhoneInput') as HTMLInputElement;
  const container  = document.getElementById('searchResultsBody') as HTMLElement;
  if (!nameInput || !phoneInput || !container) { console.error('Required elements not found'); return; }

  let searchTimeout: ReturnType<typeof setTimeout>;

  const performSearch = async () => {
    const nameQuery  = normalizeText(nameInput.value.trim());
    const phoneQuery = phoneInput.value.trim();

    if (nameQuery.length < 2 && phoneQuery.length < 2) {
      container.innerHTML = `<p class="text-sm text-base-content/50 text-center col-span-2 py-4">Ingrese al menos 2 caracteres</p>`;
      return;
    }

    try {
      const resp = await fetch('/api/v1/clientes/');
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const clients = await resp.json() as Client[];

      const filtered = clients.filter(c => {
        const nameMatch  = nameQuery.length >= 2  ? normalizeText(c.name || '').toLowerCase().includes(nameQuery.toLowerCase()) : true;
        const phoneMatch = phoneQuery.length >= 2 ? (c.tel1 || '').includes(phoneQuery) : true;
        return nameMatch && phoneMatch;
      });

      renderResults(filtered, container, map, modal);
    } catch (error) {
      container.innerHTML = `<p class="text-sm text-error text-center col-span-2 py-4">Error al buscar clientes</p>`;
      console.error(error);
    }
  };

  [nameInput, phoneInput].forEach(input => {
    input.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(performSearch, 300);
    });
  });

  modal.addEventListener('keydown', (e) => { if (e.key === 'Escape') modal.close(); });

  modal.showModal();
  nameInput.focus();
}
