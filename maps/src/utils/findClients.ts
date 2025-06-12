import { Map } from 'leaflet';
import { createToast } from './toast';

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

// Función para normalizar texto (remover acentos)
function normalizeText(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// Función para editar un cliente
async function editClient(client: Client): Promise<void> {
  // Crear modal de edición
  const editModal = document.createElement('dialog');
  editModal.className = 'modal items-start justify-center';
  editModal.innerHTML = `
    <div class="modal-box w-11/12 max-w-2xl">
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
            <option value="NEG" ${client.status === 'NEG' ? 'selected' : ''}>L.negra</option>
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

  // Manejar el envío del formulario
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
        console.error('Request payload:', updatedClient);
        console.error('Error response:', errorData);
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      // Show success toast first
      createToast('editClient', 'map', 'Cliente actualizado correctamente', 'top', 'success');
      
      // Wait a bit before closing the modal to ensure toast is visible
      setTimeout(() => {
        editModal.close();
        editModal.remove();
        
        // Recargar la búsqueda para mostrar los datos actualizados
        const searchInput = document.getElementById('searchNameInput') as HTMLInputElement;
        if (searchInput) {
          searchInput.dispatchEvent(new Event('input'));
        }
      }, 500);
    } catch (error) {
      console.error('Error updating client:', error);
      createToast('editClient', 'map', `Error: ${error.message}`, 'top', 'error');
    }
  });
}

// Función para obtener el token CSRF
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

export function initializeSearchModal(map: Map): void {
  const modal = document.getElementById('searchClientModal') as HTMLDialogElement;
  if (!modal) {
    console.error('Modal element not found');
    return;
  }

  // Add event listeners
  const nameInput = document.getElementById('searchNameInput') as HTMLInputElement;
  const phoneInput = document.getElementById('searchPhoneInput') as HTMLInputElement;
  const closeButton = document.getElementById('closeSearchModal');
  
  if (!nameInput || !phoneInput) {
    console.error('Required input elements not found');
    return;
  }

  let searchTimeout: ReturnType<typeof setTimeout>;

  const performSearch = async () => {
    const nameQuery = normalizeText(nameInput.value.trim());
    const phoneQuery = phoneInput.value.trim();
    
    if (nameQuery.length < 2 && phoneQuery.length < 2) {
      const tbody = document.getElementById('searchResultsBody');
      if (tbody) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">Ingrese al menos 3 caracteres en nombre o teléfono</td></tr>';
      }
      return;
    }

    try {
      const response = await fetch(`/api/v1/clientes/`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const clients = await response.json() as Client[];
      
      // Filtrar clientes localmente
      const filteredClients = clients.filter(client => {
        const normalizedName = normalizeText(client.name || '');
        const normalizedPhone = client.tel1 || '';
        
        const nameMatch = nameQuery.length >= 3 ? normalizedName.toLowerCase().includes(nameQuery.toLowerCase()) : true;
        const phoneMatch = phoneQuery.length >= 3 ? normalizedPhone.includes(phoneQuery) : true;
        
        return nameMatch && phoneMatch;
      });
      
      const tbody = document.getElementById('searchResultsBody');
      if (!tbody) return;
      
      tbody.innerHTML = '';
      
      if (filteredClients.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No se encontraron resultados</td></tr>';
        return;
      }

      filteredClients.forEach((client) => {
        const tr = document.createElement('tr');
        // Formatear la fecha para mostrar solo la fecha sin la hora
        const fecha = client.created_at ? new Date(client.created_at).toLocaleDateString('es-ES') : '';
        tr.innerHTML = `
          <td>${client.name || 'SN'}</td>
          <td>${client.tel1 || 'ST'}</td>
          <td>${client.address || ''}</td>
          <td>${client.cost ? `${client.cost}` : 'Sin precio'}</td>
          <td>
            <div class="badge ${client.status === 'ejecutado' ? 'badge-success' : 
                              client.status === 'cotizado' ? 'badge-info' : 
                              client.status === 'cancelado' ? 'badge-error' : 'badge-ghost'}">
              ${client.status || 'Sin estado'}
            </div>
          </td>
          <td>${fecha}</td>
          <td class="flex gap-1">
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
          </td>
        `;
        tbody.appendChild(tr);
      });

      // Add click handlers for locate buttons
      document.querySelectorAll('.locate-client').forEach(button => {
        button.addEventListener('click', () => {
          const lat = button.getAttribute('data-lat');
          const lon = button.getAttribute('data-lon');
          if (lat && lon) {
            map.flyTo([parseFloat(lat), parseFloat(lon)], 16);
            modal.close();
          }
        });
      });

      // Add click handlers for edit buttons
      document.querySelectorAll('.edit-client').forEach(button => {
        button.addEventListener('click', () => {
          const clientData = button.getAttribute('data-client');
          if (clientData) {
            const client = JSON.parse(clientData) as Client;
            editClient(client);
          }
        });
      });

    } catch (error) {
      console.error('Error searching clients:', error);
      const tbody = document.getElementById('searchResultsBody');
      if (tbody) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-error">Error al buscar clientes</td></tr>';
      }
    }
  };

  // Add input event listeners to both inputs
  [nameInput, phoneInput].forEach(input => {
    input.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(performSearch, 300);
    });
  });

  closeButton?.addEventListener('click', () => {
    modal.close();
  });

  modal.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      modal.close();
    }
  });

  modal.showModal();
  nameInput.focus();
}