/**
 * Role-based authorization middleware
 * Checks if the authenticated user has one of the required roles
 */
const authorize = (roles) => {
    // Ensure roles is always an array
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    return (req, res, next) => {
        // Check if user is authenticated (should be handled by authenticateToken middleware first)
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        // Check if user has one of the required roles
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied - insufficient permissions'
            });
        }

        // User is authorized, proceed to next middleware
        next();
    };
};

export { authorize };
