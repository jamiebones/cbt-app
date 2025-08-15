/**
 * Dependency Injection Container
 * Manages internal module communication and dependencies
 */

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
container.register('logger', () => require('./logger').logger, { singleton: true });
container.register('database', () => require('./database'), { singleton: true });
container.register('redis', () => require('./redis'), { singleton: true });

// Register application services
container.register('authService', () => {
    const { AuthService } = require('../modules/auth/service');
    return new AuthService(
        container.get('logger'),
        container.get('userService')
    );
}, {
    singleton: true,
    dependencies: ['logger', 'userService']
});

container.register('userService', () => {
    const { UserService } = require('../modules/users/service');
    return new UserService(
        container.get('logger'),
        container.get('database')
    );
}, {
    singleton: true,
    dependencies: ['logger', 'database']
});

container.register('testService', () => {
    const { TestService } = require('../modules/tests/service');
    return new TestService(
        container.get('logger'),
        container.get('database'),
        container.get('subscriptionService')
    );
}, {
    singleton: true,
    dependencies: ['logger', 'database', 'subscriptionService']
});

container.register('subscriptionService', () => {
    const { SubscriptionService } = require('../modules/subscriptions/service');
    return new SubscriptionService(
        container.get('logger'),
        container.get('database')
    );
}, {
    singleton: true,
    dependencies: ['logger', 'database']
});

module.exports = { container };