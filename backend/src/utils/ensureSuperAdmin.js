import { logger } from '../config/logger.js';

export async function ensureSuperAdmin(userService) {
    const superAdminEmail = 'jamiebones2000@yahoo.co.uk';
    const superAdminRole = 'super_admin';
    const superAdminPassword = 'blazing147';
    let user = await userService.findByEmail(superAdminEmail);
    if (!user || user.role !== superAdminRole) {
        logger.info('Creating super-admin account...');
        const userData = {
            email: superAdminEmail,
            password: superAdminPassword,
            role: superAdminRole,
            firstName: 'James',
            lastName: 'Oshomah',
            isActive: true,
            isEmailVerified: true
        };
        user = await userService.create(userData);
        logger.info('Super-admin account created:', { email: superAdminEmail });
    } else {
        logger.info('Super-admin account exists:', { email: superAdminEmail });
    }
}
