import jwt from 'jsonwebtoken';
import { logger } from '../config/logger.js';

// Authentication middleware to verify JWT tokens
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Access token is required'
        });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
        if (err) {
            logger.warn('Invalid token attempt', { token: token.substring(0, 10) + '...' });
            return res.status(403).json({
                success: false,
                message: 'Invalid or expired token'
            });
        }

        req.user = user;
        next();
    });
};

// Authorization middleware for role-based access
const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        const userRole = req.user.role;
        const allowedRoles = Array.isArray(roles) ? roles : [roles];

        if (!allowedRoles.includes(userRole)) {
            return res.status(403).json({
                success: false,
                message: 'Insufficient permissions'
            });
        }

        next();
    };
};

// Owner verification middleware
const requireOwnership = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }

    // Allow if user is admin or super_admin
    if (['admin', 'super_admin'].includes(req.user.role)) {
        return next();
    }

    // For test center owners, they can only access their own resources
    if (req.user.role === 'test_center_owner') {
        // The specific ownership check should be implemented in the route handler
        // This middleware just ensures the user has owner privileges
        return next();
    }

    return res.status(403).json({
        success: false,
        message: 'Owner privileges required'
    });
};

// Optional authentication - doesn't fail if no token provided
const optionalAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return next();
    }

    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
        if (!err) {
            req.user = user;
        }
        next();
    });
};

export {
    authenticateToken,
    requireRole,
    requireOwnership,
    optionalAuth
};
