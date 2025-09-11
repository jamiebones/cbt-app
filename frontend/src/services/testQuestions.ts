import { mainApi, handleApiError } from '@/services/api';
import { API_ENDPOINTS } from '@/utils/config';
import { Question } from '@/types';

export interface ManualAddPayload { questionIds: string[] }
export interface AutoAddPayload { subjects: string[]; count: number; difficultyDistribution?: { easy?: number; medium?: number; hard?: number } }

export const testQuestionsService = {
  getTestQuestions: async (testId: string): Promise<Question[]> => {
    try {
      const res = await mainApi.get(API_ENDPOINTS.TEST_GET_QUESTIONS(testId));
      return res.data.data || [];
    } catch (e) { throw new Error(handleApiError(e)); }
  },

  addManual: async (testId: string, payload: ManualAddPayload) => {
    try {
      const res = await mainApi.post(API_ENDPOINTS.TEST_QUESTIONS_MANUAL(testId), payload);
      return res.data.data as { added: number; totalInTest: number; addedIds: string[] };
    } catch (e) { throw new Error(handleApiError(e)); }
  },

  addAuto: async (testId: string, payload: AutoAddPayload) => {
    try {
      const res = await mainApi.post(API_ENDPOINTS.TEST_QUESTIONS_AUTO(testId), payload);
      return res.data.data as { requested: number; added: number; totalInTest: number; addedIds: string[] };
    } catch (e) { throw new Error(handleApiError(e)); }
  },

  importExcelToTest: async (testId: string, file: File, subjectCode: string) => {
    try {
      const formData = new FormData();
      formData.append('excelFile', file);
      formData.append('subjectCode', subjectCode);
      const res = await mainApi.post(
        API_ENDPOINTS.TEST_QUESTIONS_IMPORT_EXCEL(testId),
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      return res.data.data as { importResult: any; attachResult: any };
    } catch (e) { throw new Error(handleApiError(e)); }
  },

  removeFromTest: async (testId: string, questionId: string) => {
    try {
      const res = await mainApi.delete(API_ENDPOINTS.TEST_DELETE_QUESTION(testId, questionId));
      return res.data as { success: boolean; message?: string };
    } catch (e) { throw new Error(handleApiError(e)); }
  }
};
