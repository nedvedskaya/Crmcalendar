const API_BASE = '/api';

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }
  return response.json();
}

export const api = {
  async getClients() {
    const response = await fetch(`${API_BASE}/clients`);
    return handleResponse<any[]>(response);
  },

  async createClient(client: any) {
    const response = await fetch(`${API_BASE}/clients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(client),
    });
    return handleResponse<any>(response);
  },

  async updateClient(id: number, client: any) {
    const response = await fetch(`${API_BASE}/clients/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(client),
    });
    return handleResponse<any>(response);
  },

  async deleteClient(id: number) {
    const response = await fetch(`${API_BASE}/clients/${id}`, {
      method: 'DELETE',
    });
    return handleResponse<any>(response);
  },

  async getServices() {
    const response = await fetch(`${API_BASE}/services`);
    return handleResponse<any[]>(response);
  },

  async createService(service: any) {
    const response = await fetch(`${API_BASE}/services`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(service),
    });
    return handleResponse<any>(response);
  },

  async updateService(id: number, service: any) {
    const response = await fetch(`${API_BASE}/services/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(service),
    });
    return handleResponse<any>(response);
  },

  async deleteService(id: number) {
    const response = await fetch(`${API_BASE}/services/${id}`, {
      method: 'DELETE',
    });
    return handleResponse<any>(response);
  },

  async getBookings() {
    const response = await fetch(`${API_BASE}/bookings`);
    return handleResponse<any[]>(response);
  },

  async createBooking(booking: any) {
    const response = await fetch(`${API_BASE}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(booking),
    });
    return handleResponse<any>(response);
  },

  async updateBooking(id: number, booking: any) {
    const response = await fetch(`${API_BASE}/bookings/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(booking),
    });
    return handleResponse<any>(response);
  },

  async deleteBooking(id: number) {
    const response = await fetch(`${API_BASE}/bookings/${id}`, {
      method: 'DELETE',
    });
    return handleResponse<any>(response);
  },

  async getTransactions() {
    const response = await fetch(`${API_BASE}/transactions`);
    return handleResponse<any[]>(response);
  },

  async createTransaction(transaction: any) {
    const response = await fetch(`${API_BASE}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(transaction),
    });
    return handleResponse<any>(response);
  },

  async deleteTransaction(id: number) {
    const response = await fetch(`${API_BASE}/transactions/${id}`, {
      method: 'DELETE',
    });
    return handleResponse<any>(response);
  },

  async getTasks() {
    const response = await fetch(`${API_BASE}/tasks`);
    return handleResponse<any[]>(response);
  },

  async createTask(task: any) {
    const response = await fetch(`${API_BASE}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task),
    });
    return handleResponse<any>(response);
  },

  async updateTask(id: number, task: any) {
    const response = await fetch(`${API_BASE}/tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task),
    });
    return handleResponse<any>(response);
  },

  async deleteTask(id: number) {
    const response = await fetch(`${API_BASE}/tasks/${id}`, {
      method: 'DELETE',
    });
    return handleResponse<any>(response);
  },

  async getData(key: string) {
    const response = await fetch(`${API_BASE}/data/${key}`);
    return handleResponse<any>(response);
  },

  async saveData(key: string, value: any) {
    const response = await fetch(`${API_BASE}/data/${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value }),
    });
    return handleResponse<any>(response);
  },

  async getUsers() {
    const response = await fetch(`${API_BASE}/users`);
    return handleResponse<any[]>(response);
  },
};
