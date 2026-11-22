import axios from 'axios';
import { API_BASE_URL } from '../config';

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000,
  headers: { Accept: 'application/json' },
});

function readMessage(error) {
  const detail = error.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail.map((item) => `${item.field || 'field'}: ${item.message}`).join('; ');
  }
  if (detail && typeof detail === 'object') return detail.message || JSON.stringify(detail);
  if (error.response?.data?.message) return error.response.data.message;
  if (error.code === 'ECONNABORTED') return 'The API took too long to respond. Please try again.';
  if (!error.response) return `Cannot reach the API at ${API_BASE_URL}. Check that the backend is running.`;
  return error.message || 'Unexpected API error.';
}

client.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(new Error(readMessage(error))),
);

export const getHealth = () => client.get('/health').then((response) => response.data);
export const getModelInfo = () => client.get('/model-info').then((response) => response.data);
export const predictRecord = (record) => client.post('/predict', record).then((response) => response.data);

export const predictBatchCsv = (file) => {
  const form = new FormData();
  form.append('file', file);
  return client.post('/predict-batch', form).then((response) => response.data);
};

export const predictBatchRecords = (records) =>
  client.post('/predict-batch', { records }).then((response) => response.data);

export default client;
