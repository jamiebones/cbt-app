const request = require('supertest');
const app = require('../server');

describe('CBT Backend Server', () => {
    describe('Health Check Endpoints', () => {
        test('GET /api/health should return basic health status', async () => {
            const response = await request(app)
                .get('/api/health')
                .expect(200);

            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('message', 'CBT Backend Server is running');
            expect(response.body).toHaveProperty('timestamp');
            expect(response.body).toHaveProperty('environment');
        });

        test('GET /api/health/live should return liveness status', async () => {
            const response = await request(app)
                .get('/api/health/live')
                .expect(200);

            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('message', 'Service is alive');
            expect(response.body).toHaveProperty('uptime');
        });
    });

    describe('Module Endpoints', () => {
        test('Auth module endpoints should be accessible', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .expect(501);

            expect(response.body).toHaveProperty('success', false);
            expect(response.body.message).toContain('not implemented yet');
        });

        test('User module endpoints should be accessible', async () => {
            const response = await request(app)
                .get('/api/users')
                .expect(501);

            expect(response.body).toHaveProperty('success', false);
            expect(response.body.message).toContain('not implemented yet');
        });

        test('Test module endpoints should be accessible', async () => {
            const response = await request(app)
                .get('/api/tests')
                .expect(501);

            expect(response.body).toHaveProperty('success', false);
            expect(response.body.message).toContain('not implemented yet');
        });
    });

    describe('Error Handling', () => {
        test('Should return 404 for non-existent routes', async () => {
            const response = await request(app)
                .get('/api/non-existent')
                .expect(404);

            expect(response.body).toHaveProperty('success', false);
            expect(response.body.error.message).toContain('Route not found');
        });
    });
});