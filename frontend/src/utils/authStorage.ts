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

export const setToken = (token: string | null) => {
  try {
    if (typeof window === "undefined") return;
    if (token === null) localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
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

export const setRefreshToken = (token: string | null) => {
  try {
    if (typeof window === "undefined") return;
    if (token === null) localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    else localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, token);
  } catch (err) {
    console.warn("authStorage.setRefreshToken error", err);
  }
};

export const getUser = (): any | null => {
  try {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(STORAGE_KEYS.USER_DATA);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.warn("authStorage.getUser error", err);
    return null;
  }
};

export const setUser = (user: any | null) => {
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
