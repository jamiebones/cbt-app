/**
 * Dependency Injection Container
 * Manages internal module communication and dependencies
 */

import { logger } from './logger.js';
import database from './database.js';
import redis from './redis.js';
import { AuthService } from '../modules/auth/service.js';
import { UserService } from '../modules/users/service.js';
import { TestService } from '../modules/tests/service.js';
import { SubscriptionService } from '../modules/subscriptions/service.js';

class Container {
    constructor() {
        this.services = new Map();
        this.singletons = new Map();
    }

    // Register a service
    register(name, factory, options = {}) {
        this.services.set(name, {
            factory,
            singleton: options.singleton || false,
            dependencies: options.dependencies || []
        });
    }

    // Get a service instance
    get(name) {
        const service = this.services.get(name);

        if (!service) {
            throw new Error(`Service '${name}' not found`);
        }

        // Return singleton instance if already created
        if (service.singleton && this.singletons.has(name)) {
            return this.singletons.get(name);
        }

        // Resolve dependencies
        const dependencies = service.dependencies.map(dep => this.get(dep));

        // Create instance
        const instance = service.factory(...dependencies);

        // Store singleton instance
        if (service.singleton) {
            this.singletons.set(name, instance);
        }

        return instance;
    }

    // Check if service is registered
    has(name) {
        return this.services.has(name);
    }

    // Clear all services (useful for testing)
    clear() {
        this.services.clear();
        this.singletons.clear();
    }
}

// Create global container instance
const container = new Container();

// Register core services
container.register('logger', () => logger, { singleton: true });
container.register('database', () => database, { singleton: true });
container.register('redis', () => redis, { singleton: true });

// Register application services
container.register('userService', () => {
    return new UserService(
        container.get('logger'),
        container.get('database')
    );
}, {
    singleton: true,
    dependencies: ['logger', 'database']
});

container.register('authService', () => {
    return new AuthService(
        container.get('logger'),
        container.get('userService')
    );
}, {
    singleton: true,
    dependencies: ['logger', 'userService']
});

container.register('subscriptionService', () => {
    return new SubscriptionService(
        container.get('logger'),
        container.get('database')
    );
}, {
    singleton: true,
    dependencies: ['logger', 'database']
});

container.register('testService', () => {
    return new TestService(
        container.get('logger'),
        container.get('database'),
        container.get('subscriptionService')
    );
}, {
    singleton: true,
    dependencies: ['logger', 'database', 'subscriptionService']
});

export { container };