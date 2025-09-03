// Centralized auth storage helpers — makes it easy to change storage strategy for production
const STORAGE_KEYS = {
  AUTH_TOKEN: "cbt_auth_token",
  REFRESH_TOKEN: "cbt_refresh_token",
  USER_DATA: "cbt_user_data",
};

export const getToken = (): string | null => {
  try {
    return typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN) : null;
  } catch (err) {
    console.warn("authStorage.getToken error", err);
    return null;
  }
};

export const setToken = (token: string | null | undefined) => {
  try {
    if (typeof window === "undefined") return;
    if (!token) localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    else localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
  } catch (err) {
    console.warn("authStorage.setToken error", err);
  }
};

export const getRefreshToken = (): string | null => {
  try {
    return typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN) : null;
  } catch (err) {
    console.warn("authStorage.getRefreshToken error", err);
    return null;
  }
};

export const setRefreshToken = (token: string | null | undefined) => {
  try {
    if (typeof window === "undefined") return;
    if (!token) localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    else localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, token);
  } catch (err) {
    console.warn("authStorage.setRefreshToken error", err);
  }
};

import { User } from '../types';

export const getUser = (): { user: User } | null => {
  try {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(STORAGE_KEYS.USER_DATA);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    // Validate that the parsed data has the nested user structure
    if (parsed && typeof parsed === 'object' && parsed.user && typeof parsed.user === 'object' && parsed.user.id && parsed.user.email && parsed.user.role) {
      return parsed as { user: User };
    }
    return null;
  } catch (err) {
    console.warn("authStorage.getUser error", err);
    return null;
  }
};

export const setUser = (user: { user: User } | null) => {
  try {
    if (typeof window === "undefined") return;
    if (user === null) localStorage.removeItem(STORAGE_KEYS.USER_DATA);
    else localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user));
  } catch (err) {
    console.warn("authStorage.setUser error", err);
  }
};

export const clearAuth = () => {
  try {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER_DATA);
  } catch (err) {
    console.warn("authStorage.clearAuth error", err);
  }
};

export default {
  STORAGE_KEYS,
  getToken,
  setToken,
  getRefreshToken,
  setRefreshToken,
  getUser,
  setUser,
  clearAuth,
};
