import { mainApi, handleApiError } from '@/services/api';
import { API_ENDPOINTS } from '@/utils/config';
import { Test, Subject } from '@/types';

export interface CreateTestData {
  title: string;
  description?: string;
  instructions?: string;
  duration: number;
  totalQuestions: number;
  passingScore: number;
  questionSelectionMethod: 'manual' | 'auto' | 'mixed';
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
}

export interface TestFilters {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  subject?: string;
  sort?: string;
}

export interface PaginatedTestsResponse {
  tests: Test[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

class TestService {
  // Get all tests with optional filters
  async getTests(filters: TestFilters = {}): Promise<PaginatedTestsResponse> {
    try {
      const params = new URLSearchParams();

      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('limit', filters.limit.toString());
      if (filters.status) params.append('status', filters.status);
      if (filters.search) params.append('search', filters.search);
      if (filters.subject) params.append('subject', filters.subject);
      if (filters.sort) params.append('sort', filters.sort);

      const response = await mainApi.get(`${API_ENDPOINTS.TESTS}?${params.toString()}`);
      return {
        tests: response.data.data || [],
        pagination: response.data.pagination || {
          page: 1,
          limit: 20,
          total: 0,
          pages: 0
        }
      };
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  // Get a single test by ID
  async getTestById(id: string): Promise<Test> {
    try {
      const response = await mainApi.get(`${API_ENDPOINTS.TESTS}/${id}`);
      return response.data.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  // Create a new test
  async createTest(testData: CreateTestData): Promise<Test> {
    try {
      const response = await mainApi.post(API_ENDPOINTS.TESTS, testData);
      return response.data.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  // Update an existing test
  async updateTest(id: string, testData: Partial<CreateTestData>): Promise<Test> {
    try {
      const response = await mainApi.put(`${API_ENDPOINTS.TESTS}/${id}`, testData);
      return response.data.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  // Delete a test
  async deleteTest(id: string): Promise<void> {
    try {
      await mainApi.delete(`${API_ENDPOINTS.TESTS}/${id}`);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  // Update test status
  async updateStatus(id: string, status: Test['status']): Promise<{ success: boolean; status: Test['status'] }>
  {
    try {
      const response = await mainApi.patch(API_ENDPOINTS.TEST_UPDATE_STATUS(id), { status });
      return response.data.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  // Get subjects for test creation
  async getSubjects(): Promise<Subject[]> {
    try {
      const response = await mainApi.get(API_ENDPOINTS.SUBJECTS);
      return response.data.data || [];
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }
}

export const testService = new TestService();
