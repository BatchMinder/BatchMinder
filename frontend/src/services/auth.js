const API_URL = '/api/auth';

export const authService = {
  async login(email, password, role) {
    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, role }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Login failed');
    }

    return data.data.user;
  },

  async register(name, email, password, role) {
    const response = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, email, password, role }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Registration failed');
    }

    return data.data.user;
  },

  async logout() {
    try {
      await fetch(`${API_URL}/logout`, {
        method: 'POST',
      });
    } catch (err) {
      console.error('Logout request failed:', err);
    }
  },

  async getMe() {
    const response = await fetch(`${API_URL}/me`, {
      method: 'GET',
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Session expired');
    }

    return data.data.user;
  }
};
