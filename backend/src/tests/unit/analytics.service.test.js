import { describe, it, expect, vi, beforeEach } from 'vitest';
import { analyticsService } from '../../modules/analytics/service.js';

// Mock dependencies
vi.mock('../../models/index.js');
vi.mock('../../config/logger.js');

import { Test, TestSession, User } from '../../models/index.js';
import { logger } from '../../config/logger.js';

// Mock logger methods
logger.info = vi.fn();
logger.warn = vi.fn();
logger.error = vi.fn();
logger.debug = vi.fn();

describe('AnalyticsService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Error Handling', () => {
        it('should handle database errors gracefully', async () => {
            // Arrange
            Test.findById = vi.fn().mockRejectedValue(new Error('Database error'));

            // Act & Assert
            await expect(analyticsService.getTestAnalytics('test123'))
                .rejects.toThrow('Failed to retrieve test analytics');

            expect(logger.error).toHaveBeenCalledWith(
                'Error getting test analytics:',
                expect.any(Error)
            );
        });

        it('should handle database connection errors', async () => {
            // Arrange
            TestSession.aggregate = vi.fn().mockRejectedValue(new Error('Connection failed'));

            // Act & Assert
            await expect(analyticsService.getCenterPerformance('center123'))
                .rejects.toThrow('Failed to retrieve center performance data');
        });
    });

    describe('Utility Methods', () => {
        it('should return correct empty basic stats structure', () => {
            // Act
            const result = analyticsService._getEmptyBasicStats();

            // Assert
            expect(result).toEqual({
                totalAttempts: 0,
                completedAttempts: 0,
                averageScore: 0,
                highestScore: 0,
                lowestScore: 0,
                passRate: 0,
                averageDuration: 0,
                abandonmentRate: 0
            });
        });

        it('should validate service methods exist', () => {
            // Assert that all expected methods exist
            expect(typeof analyticsService.getTestAnalytics).toBe('function');
            expect(typeof analyticsService.getCenterPerformance).toBe('function');
            expect(typeof analyticsService.getStudentPerformance).toBe('function');
            expect(typeof analyticsService.getDashboardAnalytics).toBe('function');
            expect(typeof analyticsService.generatePerformanceReport).toBe('function');
            expect(typeof analyticsService._getEmptyBasicStats).toBe('function');
        });
    });
});
