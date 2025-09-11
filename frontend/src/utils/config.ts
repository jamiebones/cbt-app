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
  apiUrl: getEnvVar('NEXT_PUBLIC_API_URL', 'http://localhost:4000'),
  localServerUrl: getEnvVar('NEXT_PUBLIC_LOCAL_SERVER_URL', 'http://localhost:5000'),
  environment: (getEnvVar('NEXT_PUBLIC_ENVIRONMENT', 'development') as 'development' | 'production'),
  
  features: {
    calculator: getEnvBool('NEXT_PUBLIC_ENABLE_CALCULATOR', true),
    mediaUpload: getEnvBool('NEXT_PUBLIC_ENABLE_MEDIA_UPLOAD', true),
    excelImport: getEnvBool('NEXT_PUBLIC_ENABLE_EXCEL_IMPORT', true),
  },
  
  limits: {
    maxFileSize: getEnvNumber('NEXT_PUBLIC_MAX_FILE_SIZE', 10485760), // 10MB
    maxImageSize: getEnvNumber('NEXT_PUBLIC_MAX_IMAGE_SIZE', 5242880), // 5MB
    maxAudioSize: getEnvNumber('NEXT_PUBLIC_MAX_AUDIO_SIZE', 10485760), // 10MB
  },
  
  settings: {
    defaultTestTimeLimit: getEnvNumber('NEXT_PUBLIC_DEFAULT_TEST_TIME_LIMIT', 60),
    autoSaveInterval: getEnvNumber('NEXT_PUBLIC_AUTO_SAVE_INTERVAL', 30000), // 30 seconds
  },
};

// API endpoint constants
export const API_ENDPOINTS = {
  // Authentication
  LOGIN: '/api/auth/login',
  REGISTER: '/api/auth/register',
  REFRESH: '/api/auth/refresh-token',
  LOGOUT: '/api/auth/logout',
  PROFILE: '/api/auth/me',
  
  // Users
  USERS: '/api/users',
  TEST_CREATORS: '/api/users/test-creators',
  STUDENTS: '/api/users/students',
  TEST_CENTER_OWNERS: '/api/users/test-center-owners',
  TEST_CENTER_OWNER_CREATORS: '/api/users/center/create-test-creators',
  GET_TEST_CREATORS_BY_OWNER: '/api/users/center/test-creators',
  DELETE_TEST_CREATOR: (id: string) => `/api/users/center/test-creators/${id}`,

  // Tests
  TESTS: '/api/tests',
  TEST_UPDATE_STATUS: (testId: string) => `/api/tests/${testId}/status`,
  TEST_SESSIONS: '/api/tests/sessions',
  TEST_QUESTIONS_MANUAL: (testId: string) => `/api/tests/${testId}/questions/manual`,
  TEST_QUESTIONS_AUTO: (testId: string) => `/api/tests/${testId}/questions/auto`,
  TEST_QUESTIONS_IMPORT_EXCEL: (testId: string) => `/api/tests/${testId}/questions/import-excel`,
  TEST_GET_QUESTIONS: (testId: string) => `/api/tests/${testId}/questions`,
  TEST_DELETE_QUESTION: (testId: string, questionId: string) => `/api/tests/${testId}/questions/${questionId}`,
  
  // Questions
  QUESTIONS: '/api/questions',
  QUESTIONS_BULK_IMPORT: '/api/questions/bulk-import',
  QUESTIONS_BULK_IMPORT_PREVIEW: '/api/questions/bulk-import/preview',
  QUESTIONS_BULK_IMPORT_TEMPLATE: '/api/questions/bulk-import/template',
  QUESTIONS_BULK_IMPORT_STATUS: (batchId: string) => `/api/questions/bulk-import/status/${batchId}`,
  
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

// User Roles Constants
export const USER_ROLES = {
  SUPER_ADMIN: 'super_admin',
  TEST_CENTER_OWNER: 'test_center_owner',
  TEST_CREATOR: 'test_creator',
  STUDENT: 'student',
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

export default config;
