import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        // Test environment
        environment: 'node',

        // Test file patterns
        include: ['src/tests/**/*.test.js'],

        // Setup files
        setupFiles: ['src/tests/setup.js'],

        // Global test timeout
        testTimeout: 10000,

        // Coverage configuration
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            include: [
                'src/**/*.js'
            ],
            exclude: [
                'src/tests/**',
                'src/server.js'
            ]
        },

        // Global variables (similar to Jest globals)
        globals: true,

        // Better error reporting
        reporter: 'verbose'
    },

    // Resolve configuration for imports
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src')
        }
    }
});
