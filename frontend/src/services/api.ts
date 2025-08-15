import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import { ApiResponse } from '@/types';
import { config, API_ENDPOINTS, APP_CONSTANTS } from '@/utils/config';

// Create axios instance with default configuration
const createApiInstance = (baseURL: string): AxiosInstance => {
  const instance = axios.create({
    baseURL,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor to add authentication token
  instance.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem(APP_CONSTANTS.STORAGE_KEYS.AUTH_TOKEN);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor to handle errors and token refresh
  instance.interceptors.response.use(
    (response: AxiosResponse) => {
      return response;
    },
    async (error: AxiosError) => {
      const originalRequest = error.config as any;

      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          const refreshToken = localStorage.getItem(APP_CONSTANTS.STORAGE_KEYS.REFRESH_TOKEN);
          if (refreshToken) {
            const response = await axios.post(`${config.apiUrl}${API_ENDPOINTS.REFRESH}`, {
              refreshToken,
            });

            const { token } = response.data;
            localStorage.setItem(APP_CONSTANTS.STORAGE_KEYS.AUTH_TOKEN, token);

            // Retry the original request with new token
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return instance(originalRequest);
          }
        } catch (refreshError) {
          // Refresh failed, redirect to login
          localStorage.removeItem(APP_CONSTANTS.STORAGE_KEYS.AUTH_TOKEN);
          localStorage.removeItem(APP_CONSTANTS.STORAGE_KEYS.REFRESH_TOKEN);
          localStorage.removeItem(APP_CONSTANTS.STORAGE_KEYS.USER_DATA);
          
          // Dispatch logout event
          window.dispatchEvent(new CustomEvent('auth:logout'));
        }
      }

      return Promise.reject(error);
    }
  );

  return instance;
};

// API instances
export const mainApi = createApiInstance(config.apiUrl);
export const localApi = createApiInstance(config.localServerUrl);

// Generic API response handler
export const handleApiResponse = <T>(response: AxiosResponse<ApiResponse<T>>): T => {
  if (response.data.success && response.data.data) {
    return response.data.data;
  }
  throw new Error(response.data.message || 'API request failed');
};

// Generic error handler
export const handleApiError = (error: AxiosError): string => {
  if (error.response?.data) {
    const errorData = error.response.data as any;
    return errorData.message || errorData.error || 'An error occurred';
  }
  
  if (error.request) {
    return 'Network error. Please check your connection.';
  }
  
  return error.message || 'An unexpected error occurred';
};

// File upload helper
export const uploadFile = async (
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await mainApi.post(API_ENDPOINTS.MEDIA_UPLOAD, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(progress);
      }
    },
  });

  return handleApiResponse(response);
};

// Download file helper
export const downloadFile = async (url: string, filename: string): Promise<void> => {
  const response = await mainApi.get(url, {
    responseType: 'blob',
  });

  const blob = new Blob([response.data]);
  const downloadUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(downloadUrl);
};

// Network status helper
export const checkNetworkStatus = async (): Promise<boolean> => {
  try {
    await mainApi.get(API_ENDPOINTS.HEALTH, { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
};

export default mainApi;
