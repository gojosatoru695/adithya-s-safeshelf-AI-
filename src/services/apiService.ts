export interface User {
  id: number;
  name: string;
  email: string;
  plan: string;
}

export interface Item {
  id: string;
  name: string;
  category: string;
  quantity: number;
  price: number;
  expiry_date: string;
  usage_per_day: number;
  last_refilled_at?: string;
  created_at: string;
}

export interface SmartRecommendation {
  itemId: string;
  name: string;
  category: string;
  score: number;
  confidence: number;
  reason: string;
  price: number;
  depletionDays: number;
}

export interface Notification {
  id: number;
  type: string;
  message: string;
  date: string;
}

const getAuthHeaders = () => {

  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : ''
  };
};

export const apiService = {
  signup: async (data: any) => {
    const res = await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Signup failed');
    }
    const result = await res.json();
    localStorage.setItem('token', result.token);
    return result;
  },

  login: async (data: any) => {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Login failed');
    }
    const result = await res.json();
    localStorage.setItem('token', result.token);
    return result;
  },

  getMe: async (): Promise<User> => {
    const res = await fetch('/api/me', { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Unauthorized');
    return res.json();
  },

  getItems: async (): Promise<Item[]> => {
    const res = await fetch('/api/items', { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch items');
    return res.json();
  },

  createItem: async (data: any): Promise<{ id: number }> => {
    const res = await fetch('/api/items', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to create item');
    return res.json();
  },

  updateItem: async (id: number, data: any) => {
    const res = await fetch(`/api/items/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update item');
    return res.json();
  },

  deleteItem: async (id: number) => {
    const res = await fetch(`/api/items/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to delete item');
    return res.json();
  },

  getNotifications: async (userId: string): Promise<Notification[]> => {
    try {
      const res = await fetch('/api/notifications', {
        headers: { ...getAuthHeaders(), 'x-user-id': userId }
      });
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  },
  
  getSmartRefill: async (budget: number): Promise<SmartRecommendation[]> => {
    try {
      const res = await fetch(`/api/smart-refill?budget=${budget}`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  }
};

