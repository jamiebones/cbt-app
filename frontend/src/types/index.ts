import { ReactNode } from 'react';

// Auth context type
export interface AuthContextType {
  state: AuthState;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

import { UserRole } from '../utils/config';

// User and Authentication Types
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  testCenter?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  user: { user: User } | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  testCenterName?: string;
}

// Test and Question Types
export interface Question {
  id: string;
  text: string;
  type: 'single' | 'multiple';
  answers: Answer[];
  correctAnswers: string[];
  subject?: string;
  media?: MediaFile[];
  createdAt: string;
  updatedAt: string;
}

export interface Answer {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface Test {
  id?: string;
  _id?: string;
  title: string;
  description?: string;
  instructions?: string;
  duration: number; // in minutes
  totalQuestions: number;
  passingScore: number;
  questionSelectionMethod: 'manual' | 'auto' | 'mixed';
  testTakers?: string[];
  autoSelectionConfig?: {
    questionCount: number;
    difficultyDistribution: {
      easy: number;
      medium: number;
      hard: number;
    };
  };
  settings: {
    shuffleQuestions: boolean;
    shuffleAnswers: boolean;
    showResultsImmediately: boolean;
    allowReview: boolean;
    allowCalculator: boolean;
    showQuestionNavigation: boolean;
    preventCopyPaste: boolean;
    fullScreenMode: boolean;
  };
  schedule: {
    startDate: string;
    endDate: string;
  };
  status: 'draft' | 'published' | 'active' | 'completed' | 'archived';
  accessCode?: string;
  testCenterOwner: string;
  createdBy: string;
  subject: string | Subject;
  questions?: string[];
  enrollmentConfig: {
    isEnrollmentRequired: boolean;
    enrollmentFee: number;
    enrollmentDeadline?: string;
    allowLateEnrollment: boolean;
    requirePayment: boolean;
    autoApprove: boolean;
  };
  stats: {
    totalAttempts: number;
    completedAttempts: number;
    averageScore: number;
    highestScore: number;
    lowestScore: number;
  };
  enrollmentStats: {
    totalEnrolled: number;
    paidEnrollments: number;
    pendingPayments: number;
    totalRevenue: number;
  };
  lastModified: string;
  createdAt: string;
  updatedAt: string;
}

export interface TestSettings {
  randomizeQuestions: boolean;
  randomizeAnswers: boolean;
  allowCalculator: boolean;
  showTimer: boolean;
  preventCopyPaste: boolean;
  monitorFocus: boolean;
  maxAttempts: number;
  passingScore: number;
}

// Test Session Types
export interface TestSession {
  id: string;
  testId: string;
  studentId: string;
  startTime: string;
  endTime?: string;
  timeRemaining: number;
  currentQuestionIndex: number;
  answers: SessionAnswer[];
  status: 'active' | 'completed' | 'paused' | 'expired';
  score?: number;
  passed?: boolean;
  flaggedQuestions: string[];
}

export interface SessionAnswer {
  questionId: string;
  selectedAnswers: string[];
  isCorrect?: boolean;
  timeSpent: number;
}

// Media Types
export interface MediaFile {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  type: 'image' | 'audio' | 'video';
  createdAt: string;
}

// Subject and Question Bank Types
export interface Subject {
  _id: string;
  id?: string;
  name: string;
  code: string;
  description?: string;
  questionCount?: number;
  testCenter?: string;
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
}

// Subscription Types
export interface Subscription {
  id: string;
  testCenter: string;
  tier: 'free' | 'paid';
  status: 'active' | 'expired' | 'cancelled';
  startDate: string;
  endDate?: string;
  limits: SubscriptionLimits;
  usage: SubscriptionUsage;
}

export interface SubscriptionLimits {
  maxTests: number;
  maxStudents: number;
  maxQuestions: number;
  allowMediaUpload: boolean;
  allowExcelImport: boolean;
  allowAnalytics: boolean;
}

export interface SubscriptionUsage {
  currentTests: number;
  currentStudents: number;
  currentQuestions: number;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Component Props Types
export interface RouteProtectionProps {
  children: ReactNode;
  requiredRole?: UserRole;
  requiredAuth?: boolean;
}

// Calculator Types
export interface CalculatorState {
  display: string;
  previousValue: number | null;
  operation: string | null;
  waitingForValue: boolean;
  isVisible: boolean;
}

// Form Types
export interface FormErrors {
  [key: string]: string;
}

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => string | null;
}

export interface CreateTestFormData {
  title: string;
  description: string;
  instructions: string;
  duration: number;
  totalQuestions: number;
  passingScore: number;
  questionSelectionMethod: "manual" | "auto" | "mixed";
  subject: string;
  schedule: {
    startDate: string;
    endDate: string;
  };
  settings: {
    shuffleQuestions: boolean;
    shuffleAnswers: boolean;
    showResultsImmediately: boolean;
    allowReview: boolean;
    allowCalculator: boolean;
    showQuestionNavigation: boolean;
    preventCopyPaste: boolean;
    fullScreenMode: boolean;
  };
  enrollmentConfig: {
    isEnrollmentRequired: boolean;
    enrollmentFee: number;
    enrollmentDeadline?: string;
    allowLateEnrollment: boolean;
  };
  autoSelectionConfig?: {
    questionCount: number;
    difficultyDistribution: {
      easy: number;
      medium: number;
      hard: number;
    };
  };
}

export interface TestCreatorFormData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
}

export interface CreateSubjectForm {
  name: string;
  code: string;
  description: string;
}

export interface SubjectWithStats extends Subject {
  stats: {
    questionCount: number;
    testCount: number;
    averageDifficulty: string;
  };
}

// Environment Configuration
export interface AppConfig {
  apiUrl: string;
  localServerUrl: string;
  environment: 'development' | 'production';
  features: {
    calculator: boolean;
    mediaUpload: boolean;
    excelImport: boolean;
  };
  limits: {
    maxFileSize: number;
    maxImageSize: number;
    maxAudioSize: number;
  };
  settings: {
    defaultTestTimeLimit: number;
    autoSaveInterval: number;
  };
}
