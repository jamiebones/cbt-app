import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

class AuthService {
    constructor(logger, userService) {
        this.logger = logger;
        this.userService = userService;
        this.JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
        this.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
    }

    async hashPassword(password) {
        return bcrypt.hash(password, 10);
    }

    async comparePasswords(plainPassword, hashedPassword) {
        return bcrypt.compare(plainPassword, hashedPassword);
    }

    async generateToken(user) {
        this.logger.info(`Generating token for user: ${user.id}`);
        return jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            this.JWT_SECRET,
            { expiresIn: this.JWT_EXPIRES_IN }
        );
    }

    async validateToken(token) {
        try {
            this.logger.info('Validating token');
            const decoded = jwt.verify(token, this.JWT_SECRET);
            const user = await this.userService.findById(decoded.id);
            return user;
        } catch (error) {
            this.logger.error('Token validation failed:', error.message);
            return null;
        }
    }

    async register(userData) {
        this.logger.info('Registering new user');
        const hashedPassword = await this.hashPassword(userData.password);
        const user = await this.userService.create({
            ...userData,
            password: hashedPassword
        });
        const token = await this.generateToken(user);
        return { user, token };
    }

    async login(email, password) {
        this.logger.info('Attempting login for user:', email);
        const user = await this.userService.findByEmail(email);

        if (!user) {
            throw new Error('User not found');
        }

        const isValidPassword = await this.comparePasswords(password, user.password);
        if (!isValidPassword) {
            throw new Error('Invalid password');
        }

        const token = await this.generateToken(user);
        return { user, token };
    }

    async refreshToken(userId) {
        this.logger.info('Refreshing token for user:', userId);
        const user = await this.userService.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }
        return this.generateToken(user);
    }
}

export { AuthService };
