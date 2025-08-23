import { redisService } from '../services/redisService.js';
import { logger } from '../config/logger.js';

/**
 * Rate limiting middleware factory
 * @param {Object} options - Rate limiting configuration
 * @returns {Function} Express middleware
 */
export const rateLimiter = (options = {}) => {
    const {
        max = 5,                    // Maximum requests
        windowMs = 15 * 60 * 1000, // 15 minutes window
        message = 'Too many requests, please try again later.',
        keyGenerator = (req) => req.ip,
        skipSuccessfulRequests = false,
        skipFailedRequests = false,
        onLimitReached = null
    } = options;

    const windowSeconds = Math.floor(windowMs / 1000);

    return async (req, res, next) => {
        try {
            const identifier = keyGenerator(req);
            const action = `${req.method}:${req.route?.path || req.path}`;

            // Check rate limit
            const rateLimitStatus = await redisService.checkRateLimit(
                identifier,
                action,
                max,
                windowSeconds
            );

            // Add rate limit headers
            res.set({
                'X-RateLimit-Limit': max,
                'X-RateLimit-Remaining': Math.max(0, max - rateLimitStatus.current),
                'X-RateLimit-Reset': rateLimitStatus.resetTime
            });

            if (!rateLimitStatus.isAllowed) {
                // Add retry after header
                if (rateLimitStatus.retryAfter) {
                    res.set('Retry-After', rateLimitStatus.retryAfter);
                }

                // Call onLimitReached callback if provided
                if (onLimitReached) {
                    onLimitReached(req, res, rateLimitStatus);
                }

                logger.warn('Rate limit exceeded', {
                    identifier,
                    action,
                    current: rateLimitStatus.current,
                    limit: max,
                    ip: req.ip,
                    userAgent: req.get('User-Agent')
                });

                return res.status(429).json({
                    success: false,
                    error: message,
                    retryAfter: rateLimitStatus.retryAfter
                });
            }

            // Store rate limit info in request for potential cleanup
            req.rateLimit = {
                identifier,
                action,
                ...rateLimitStatus
            };

            next();
        } catch (error) {
            logger.error('Rate limiter error:', error);
            // Fail open - allow request if rate limiter fails
            next();
        }
    };
};

/**
 * Login rate limiter - more restrictive
 */
export const loginRateLimiter = rateLimiter({
    max: 5,                     // 5 attempts
    windowMs: 15 * 60 * 1000,  // 15 minutes
    message: 'Too many login attempts, please try again in 15 minutes.',
    keyGenerator: (req) => `${req.ip}:${req.body?.email || 'unknown'}`,
    onLimitReached: (req, res, rateLimitStatus) => {
        logger.warn('Login rate limit exceeded', {
            ip: req.ip,
            email: req.body?.email,
            attempts: rateLimitStatus.current
        });
    }
});

/**
 * Password reset rate limiter
 */
export const passwordResetRateLimiter = rateLimiter({
    max: 3,                     // 3 attempts
    windowMs: 60 * 60 * 1000,  // 1 hour
    message: 'Too many password reset requests, please try again in 1 hour.',
    keyGenerator: (req) => `${req.ip}:${req.body?.email || 'unknown'}`
});

/**
 * API rate limiter - general API protection
 */
export const apiRateLimiter = rateLimiter({
    max: 100,                   // 100 requests
    windowMs: 15 * 60 * 1000,  // 15 minutes
    message: 'Too many API requests, please try again later.',
    keyGenerator: (req) => req.user?.id || req.ip
});

/**
 * Registration rate limiter
 */
export const registrationRateLimiter = rateLimiter({
    max: 3,                     // 3 registrations
    windowMs: 60 * 60 * 1000,  // 1 hour
    message: 'Too many registration attempts, please try again in 1 hour.',
    keyGenerator: (req) => req.ip
});

/**
 * Test submission rate limiter
 */
export const testSubmissionRateLimiter = rateLimiter({
    max: 1,                     // 1 submission
    windowMs: 60 * 1000,       // 1 minute
    message: 'Please wait before submitting another test.',
    keyGenerator: (req) => `${req.user?.id || req.ip}:test_submission`
});

/**
 * Middleware to reset rate limit on successful authentication
 */
export const resetRateLimitOnSuccess = async (req, res, next) => {
    const originalSend = res.send;

    res.send = function (data) {
        // Check if this was a successful authentication
        const isSuccess = res.statusCode >= 200 && res.statusCode < 300;

        if (isSuccess && req.rateLimit) {
            // Reset rate limit for successful login
            redisService.resetRateLimit(req.rateLimit.identifier, req.rateLimit.action)
                .catch(error => logger.error('Failed to reset rate limit:', error));
        }

        return originalSend.call(this, data);
    };

    next();
};
