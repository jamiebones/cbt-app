import { mainApi, handleApiError } from '@/services/api';
import { API_ENDPOINTS } from '@/utils/config';
import { Subject, CreateSubjectData, SubjectFilters, PaginatedSubjectsResponse } from '@/types';

class SubjectService {
  // Get all subjects with optional filters
  async getSubjects(filters: SubjectFilters = {}): Promise<PaginatedSubjectsResponse> {
    try {
      const params = new URLSearchParams();

      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('limit', filters.limit.toString());
      if (filters.search) params.append('search', filters.search);
      if (filters.sort) params.append('sort', filters.sort);

      const response = await mainApi.get(`${API_ENDPOINTS.SUBJECTS}?${params.toString()}`);
      return {
        subjects: response.data.data || [],
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

  // Get a single subject by ID
  async getSubjectById(id: string): Promise<Subject> {
    try {
      const response = await mainApi.get(`${API_ENDPOINTS.SUBJECTS}/${id}`);
      return response.data.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  // Create a new subject
  async createSubject(subjectData: CreateSubjectData): Promise<Subject> {
    try {
      const response = await mainApi.post(API_ENDPOINTS.SUBJECTS, subjectData);
      return response.data.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  // Update an existing subject
  async updateSubject(id: string, subjectData: Partial<CreateSubjectData>): Promise<Subject> {
    try {
      const response = await mainApi.put(`${API_ENDPOINTS.SUBJECTS}/${id}`, subjectData);
      return response.data.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }

  // Delete a subject
  async deleteSubject(id: string): Promise<void> {
    try {
      await mainApi.delete(`${API_ENDPOINTS.SUBJECTS}/${id}`);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }
}

export const subjectService = new SubjectService();
