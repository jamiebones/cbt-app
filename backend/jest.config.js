export default {
    testEnvironment: 'node',
    testMatch: ['**/src/tests/**/*.test.js'],
    collectCoverageFrom: [
        'src/**/*.js',
        '!src/tests/**',
        '!src/server.js'
    ],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],
    setupFilesAfterEnv: ['<rootDir>/src/tests/setup.js'],
    testTimeout: 10000,
    verbose: true,
    extensionsToTreatAsEsm: ['.js'],
    globals: {
        'ts-jest': {
            useESM: true
        }
    },
    moduleNameMapping: {
        '^(\\.{1,2}/.*)\\.js$': '$1'
    }
};