import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        testTimeout: 30000, // 30 seconds for Docker operations
        hookTimeout: 30000,
        teardownTimeout: 10000,
        pool: 'forks',
        poolOptions: {
            forks: {
                singleFork: true // Prevent parallel DB access issues
            }
        },
        setupFiles: ['./src/tests/setup/docker-setup.js'],
        globalSetup: ['./src/tests/setup/global-docker-setup.js']
    }
});
