import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import app from '../../../src/server.js';
import mongoose from 'mongoose';
import { User, Subject } from '../../../src/models/index.js';
import * as XLSX from 'xlsx';

// Helper to build minimal excel buffer
const buildExcel = () => {
    const data = [
        ['Question Text', 'Question Type', 'Option A', 'Option B', 'Option C', 'Option D', 'Correct Answer', 'Points', 'Difficulty', 'Explanation'],
        ['What is 2 + 2?', 'multiple_choice', '3', '4', '5', '6', 'B', '1', 'easy', 'Basic addition']
    ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Questions');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
};

describe('Excel import authorization', () => {
    let ownerToken; let creatorToken; let subject;

    beforeAll(async () => {
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cbt_test');
        }
    });

    afterAll(async () => {
        await mongoose.connection.close();
    });

    beforeEach(async () => {
        await mongoose.connection.db.dropDatabase();

        const ownerRes = await request(app)
            .post('/api/auth/register')
            .send({
                firstName: 'Owner',
                lastName: 'One',
                email: 'owner@example.com',
                password: 'Password123!',
                role: 'test_center_owner',
                testCenterName: 'Center'
            });
        ownerToken = ownerRes.body.data?.accessToken || ownerRes.body.accessToken;

        // Create test subject under owner
        const ownerUser = await User.findOne({ email: 'owner@example.com' });
        subject = await Subject.create({
            name: 'Math', code: 'MATH101', description: 'Math', testCenterOwner: ownerUser._id, createdBy: ownerUser._id
        });

        // Register test creator linked to owner
        const creatorRes = await request(app)
            .post('/api/auth/register')
            .send({
                firstName: 'Creator',
                lastName: 'User',
                email: 'creator@example.com',
                password: 'Password123!',
                role: 'test_creator',
                testCenterOwnerEmail: 'owner@example.com'
            });
        creatorToken = creatorRes.body.data?.accessToken || creatorRes.body.accessToken;
    });

    it('allows owner to preview and import', async () => {
        const excelBuffer = buildExcel();
        const preview = await request(app)
            .post('/api/questions/bulk-import/preview')
            .set('Authorization', `Bearer ${ownerToken}`)
            .attach('excelFile', excelBuffer, 'questions.xlsx')
            .field('subjectCode', 'MATH101');

        expect(preview.status).toBe(200);
        expect(preview.body.success).toBe(true);

        const importRes = await request(app)
            .post('/api/questions/bulk-import')
            .set('Authorization', `Bearer ${ownerToken}`)
            .attach('excelFile', excelBuffer, 'questions.xlsx')
            .field('subjectCode', 'MATH101');
        expect(importRes.status).toBe(200);
        expect(importRes.body.success).toBe(true);
    });

    it('blocks creator from preview/import/template/status', async () => {
        const excelBuffer = buildExcel();

        const endpoints = [
            { method: 'post', url: '/api/questions/bulk-import/preview', sendFile: true },
            { method: 'post', url: '/api/questions/bulk-import', sendFile: true },
            { method: 'get', url: '/api/questions/bulk-import/template' }
        ];

        for (const ep of endpoints) {
            let req = request(app)[ep.method](ep.url).set('Authorization', `Bearer ${creatorToken}`);
            if (ep.sendFile) {
                req = req.attach('excelFile', excelBuffer, 'questions.xlsx').field('subjectCode', 'MATH101');
            }
            const res = await req;
            expect(res.status).toBe(403);
            expect(res.body.message).toMatch(/Access denied/i);
        }
    });
});
