"use client";

import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  ReactNode,
} from "react";
import {
  User,
  AuthState,
  LoginCredentials,
  RegisterData,
  AuthContextType,
} from "../types";
import { authService, AuthResponse } from "../services/auth";
import authStorage from "../utils/authStorage";

// Auth action types
type AuthAction =
  | { type: "AUTH_START" }
  | { type: "AUTH_SUCCESS"; payload: AuthResponse }
  | { type: "AUTH_FAILURE"; payload: string }
  | { type: "LOGOUT" }
  | { type: "RESTORE_AUTH"; payload: { user: User; token: string } };

// Build initial state from localStorage synchronously to survive full page reloads
const buildInitialState = (): AuthState => {
  const token = authStorage.getToken();
  const user = authStorage.getUser();
  return {
    user: user || null,
    token: token || null,
    refreshToken: authStorage.getRefreshToken() || null,
    isAuthenticated: !!(user && token),
    isLoading: !!(user && token), // Set loading to true if we have stored auth data
  };
};

// Auth reducer
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case "AUTH_START":
      return {
        ...state,
        isLoading: true,
      };

    case "AUTH_SUCCESS":
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        refreshToken: action.payload.refreshToken,
        isAuthenticated: true,
        isLoading: false,
      };

    case "AUTH_FAILURE":
      return {
        ...state,
        user: null,
        token: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
      };

    case "LOGOUT":
      return {
        ...state,
        user: null,
        token: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
      };

    case "RESTORE_AUTH":
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        refreshToken: null,
        isAuthenticated: true,
        isLoading: false,
      };

    default:
      return state;
  }
};

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth provider component
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // Initialize reducer with state built from localStorage so token/user survive full page reloads
  const [state, dispatch] = useReducer(authReducer, buildInitialState());
  // Login function
  const login = async (credentials: LoginCredentials): Promise<void> => {
    dispatch({ type: "AUTH_START" });
    try {
      const authData = await authService.login(credentials);
      authStorage.setToken(authData.token);
      authStorage.setRefreshToken(authData.refreshToken || null);
      authStorage.setUser(authData.user || null);
      dispatch({ type: "AUTH_SUCCESS", payload: authData });
    } catch (error: any) {
      if (process.env.NODE_ENV === "production") {
        // Optionally send to error tracking service
      } else {
        console.warn("Login error:", error);
      }
      dispatch({
        type: "AUTH_FAILURE",
        payload: "Login failed. Please check your credentials.",
      });
      throw error;
    }
  };

  // Register function
  const register = async (data: RegisterData): Promise<void> => {
    dispatch({ type: "AUTH_START" });
    try {
      const authData = await authService.register(data);
      authStorage.setToken(authData.token);
      authStorage.setRefreshToken(authData.refreshToken || null);
      authStorage.setUser(authData.user || null);
      dispatch({ type: "AUTH_SUCCESS", payload: authData });
    } catch (error: any) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("Register error:", error);
      }
      dispatch({
        type: "AUTH_FAILURE",
        payload: "Registration failed. Please try again.",
      });
      throw error;
    }
  };

  // Logout function
  const logout = async (): Promise<void> => {
    try {
      await authService.logout();
    } catch (error) {
      console.warn("Logout error:", error);
    } finally {
      authStorage.clearAuth();
      dispatch({ type: "LOGOUT" });
      // Broadcast to other tabs for cross-tab sync
      try {
        window.localStorage.setItem("auth:broadcast", String(Date.now()));
      } catch (e) {}
    }
  };

  // Refresh authentication
  const refreshAuth = async (): Promise<void> => {
    try {
      const currentToken = authStorage.getToken();
      if (!currentToken) {
        dispatch({ type: "LOGOUT" });
        return;
      }
      const newToken = await authService.refreshToken();
      if (typeof newToken === "string" && newToken) {
        authStorage.setToken(newToken);
        let user: User | null = null;
        try {
          user = await authService.getProfile();
        } catch (e) {
          user = null;
        }
        if (user) {
          authStorage.setUser(user);
          dispatch({
            type: "RESTORE_AUTH",
            payload: { user, token: newToken },
          });
        } else {
          dispatch({ type: "LOGOUT" });
        }
      } else {
        dispatch({ type: "LOGOUT" });
      }
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("Auth refresh error:", error);
      }
      dispatch({ type: "LOGOUT" });
    }
  };

  // Initialize authentication on mount
  useEffect(() => {
    // On mount, only fetch profile if token exists
    const initializeAuth = async () => {
      const token = authStorage.getToken();
      if (token) {
        dispatch({ type: "AUTH_START" }); // Ensure loading is true while verifying
        try {
          const user = await authService.getProfile();
          if (user) {
            authStorage.setUser(user);
            dispatch({ type: "RESTORE_AUTH", payload: { user, token } });
          } else {
            authStorage.clearAuth();
            dispatch({ type: "LOGOUT" });
          }
        } catch (err) {
          if (process.env.NODE_ENV !== "production") {
            console.warn("Auth profile fetch error:", err);
          }
          authStorage.clearAuth();
          dispatch({ type: "LOGOUT" });
        }
      } else {
        dispatch({ type: "LOGOUT" }); // Ensure loading is false if no token
      }
    };
    initializeAuth();
  }, []);

  // Listen for logout events from API service
  useEffect(() => {
    const handleLogout = () => {
      authStorage.clearAuth();
      dispatch({ type: "LOGOUT" });
    };
    window.addEventListener("auth:logout", handleLogout);
    return () => window.removeEventListener("auth:logout", handleLogout);
  }, []);

  // Cross-tab auth sync: listen to storage events so logout/login actions in one tab
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "auth:broadcast") {
        const token = authStorage.getToken();
        const user = authStorage.getUser();
        if (token && user) {
          dispatch({ type: "RESTORE_AUTH", payload: { user, token } });
        } else {
          dispatch({ type: "LOGOUT" });
        }
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const value: AuthContextType = {
    state,
    login,
    register,
    logout,
    refreshAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Hook to use auth context
const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export { AuthContext, useAuth };
