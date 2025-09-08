import { mainApi, handleApiError } from '@/services/api';
import { API_ENDPOINTS } from '@/utils/config';
import { Question, CreateQuestionData, UpdateQuestionData } from '@/types';

export const questionService = {
  // Get all questions
  getQuestions: async (): Promise<Question[]> => {
    try {
      const response = await mainApi.get(API_ENDPOINTS.QUESTIONS);
      return response.data.data || [];
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  // Get questions by subject
  getQuestionsBySubject: async (subjectId: string): Promise<Question[]> => {
    try {
      const response = await mainApi.get(`${API_ENDPOINTS.QUESTIONS}/subject/${subjectId}`);
      return response.data.data || [];
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  // Get question by ID
  getQuestionById: async (id: string): Promise<Question> => {
    try {
      const response = await mainApi.get(`${API_ENDPOINTS.QUESTIONS}/${id}`);
      return response.data.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  // Create new question
  createQuestion: async (questionData: CreateQuestionData): Promise<Question> => {
    try {
      const response = await mainApi.post(API_ENDPOINTS.QUESTIONS, questionData);
      return response.data.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  // Update question
  updateQuestion: async (id: string, questionData: UpdateQuestionData): Promise<Question> => {
    try {
      const response = await mainApi.put(`${API_ENDPOINTS.QUESTIONS}/${id}`, questionData);
      return response.data.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  // Delete question
  deleteQuestion: async (id: string): Promise<void> => {
    try {
      await mainApi.delete(`${API_ENDPOINTS.QUESTIONS}/${id}`);
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  // Bulk delete questions
  bulkDeleteQuestions: async (ids: string[]): Promise<void> => {
    try {
      await mainApi.post(`${API_ENDPOINTS.QUESTIONS}/bulk-delete`, { ids });
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },

  // Search questions
  searchQuestions: async (query: string, subjectId?: string): Promise<Question[]> => {
    try {
      const params = new URLSearchParams({ q: query });
      if (subjectId) params.append("subject", subjectId);
      const response = await mainApi.get(`${API_ENDPOINTS.QUESTIONS}/search?${params}`);
      return response.data.data || [];
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },
};
