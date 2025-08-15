import { Request } from 'express';

// Environment types
export interface Environment {
  NODE_ENV: 'development' | 'production' | 'test' | 'local';
  PORT: number;
  MONGODB_URL: string;
  REDIS_URL: string;
  JWT_SECRET: string;
  JWT_REFRESH_SECRET: string;
  JWT_EXPIRES_IN: string;
  JWT_REFRESH_EXPIRES_IN: string;
  UPLOAD_PATH: string;
  MAX_FILE_SIZE: number;
  MAX_IMAGE_SIZE: number;
  MAX_AUDIO_SIZE: number;
  LOG_LEVEL: 'error' | 'warn' | 'info' | 'http' | 'debug';
  REDIS_PASSWORD?: string;
  STRIPE_SECRET_KEY?: string;
  PAYPAL_CLIENT_ID?: string;
  PAYPAL_CLIENT_SECRET?: string;
  SYNC_SERVER_URL?: string;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    message: string;
    stack?: string;
  };
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Health check types
export interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  message: string;
  state?: string;
}

export interface DetailedHealthResponse extends ApiResponse {
  timestamp: string;
  environment: string;
  version: string;
  uptime: number;
  memory: NodeJS.MemoryUsage;
  dependencies: {
    mongodb: HealthStatus;
    redis: HealthStatus;
  };
}

// User types
export interface User {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  centerId?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  CENTER_ADMIN = 'center_admin',
  TEST_CREATOR = 'test_creator',
  STUDENT = 'student'
}

// Test types
export interface Test {
  id: string;
  title: string;
  description: string;
  centerId: string;
  createdBy: string;
  duration: number; // in minutes
  totalQuestions: number;
  passingScore: number;
  isActive: boolean;
  questions: Question[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Question {
  id: string;
  type: QuestionType;
  question: string;
  options?: string[];
  correctAnswer: string | string[];
  points: number;
  explanation?: string;
  mediaUrl?: string;
  mediaType?: MediaType;
}

export enum QuestionType {
  MULTIPLE_CHOICE = 'multiple_choice',
  TRUE_FALSE = 'true_false',
  SHORT_ANSWER = 'short_answer',
  ESSAY = 'essay',
  FILL_IN_BLANK = 'fill_in_blank'
}

export enum MediaType {
  IMAGE = 'image',
  AUDIO = 'audio',
  VIDEO = 'video'
}

// Test session types
export interface TestSession {
  id: string;
  testId: string;
  studentId: string;
  startTime: Date;
  endTime?: Date;
  timeRemaining: number;
  answers: TestAnswer[];
  score?: number;
  status: TestSessionStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface TestAnswer {
  questionId: string;
  answer: string | string[];
  isCorrect?: boolean;
  points?: number;
  timeSpent: number;
}

export enum TestSessionStatus {
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  ABANDONED = 'abandoned',
  EXPIRED = 'expired'
}

// Subscription types
export interface Subscription {
  id: string;
  centerId: string;
  tier: SubscriptionTier;
  limits: SubscriptionLimits;
  isActive: boolean;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export enum SubscriptionTier {
  BASIC = 'basic',
  PREMIUM = 'premium',
  ENTERPRISE = 'enterprise'
}

export interface SubscriptionLimits {
  maxStudents: number;
  maxTestCreators: number;
  maxTests: number;
  maxQuestionsPerTest: number;
  storageLimit: number; // in MB
  supportLevel: 'basic' | 'priority' | 'dedicated';
}

// Media types
export interface MediaFile {
  id: string;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  path: string;
  url: string;
  uploadedBy: string;
  centerId: string;
  createdAt: Date;
}

// Sync types
export interface SyncStatus {
  lastSync: Date;
  status: 'synced' | 'pending' | 'error';
  pendingUploads: number;
  pendingDownloads: number;
  errorMessage?: string;
}

// Analytics types
export interface TestResult {
  testId: string;
  studentId: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  timeSpent: number;
  completedAt: Date;
}

export interface CenterPerformance {
  centerId: string;
  totalTests: number;
  totalStudents: number;
  averageScore: number;
  completionRate: number;
  period: {
    start: Date;
    end: Date;
  };
}

// Express Request extensions
export interface AuthenticatedRequest extends Request {
  user?: User;
  centerId?: string;
}

// Container types
export interface ServiceFactory<T = any> {
  (...dependencies: any[]): T;
}

export interface ServiceDefinition {
  factory: ServiceFactory;
  singleton: boolean;
  dependencies: string[];
}

// Error types
export interface AppError extends Error {
  statusCode: number;
  isOperational: boolean;
}

// Database connection types
export interface DatabaseConfig {
  url: string;
  options: {
    useNewUrlParser: boolean;
    useUnifiedTopology: boolean;
    maxPoolSize: number;
    serverSelectionTimeoutMS: number;
    socketTimeoutMS: number;
    bufferCommands: boolean;
    bufferMaxEntries: number;
  };
}

export interface RedisConfig {
  url: string;
  password?: string;
  socket: {
    connectTimeout: number;
    lazyConnect: boolean;
  };
}

// Validation types
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}