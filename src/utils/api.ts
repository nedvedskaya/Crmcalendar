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

  // Branches
  async getBranches() {
    const response = await fetch(`${API_BASE}/branches`);
    return handleResponse<any[]>(response);
  },

  async createBranch(branch: any) {
    const response = await fetch(`${API_BASE}/branches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(branch),
    });
    return handleResponse<any>(response);
  },

  async updateBranch(id: number, branch: any) {
    const response = await fetch(`${API_BASE}/branches/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(branch),
    });
    return handleResponse<any>(response);
  },

  async deleteBranch(id: number) {
    const response = await fetch(`${API_BASE}/branches/${id}`, {
      method: 'DELETE',
    });
    return handleResponse<any>(response);
  },

  // Vehicles
  async getVehicles(clientId?: number) {
    const url = clientId ? `${API_BASE}/vehicles?client_id=${clientId}` : `${API_BASE}/vehicles`;
    const response = await fetch(url);
    return handleResponse<any[]>(response);
  },

  async createVehicle(vehicle: any) {
    const response = await fetch(`${API_BASE}/vehicles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(vehicle),
    });
    return handleResponse<any>(response);
  },

  async updateVehicle(id: number, vehicle: any) {
    const response = await fetch(`${API_BASE}/vehicles/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(vehicle),
    });
    return handleResponse<any>(response);
  },

  async deleteVehicle(id: number) {
    const response = await fetch(`${API_BASE}/vehicles/${id}`, {
      method: 'DELETE',
    });
    return handleResponse<any>(response);
  },

  // Categories
  async getCategories() {
    const response = await fetch(`${API_BASE}/categories`);
    return handleResponse<any[]>(response);
  },

  async createCategory(category: any) {
    const response = await fetch(`${API_BASE}/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(category),
    });
    return handleResponse<any>(response);
  },

  async updateCategory(id: number, category: any) {
    const response = await fetch(`${API_BASE}/categories/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(category),
    });
    return handleResponse<any>(response);
  },

  async deleteCategory(id: number) {
    const response = await fetch(`${API_BASE}/categories/${id}`, {
      method: 'DELETE',
    });
    return handleResponse<any>(response);
  },

  // Tags
  async getTags() {
    const response = await fetch(`${API_BASE}/tags`);
    return handleResponse<any[]>(response);
  },

  async createTag(tag: any) {
    const response = await fetch(`${API_BASE}/tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tag),
    });
    return handleResponse<any>(response);
  },

  async deleteTag(id: number) {
    const response = await fetch(`${API_BASE}/tags/${id}`, {
      method: 'DELETE',
    });
    return handleResponse<any>(response);
  },

  // Client Records
  async getClientRecords(clientId?: number) {
    const url = clientId ? `${API_BASE}/client-records?client_id=${clientId}` : `${API_BASE}/client-records`;
    const response = await fetch(url);
    return handleResponse<any[]>(response);
  },

  async createClientRecord(record: any) {
    const response = await fetch(`${API_BASE}/client-records`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    });
    return handleResponse<any>(response);
  },

  async updateClientRecord(id: number, record: any) {
    const response = await fetch(`${API_BASE}/client-records/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    });
    return handleResponse<any>(response);
  },

  async deleteClientRecord(id: number) {
    const response = await fetch(`${API_BASE}/client-records/${id}`, {
      method: 'DELETE',
    });
    return handleResponse<any>(response);
  },

  // Subscriptions
  async getSubscriptions() {
    const response = await fetch(`${API_BASE}/subscriptions`);
    return handleResponse<any[]>(response);
  },

  async createSubscription(subscription: any) {
    const response = await fetch(`${API_BASE}/subscriptions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription),
    });
    return handleResponse<any>(response);
  },

  // User Subscriptions
  async getUserSubscriptions(userId?: number) {
    const url = userId ? `${API_BASE}/user-subscriptions?user_id=${userId}` : `${API_BASE}/user-subscriptions`;
    const response = await fetch(url);
    return handleResponse<any[]>(response);
  },

  async createUserSubscription(userSubscription: any) {
    const response = await fetch(`${API_BASE}/user-subscriptions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userSubscription),
    });
    return handleResponse<any>(response);
  },

  async updateUserSubscription(id: number, userSubscription: any) {
    const response = await fetch(`${API_BASE}/user-subscriptions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userSubscription),
    });
    return handleResponse<any>(response);
  },

  // Payments
  async getPayments(userId?: number) {
    const url = userId ? `${API_BASE}/payments?user_id=${userId}` : `${API_BASE}/payments`;
    const response = await fetch(url);
    return handleResponse<any[]>(response);
  },

  async createPayment(payment: any) {
    const response = await fetch(`${API_BASE}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payment),
    });
    return handleResponse<any>(response);
  },

  async updatePayment(id: number, payment: any) {
    const response = await fetch(`${API_BASE}/payments/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payment),
    });
    return handleResponse<any>(response);
  },

  // Entity Tags
  async getEntityTags(entityType?: string, entityId?: number) {
    let url = `${API_BASE}/entity-tags`;
    const params = [];
    if (entityType) params.push(`entity_type=${entityType}`);
    if (entityId) params.push(`entity_id=${entityId}`);
    if (params.length > 0) url += '?' + params.join('&');
    const response = await fetch(url);
    return handleResponse<any[]>(response);
  },

  async createEntityTag(entityTag: any) {
    const response = await fetch(`${API_BASE}/entity-tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entityTag),
    });
    return handleResponse<any>(response);
  },

  async deleteEntityTag(id: number) {
    const response = await fetch(`${API_BASE}/entity-tags/${id}`, {
      method: 'DELETE',
    });
    return handleResponse<any>(response);
  },
};
