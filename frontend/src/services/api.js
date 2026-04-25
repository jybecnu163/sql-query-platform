import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3001',
  timeout: 100000,
  withCredentials: true
});

export default api;
