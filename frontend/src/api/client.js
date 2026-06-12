import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const authAPI = {
  register: (data) => apiClient.post('/api/auth/register', data),
  login: (data) => apiClient.post('/api/auth/login', data),
  getMe: () => apiClient.get('/api/auth/me'),
};

export const strategyAPI = {
  getAll: () => apiClient.get('/api/strategies'),
  getOne: (id) => apiClient.get(`/api/strategies/${id}`),
  create: (data) => apiClient.post('/api/strategies', data),
  update: (id, data) => apiClient.put(`/api/strategies/${id}`, data),
  delete: (id) => apiClient.delete(`/api/strategies/${id}`),
  start: (id) => apiClient.post(`/api/strategies/${id}/start`),
  stop: (id) => apiClient.post(`/api/strategies/${id}/stop`),
};

export const backtestAPI = {
  run: (strategyId, data) => apiClient.post(`/api/strategies/${strategyId}/backtest`, data),
  getResults: (strategyId) => apiClient.get(`/api/strategies/${strategyId}/backtests`),
};

export const tradeAPI = {
  getAll: (params) => apiClient.get('/api/trades', { params }),
};

export const tradingAPI = {
  getBalance: (exchange) => apiClient.get('/api/trading/balance', { params: { exchange } }),
  getTicker: (symbol, exchange) => apiClient.get(`/api/trading/ticker/${encodeURIComponent(symbol)}`, { params: { exchange } }),
  buy: (data) => apiClient.post('/api/trading/buy', data),
  sell: (data) => apiClient.post('/api/trading/sell', data),
  getPositions: (exchange) => apiClient.get('/api/trading/positions', { params: { exchange } }),
  closePosition: (tradeId, exchange) => apiClient.post(`/api/trading/positions/${tradeId}/close`, null, { params: { exchange } }),
  getHistory: (exchange, limit) => apiClient.get('/api/trading/history', { params: { exchange, limit } }),
};

export const apiKeysAPI = {
  list: () => apiClient.get('/api/api-keys/list'),
  store: (data) => apiClient.post('/api/api-keys/store', data),
  delete: (id) => apiClient.delete(`/api/api-keys/${id}`),
  testConnection: (data) => apiClient.post('/api/api-keys/test-connection', data),
};

export default apiClient;
