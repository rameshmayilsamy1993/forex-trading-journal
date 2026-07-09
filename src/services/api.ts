import axios, { AxiosError, type AxiosInstance, type AxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export async function apiGet<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const { data } = await api.get(url, config);
  return data;
}

export async function apiPost<T = any>(url: string, body?: any, config?: AxiosRequestConfig): Promise<T> {
  const { data } = await api.post(url, body, config);
  return data;
}

export async function apiPut<T = any>(url: string, body?: any, config?: AxiosRequestConfig): Promise<T> {
  const { data } = await api.put(url, body, config);
  return data;
}

export async function apiDelete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const { data } = await api.delete(url, config);
  return data;
}

export async function apiPostForm<T = any>(url: string, formData: FormData, config?: AxiosRequestConfig): Promise<T> {
  const { data } = await api.post(url, formData, {
    ...config,
    headers: {
      ...config?.headers,
      'Content-Type': 'multipart/form-data',
    },
  });
  return data;
}

export { api as default };
export type { AxiosInstance, AxiosRequestConfig };
