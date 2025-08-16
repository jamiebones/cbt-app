import { AppConfig } from '../types';

// Environment variable helpers
const getEnvVar = (name: string, defaultValue?: string): string => {
  const value = process.env[name];
  if (!value && !defaultValue) {
    console.warn(`Environment variable ${name} is not set`);
    return '';
  }
  return value || defaultValue || '';
};

const getEnvBool = (name: string, defaultValue = false): boolean => {
  const value = process.env[name];
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true';
};

const getEnvNumber = (name: string, defaultValue = 0): number => {
  const value = process.env[name];
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

// Application configuration
export const config: AppConfig = {
  apiUrl: getEnvVar('REACT_APP_API_URL', 'http://localhost:4000'),
  localServerUrl: getEnvVar('REACT_APP_LOCAL_SERVER_URL', 'http://localhost:5000'),
  environment: (getEnvVar('REACT_APP_ENVIRONMENT', 'development') as 'development' | 'production'),
  
  features: {
    calculator: getEnvBool('REACT_APP_ENABLE_CALCULATOR', true),
    mediaUpload: getEnvBool('REACT_APP_ENABLE_MEDIA_UPLOAD', true),
    excelImport: getEnvBool('REACT_APP_ENABLE_EXCEL_IMPORT', true),
  },
  
  limits: {
    maxFileSize: getEnvNumber('REACT_APP_MAX_FILE_SIZE', 10485760), // 10MB
    maxImageSize: getEnvNumber('REACT_APP_MAX_IMAGE_SIZE', 5242880), // 5MB
    maxAudioSize: getEnvNumber('REACT_APP_MAX_AUDIO_SIZE', 10485760), // 10MB
  },
  
  settings: {
    defaultTestTimeLimit: getEnvNumber('REACT_APP_DEFAULT_TEST_TIME_LIMIT', 60),
    autoSaveInterval: getEnvNumber('REACT_APP_AUTO_SAVE_INTERVAL', 30000), // 30 seconds
  },
};

// API endpoint constants
export const API_ENDPOINTS = {
  // Authentication
  LOGIN: '/api/auth/login',
  REGISTER: '/api/auth/register',
  REFRESH: '/api/auth/refresh',
  LOGOUT: '/api/auth/logout',
  PROFILE: '/api/auth/profile',
  
  // Users
  USERS: '/api/users',
  TEST_CREATORS: '/api/users/test-creators',
  STUDENTS: '/api/users/students',
  
  // Tests
  TESTS: '/api/tests',
  TEST_SESSIONS: '/api/tests/sessions',
  
  // Questions
  QUESTIONS: '/api/questions',
  QUESTION_IMPORT: '/api/questions/import',
  
  // Subjects
  SUBJECTS: '/api/subjects',
  
  // Media
  MEDIA_UPLOAD: '/api/media/upload',
  MEDIA: '/api/media',
  
  // Subscriptions
  SUBSCRIPTIONS: '/api/subscriptions',
  SUBSCRIPTION_UPGRADE: '/api/subscriptions/upgrade',
  
  // Analytics
  ANALYTICS: '/api/analytics',
  REPORTS: '/api/analytics/reports',
  
  // Health
  HEALTH: '/api/health',
} as const;

// Feature flags for conditional rendering
export const FEATURES = {
  CALCULATOR: config.features.calculator,
  MEDIA_UPLOAD: config.features.mediaUpload,
  EXCEL_IMPORT: config.features.excelImport,
  OFFLINE_MODE: true, // Always available
  REAL_TIME_SYNC: config.environment === 'production',
} as const;

// Application constants
export const APP_CONSTANTS = {
  // Local storage keys
  STORAGE_KEYS: {
    AUTH_TOKEN: 'cbt_auth_token',
    REFRESH_TOKEN: 'cbt_refresh_token',
    USER_DATA: 'cbt_user_data',
    TEST_SESSION: 'cbt_test_session',
    CALCULATOR_STATE: 'cbt_calculator_state',
  },
  
  // Default values
  DEFAULTS: {
    TEST_TIME_LIMIT: config.settings.defaultTestTimeLimit,
    AUTO_SAVE_INTERVAL: config.settings.autoSaveInterval,
    PAGINATION_LIMIT: 20,
    MAX_QUESTION_ATTEMPTS: 3,
  },
  
  // File validation
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  ALLOWED_AUDIO_TYPES: ['audio/mpeg', 'audio/wav', 'audio/ogg'],
  ALLOWED_DOCUMENT_TYPES: ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  
  // UI constants
  THEME: {
    PRIMARY_COLOR: '#3b82f6',
    SECONDARY_COLOR: '#6b7280',
    SUCCESS_COLOR: '#10b981',
    WARNING_COLOR: '#f59e0b',
    ERROR_COLOR: '#ef4444',
  },
} as const;

export default config;
