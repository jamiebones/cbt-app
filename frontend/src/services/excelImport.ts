import { mainApi, handleApiError } from '@/services/api';
import { API_ENDPOINTS } from '@/utils/config';

export interface ExcelPreviewResult {
  success: boolean;
  preview: {
    totalRowsInFile: number;
    previewRows: number;
    validCount: number;
    invalidCount: number;
    subscriptionAllowed: boolean;
    subscriptionMessage?: string;
  };
  sampleQuestions: Array<{
    row: number;
    questionText: string;
    type: string;
    difficulty: string;
    points: number;
    hasAnswers: boolean;
  }>;
  errors: Array<{ row?: number; column?: string; message: string }>;
  warnings: Array<{ row?: number; column?: string; message: string }>;
  metadata?: any;
}

export interface ExcelImportResult {
  success: boolean;
  message: string;
  batchId?: string;
  summary?: {
    totalRows: number;
    validCount: number;
    invalidCount: number;
    successCount: number;
    errorCount: number;
  };
  importedQuestions?: Array<{
    id: string;
    questionText: string;
    type: string;
    difficulty: string;
    points: number;
  }>;
  validationErrors?: Array<{ row?: number; column?: string; message: string }>;
  validationWarnings?: Array<{ row?: number; column?: string; message: string }>;
  results?: any[];
}

const buildFormData = (file: File, subjectCode: string, maxRows?: number) => {
  const formData = new FormData();
  const original = subjectCode;
  // We no longer transform subject codes; backend accepts stored format
  if (typeof window !== 'undefined') {
    // eslint-disable-next-line no-console
    console.log('[EXCEL][buildFormData] subjectCode (no transform):', original);
  }
  formData.append('excelFile', file);
  formData.append('subjectCode', original);
  if (maxRows !== undefined) formData.append('maxRows', String(maxRows));
  return formData;
};

export const excelImportService = {
  downloadTemplate: async (): Promise<Blob> => {
    try {
      const response = await mainApi.get(API_ENDPOINTS.QUESTIONS_BULK_IMPORT_TEMPLATE, { responseType: 'blob' });
      return response.data as Blob;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },
  previewImport: async (file: File, subjectCode: string, maxRows = 100): Promise<ExcelPreviewResult> => {
    try {
      const formData = buildFormData(file, subjectCode, maxRows);
      const response = await mainApi.post(API_ENDPOINTS.QUESTIONS_BULK_IMPORT_PREVIEW, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data.data as ExcelPreviewResult;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },
  importQuestions: async (file: File, subjectCode: string): Promise<ExcelImportResult> => {
    try {
      const formData = buildFormData(file, subjectCode);
      const response = await mainApi.post(API_ENDPOINTS.QUESTIONS_BULK_IMPORT, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data.data as ExcelImportResult;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  },
  getBatchStatus: async (batchId: string) => {
    try {
      const response = await mainApi.get(API_ENDPOINTS.QUESTIONS_BULK_IMPORT_STATUS(batchId));
      return response.data.data;
    } catch (error) {
      throw new Error(handleApiError(error));
    }
  }
};

export default excelImportService;
