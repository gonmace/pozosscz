import { Map, Marker } from "leaflet";
import { iconRed } from "./ObjectLeaflet";
import { createToast } from "./toast";

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
}

let currentPage = 1;
const itemsPerPage = 50;
let totalPages = 1;
let clients: Client[] = [];

export function tableModal(map: Map) {
  // Create modal container
  const modalContainer = document.createElement("div");
  modalContainer.className = "modal modal-open z-[9999]";
  modalContainer.innerHTML = `
    <div class="modal-box w-11/12 max-w-5xl relative z-[9999]">
      <div class="flex justify-between items-center mb-4">
        <h3 class="font-bold text-lg">Lista de Clientes</h3>
        <button class="btn btn-sm btn-circle btn-ghost" id="closeModal">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div class="overflow-x-auto">
        <table class="table table-zebra w-full">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Teléfono</th>
              <th>Dirección - Comentario</th>
              <th>Precio</th>
              <th>Estado</th>
              <th>Fecha</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody id="clientsTableBody">
          </tbody>
        </table>
      </div>
      <div class="flex justify-between items-center mt-4">
        <div class="join">
          <button class="join-item btn" id="prevPage">«</button>
          <button class="join-item btn">Página <span id="currentPage">1</span></button>
          <button class="join-item btn" id="nextPage">»</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modalContainer);

  // Add event listeners
  const closeModal = document.getElementById("closeModal");
  const prevPage = document.getElementById("prevPage");
  const nextPage = document.getElementById("nextPage");

  closeModal?.addEventListener("click", () => {
    modalContainer.remove();
  });

  prevPage?.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      loadClients();
    }
  });

  nextPage?.addEventListener("click", () => {
    if (currentPage < totalPages) {
      currentPage++;
      loadClients();
    }
  });

  // Load initial data
  loadClients();

  async function loadClients() {
    try {
      const response = await fetch(`/api/v1/clientes/`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      
      // Since the API doesn't support pagination, we'll handle it client-side
      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      clients = data.slice(startIndex, endIndex);
      totalPages = Math.ceil(data.length / itemsPerPage);
      
      updateTable();
      updatePagination();
    } catch (error) {
      createToast("clients", "map", "Error al cargar los clientes", "top", "error");
    }
  }

  function updateTable() {
    const tableBody = document.getElementById("clientsTableBody");
    if (!tableBody) return;

    tableBody.innerHTML = clients.map(client => `
      <tr>
        <td>${client.id}</td>
        <td>${client.name || 'SN'}</td>
        <td>${client.tel1 || 'ST'}</td>
        <td>${client.address || ''}</td>
        <td>${client.cost ? `${client.cost}` : 'Sin precio'}</td>
        <td>
          <div class="badge ${client.status === 'EJE' ? 'badge-success' : 
                            client.status === 'COT' ? 'badge-info' : 
                            client.status === 'NEG' ? 'badge-error' : 'badge-ghost'}">
            ${client.status || 'Sin estado'}
          </div>
        </td>
        <td>${new Date(client.created_at).toLocaleDateString()}</td>
        <td>
          <div class="flex gap-2">
            <button class="btn btn-sm btn-primary locate-client" data-lat="${client.lat}" data-lon="${client.lon}">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            <button class="btn btn-sm btn-secondary edit-client" data-client='${JSON.stringify(client)}'>
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          </div>
        </td>
      </tr>
    `).join("");

    // Add event listeners for locate buttons
    document.querySelectorAll(".locate-client").forEach(button => {
      button.addEventListener("click", (e) => {
        const lat = (e.currentTarget as HTMLElement).getAttribute('data-lat');
        const lon = (e.currentTarget as HTMLElement).getAttribute('data-lon');
        if (lat && lon) {
          map.flyTo([parseFloat(lat), parseFloat(lon)], 16);
          new Marker([parseFloat(lat), parseFloat(lon)], { icon: iconRed }).addTo(map);
        }
      });
    });

    // Add event listeners for edit buttons
    document.querySelectorAll(".edit-client").forEach(button => {
      button.addEventListener("click", (e) => {
        const clientData = (e.currentTarget as HTMLElement).getAttribute('data-client');
        if (clientData) {
          const client = JSON.parse(clientData) as Client;
          editClient(client);
        }
      });
    });
  }

  function updatePagination() {
    const currentPageElement = document.getElementById("currentPage");
    if (currentPageElement) {
      currentPageElement.textContent = currentPage.toString();
    }

    if (prevPage) {
      prevPage.classList.toggle("btn-disabled", currentPage === 1);
    }
    if (nextPage) {
      nextPage.classList.toggle("btn-disabled", currentPage === totalPages);
    }
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
  // Create edit modal
  const editModal = document.createElement('dialog');
  editModal.className = 'modal items-start justify-center z-[9999]';
  editModal.innerHTML = `
    <div class="modal-box w-11/12 max-w-2xl relative z-[9999]">
      <h3 class="font-bold text-lg mb-4">Editar Cliente</h3>
      <form id="editClientForm" class="flex flex-col gap-4">
        <div class="form-control">
          <label class="label">
            <span class="label-text">Nombre</span>
          </label>
          <input type="text" id="editName" class="input input-bordered" value="${client.name || ''}" />
        </div>
        <div class="form-control">
          <label class="label">
            <span class="label-text">Teléfono</span>
          </label>
          <input type="text" id="editPhone" class="input input-bordered" value="${client.tel1 || ''}" />
        </div>
        <div class="form-control">
          <label class="label">
            <span class="label-text">Dirección - Comentario</span>
          </label>
          <input type="text" id="editAddress" class="input input-bordered" value="${client.address || ''}" />
        </div>
        <div class="form-control">
          <label class="label">
            <span class="label-text">Precio Bs.</span>
          </label>
          <input type="number" id="editCost" class="input input-bordered" value="${client.cost || ''}" />
        </div>
        <div class="form-control">
          <label class="label">
            <span class="label-text">Estado</span>
          </label>
          <select id="editStatus" class="select select-bordered">
            <option value="COT" ${client.status === 'COT' ? 'selected' : ''}>Cotizado</option>
            <option value="EJE" ${client.status === 'EJE' ? 'selected' : ''}>Ejecutado</option>
            <option value="NEG" ${client.status === 'NEG' ? 'selected' : ''}>Negado</option>
          </select>
        </div>
        <div class="modal-action">
          <button type="submit" class="btn btn-primary">Guardar</button>
          <button type="button" class="btn" onclick="this.closest('dialog').close()">Cancelar</button>
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

    const updatedClient = {
      ...client,
      name: (document.getElementById('editName') as HTMLInputElement).value,
      tel1: (document.getElementById('editPhone') as HTMLInputElement).value.slice(0, 13),
      address: (document.getElementById('editAddress') as HTMLInputElement).value,
      cost: Number((document.getElementById('editCost') as HTMLInputElement).value),
      status: (document.getElementById('editStatus') as HTMLSelectElement).value,
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
