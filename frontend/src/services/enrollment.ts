import { mainApi, handleApiError } from '@/services/api';
import { API_ENDPOINTS } from '@/utils/config';
import { Test } from '@/types';

export interface EnrollmentResponse {
  enrollment: {
    _id: string;
    test: Test | string;
    student: string;
    accessCode: string;
    paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded';
    enrollmentStatus: 'payment_pending' | 'enrolled' | 'cancelled' | 'expired' | 'blocked';
  };
  paymentData?: {
    transactionId: string;
    status: 'pending' | 'completed' | 'failed';
    paymentUrl?: string | null;
  };
}

class EnrollmentService {
  async listActiveTestsForMyCenter(): Promise<Test[]> {
    try {
      const res = await mainApi.get(API_ENDPOINTS.TESTS_ACTIVE_MY_CENTER);
      return res.data.data || [];
    } catch (e) {
      throw new Error(handleApiError(e));
    }
  }

  async enrollForTest(testId: string, notes?: string): Promise<EnrollmentResponse> {
    try {
      const res = await mainApi.post(API_ENDPOINTS.TEST_ENROLL, { testId, notes });
      return res.data.data;
    } catch (e) {
      throw new Error(handleApiError(e));
    }
  }

  async payForEnrollment(enrollmentId: string, paymentMethod: string = 'card') {
    try {
      const res = await mainApi.post(API_ENDPOINTS.TEST_ENROLLMENT_PAY(enrollmentId), { paymentMethod });
      return res.data.data;
    } catch (e) {
      throw new Error(handleApiError(e));
    }
  }

  async myEnrollments() {
    try {
      const res = await mainApi.get(API_ENDPOINTS.MY_ENROLLMENTS);
      return res.data.data;
    } catch (e) {
      throw new Error(handleApiError(e));
    }
  }
}

export const enrollmentService = new EnrollmentService();
