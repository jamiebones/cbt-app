import { User, LoginCredentials, RegisterData, ApiResponse } from '../types';
import { mainApi, handleApiResponse, handleApiError } from './api';
import { API_ENDPOINTS, APP_CONSTANTS } from '../utils/config';

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}

export interface CenterOption {
  id: string;
  testCenterName: string;
  contactName?: string;
  email?: string;
}

class AuthService {
  // Login user
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await mainApi.post<ApiResponse<any>>(API_ENDPOINTS.LOGIN, credentials);
      const apiData = handleApiResponse(response);
      const authData: AuthResponse = {
        user: apiData.user,
        token: apiData.accessToken, // map accessToken to token
        refreshToken: apiData.refreshToken,
      };
      this.storeAuthData(authData);
      return authData;
    } catch (error: any) {
      throw new Error(handleApiError(error));
    }
  }

  // Public: fetch available test centers for student signup
  async listCenters(): Promise<CenterOption[]> {
    try {
      const response = await mainApi.get<ApiResponse<CenterOption[]>>("/api/auth/centers");
      return handleApiResponse(response);
    } catch (error: any) {
      throw new Error(handleApiError(error));
    }
  }

  // Register new test center
  async register(data: RegisterData): Promise<AuthResponse> {
    try {
      const response = await mainApi.post<ApiResponse<any>>(API_ENDPOINTS.REGISTER, data);
      const apiData = handleApiResponse(response);
      const authData: AuthResponse = {
        user: apiData.user,
        token: apiData.accessToken, // map accessToken to token
        refreshToken: apiData.refreshToken,
      };
      this.storeAuthData(authData);
      return authData;
    } catch (error: any) {
      throw new Error(handleApiError(error));
    }
  }

  // Refresh authentication token
  async refreshToken(): Promise<string> {
    try {
      const refreshToken = localStorage.getItem(APP_CONSTANTS.STORAGE_KEYS.REFRESH_TOKEN);
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await mainApi.post<ApiResponse<{ accessToken: string; refreshToken?: string }>>(
        API_ENDPOINTS.REFRESH,
        { refreshToken }
      );

      const apiData = handleApiResponse(response);
      const newToken = apiData.accessToken;

      // Update both tokens if new refresh token provided
      localStorage.setItem(APP_CONSTANTS.STORAGE_KEYS.AUTH_TOKEN, newToken);
      if (apiData.refreshToken) {
        localStorage.setItem(APP_CONSTANTS.STORAGE_KEYS.REFRESH_TOKEN, apiData.refreshToken);
      }

      return newToken;
    } catch (error: any) {
      console.warn('Token refresh failed:', error);
      this.logout();
      throw new Error(handleApiError(error));
    }
  }

  // Get current user profile
  async getProfile(): Promise<{ user: User }> {
    try {
      const response = await mainApi.get<ApiResponse<{ user: User }>>(API_ENDPOINTS.PROFILE);
      return handleApiResponse(response);
    } catch (error: any) {
      throw new Error(handleApiError(error));
    }
  }

  // Logout user
  async logout(): Promise<void> {
    try {
      // Call logout endpoint to invalidate token on server
      await mainApi.post(API_ENDPOINTS.LOGOUT);
    } catch (error) {
      // Continue with local logout even if server call fails
      console.warn('Server logout failed:', error);
    } finally {
      this.clearAuthData();
    }
  }

  // Store authentication data in localStorage
  private storeAuthData(authData: AuthResponse): void {
    localStorage.setItem(APP_CONSTANTS.STORAGE_KEYS.AUTH_TOKEN, authData.token);
    localStorage.setItem(APP_CONSTANTS.STORAGE_KEYS.REFRESH_TOKEN, authData.refreshToken);
    // Store user data directly (not wrapped in another user object)
    localStorage.setItem(APP_CONSTANTS.STORAGE_KEYS.USER_DATA, JSON.stringify(authData.user));
  }

  // Clear authentication data from localStorage
  private clearAuthData(): void {
    localStorage.removeItem(APP_CONSTANTS.STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(APP_CONSTANTS.STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(APP_CONSTANTS.STORAGE_KEYS.USER_DATA);
    localStorage.removeItem(APP_CONSTANTS.STORAGE_KEYS.TEST_SESSION);
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    const token = localStorage.getItem(APP_CONSTANTS.STORAGE_KEYS.AUTH_TOKEN);
    const userData = localStorage.getItem(APP_CONSTANTS.STORAGE_KEYS.USER_DATA);
    return !!(token && userData);
  }

  // Get stored user data
  getCurrentUser(): User | null {
    const userData = localStorage.getItem(APP_CONSTANTS.STORAGE_KEYS.USER_DATA);
    if (!userData) return null;

    try {
      return JSON.parse(userData);
    } catch {
      return null;
    }
  }

  // Get stored auth token
  getToken(): string | null {
    return localStorage.getItem(APP_CONSTANTS.STORAGE_KEYS.AUTH_TOKEN);
  }

  // Check if user has required role
  hasRole(requiredRole: User['role']): boolean {
    const user = this.getCurrentUser();
    return user?.role === requiredRole;
  }

  // Check if user has any of the required roles
  hasAnyRole(requiredRoles: User['role'][]): boolean {
    const user = this.getCurrentUser();
    return user ? requiredRoles.includes(user.role) : false;
  }
}

// Export singleton instance
export const authService = new AuthService();
export default authService;