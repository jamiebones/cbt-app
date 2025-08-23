import { vi } from 'vitest';
import fs from 'fs/promises';

// Mock media test data generators
export const createTestImageBuffer = (size = 1024) => {
    // Create a simple test image buffer
    const buffer = Buffer.alloc(size);
    // Fill with some pattern to simulate image data
    for (let i = 0; i < size; i++) {
        buffer[i] = i % 256;
    }
    return buffer;
};

export const createTestAudioBuffer = (size = 2048) => {
    // Create a simple test audio buffer
    const buffer = Buffer.alloc(size);
    // Fill with some pattern to simulate audio data
    for (let i = 0; i < size; i++) {
        buffer[i] = Math.sin(i * 0.1) * 127 + 128;
    }
    return buffer;
};

export const createTestVideoBuffer = (size = 4096) => {
    // Create a simple test video buffer
    const buffer = Buffer.alloc(size);
    // Fill with some pattern to simulate video data
    for (let i = 0; i < size; i++) {
        buffer[i] = (i * 3) % 256;
    }
    return buffer;
};

export const createInvalidFileBuffer = (size = 512) => {
    // Create a buffer that doesn't match any valid media format
    const buffer = Buffer.alloc(size);
    buffer.fill(0xFF); // Fill with invalid data
    return buffer;
};

export const createLargeFileBuffer = (size) => {
    // Create a buffer of specified size for testing size limits
    return Buffer.alloc(size, 'x');
};

// File system operation mocks
let originalFsMethods = {};

export const mockFileSystemOperations = () => {
    // Store original methods
    originalFsMethods = {
        mkdir: fs.mkdir,
        writeFile: fs.writeFile,
        readdir: fs.readdir,
        stat: fs.stat,
        unlink: fs.unlink
    };

    // Replace with mocks
    fs.mkdir = vi.fn().mockResolvedValue(undefined);
    fs.writeFile = vi.fn().mockResolvedValue(undefined);
    fs.readdir = vi.fn().mockResolvedValue([]);
    fs.stat = vi.fn().mockResolvedValue({
        size: 1024,
        birthtime: new Date(),
        mtime: new Date(),
        isFile: () => true
    });
    fs.unlink = vi.fn().mockResolvedValue(undefined);
};

export const restoreFileSystemOperations = () => {
    // Restore original methods
    Object.keys(originalFsMethods).forEach(method => {
        fs[method] = originalFsMethods[method];
    });
    originalFsMethods = {};
};

// Test case generators for different media scenarios
export const createMediaTestCases = () => {
    return {
        validImages: [
            { name: 'test.jpg', mime: 'image/jpeg', size: 1024 },
            { name: 'test.png', mime: 'image/png', size: 2048 },
            { name: 'test.gif', mime: 'image/gif', size: 512 },
            { name: 'test.webp', mime: 'image/webp', size: 1536 }
        ],
        validAudio: [
            { name: 'test.mp3', mime: 'audio/mpeg', size: 2048 },
            { name: 'test.wav', mime: 'audio/wav', size: 4096 },
            { name: 'test.ogg', mime: 'audio/ogg', size: 3072 },
            { name: 'test.m4a', mime: 'audio/mp4', size: 2560 }
        ],
        validVideos: [
            { name: 'test.mp4', mime: 'video/mp4', size: 8192 },
            { name: 'test.mpeg', mime: 'video/mpeg', size: 10240 },
            { name: 'test.mov', mime: 'video/quicktime', size: 7168 },
            { name: 'test.avi', mime: 'video/x-msvideo', size: 9216 },
            { name: 'test.webm', mime: 'video/webm', size: 6144 }
        ],
        invalidFiles: [
            { name: 'test.txt', mime: 'text/plain', size: 1024 },
            { name: 'test.doc', mime: 'application/msword', size: 2048 },
            { name: 'test.pdf', mime: 'application/pdf', size: 4096 },
            { name: 'test.exe', mime: 'application/octet-stream', size: 8192 }
        ],
        oversizedFiles: {
            image: { size: 15 * 1024 * 1024, limit: '10MB' }, // 15MB > 10MB limit
            audio: { size: 60 * 1024 * 1024, limit: '50MB' }, // 60MB > 50MB limit
            video: { size: 120 * 1024 * 1024, limit: '100MB' } // 120MB > 100MB limit
        }
    };
};

// Mock upload test data
export const createMockUploadData = (type = 'image', overrides = {}) => {
    const baseData = {
        image: {
            buffer: createTestImageBuffer(),
            originalName: 'test-image.jpg',
            mimeType: 'image/jpeg',
            size: 1024
        },
        audio: {
            buffer: createTestAudioBuffer(),
            originalName: 'test-audio.mp3',
            mimeType: 'audio/mpeg',
            size: 2048
        },
        video: {
            buffer: createTestVideoBuffer(),
            originalName: 'test-video.mp4',
            mimeType: 'video/mp4',
            size: 4096
        }
    };

    return {
        ...baseData[type],
        ...overrides
    };
};

// Mock Sharp operations
export const createMockSharp = () => {
    const mockSharp = {
        resize: vi.fn().mockReturnThis(),
        jpeg: vi.fn().mockReturnThis(),
        png: vi.fn().mockReturnThis(),
        webp: vi.fn().mockReturnThis(),
        toBuffer: vi.fn().mockResolvedValue(Buffer.from('optimized-image')),
        toFile: vi.fn().mockResolvedValue({ size: 1024 })
    };

    return mockSharp;
};

// Mock FFmpeg operations  
export const createMockFFmpeg = () => {
    const mockFFmpeg = vi.fn().mockImplementation(() => ({
        input: vi.fn().mockReturnThis(),
        output: vi.fn().mockReturnThis(),
        screenshots: vi.fn().mockReturnThis(),
        on: vi.fn().mockReturnThis(),
        run: vi.fn().mockReturnThis(),
        probe: vi.fn().mockImplementation((path, callback) => {
            callback(null, {
                format: {
                    duration: '120.5',
                    size: '1024000',
                    bit_rate: '5000'
                },
                streams: [{
                    codec_name: 'h264',
                    width: 1920,
                    height: 1080,
                    r_frame_rate: '30/1'
                }]
            });
        })
    }));

    return mockFFmpeg;
};

// Performance test helpers
export const createPerformanceTestData = () => {
    return {
        smallFiles: Array(10).fill(null).map((_, i) => ({
            buffer: createTestImageBuffer(1024),
            originalName: `small-${i}.jpg`,
            type: 'image'
        })),
        mediumFiles: Array(5).fill(null).map((_, i) => ({
            buffer: createTestImageBuffer(1024 * 1024), // 1MB
            originalName: `medium-${i}.jpg`,
            type: 'image'
        })),
        largeFiles: Array(2).fill(null).map((_, i) => ({
            buffer: createTestImageBuffer(5 * 1024 * 1024), // 5MB
            originalName: `large-${i}.jpg`,
            type: 'image'
        }))
    };
};

// Security test helpers
export const createSecurityTestCases = () => {
    return {
        maliciousFilenames: [
            '../../../etc/passwd',
            '..\\..\\windows\\system32\\config\\sam',
            'test.jpg.exe',
            'test.php.jpg',
            '<script>alert("xss")</script>.jpg',
            'test;rm -rf /.jpg'
        ],
        pathTraversalAttempts: [
            '../../../../sensitive-file.txt',
            '..\\..\\..\\windows\\system.ini',
            '/etc/shadow',
            'C:\\Windows\\System32\\config\\SAM'
        ],
        nullByteInjection: [
            'test.jpg\0.php',
            'image.png\x00.exe',
            'safe.gif\u0000malicious.bat'
        ]
    };
};

// Concurrent operation test helpers
export const createConcurrentTestScenarios = () => {
    return {
        simultaneousUploads: (count = 5) => {
            return Array(count).fill(null).map((_, i) => ({
                buffer: createTestImageBuffer(1024 + i * 100),
                originalName: `concurrent-${i}.jpg`,
                type: 'image',
                userId: `user-${i % 3}` // Simulate different users
            }));
        },
        mixedOperations: () => {
            return [
                { operation: 'upload', data: createMockUploadData('image') },
                { operation: 'delete', data: { fileName: 'old-file.jpg', type: 'image' } },
                { operation: 'upload', data: createMockUploadData('audio') },
                { operation: 'getInfo', data: { fileName: 'existing.mp3', type: 'audio' } },
                { operation: 'upload', data: createMockUploadData('video') }
            ];
        }
    };
};

// Error simulation helpers
export const createErrorScenarios = () => {
    return {
        fileSystemErrors: {
            diskFull: new Error('ENOSPC: no space left on device'),
            permissionDenied: (() => {
                const error = new Error('EACCES: permission denied');
                error.code = 'EACCES';
                return error;
            })(),
            fileNotFound: (() => {
                const error = new Error('ENOENT: no such file or directory');
                error.code = 'ENOENT';
                return error;
            })(),
            pathTooLong: new Error('ENAMETOOLONG: file name too long'),
            ioError: new Error('EIO: i/o error')
        },
        processingErrors: {
            sharpOptimizationFailed: new Error('Sharp: Input file is corrupt'),
            ffmpegProcessingFailed: new Error('FFmpeg: Unable to process video'),
            fileTypeDetectionFailed: new Error('file-type: Unable to determine file type'),
            metadataExtractionFailed: new Error('Metadata extraction failed')
        },
        networkErrors: {
            connectionTimeout: new Error('ETIMEDOUT: connection timed out'),
            networkUnreachable: new Error('ENETUNREACH: network is unreachable'),
            connectionReset: new Error('ECONNRESET: connection reset by peer')
        }
    };
};

// Validation test helpers
export const createValidationTestCases = () => {
    return {
        fileExtensions: {
            valid: {
                image: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.JPG', '.JPEG', '.PNG'],
                audio: ['.mp3', '.wav', '.ogg', '.m4a', '.MP3', '.WAV', '.OGG'],
                video: ['.mp4', '.mpeg', '.mov', '.avi', '.webm', '.MP4', '.MPEG', '.MOV']
            },
            invalid: {
                image: ['.txt', '.doc', '.exe', '.php', '.js', '.html'],
                audio: ['.mp4', '.jpg', '.exe', '.php', '.js', '.html'],
                video: ['.jpg', '.mp3', '.exe', '.php', '.js', '.html']
            }
        },
        mimeTypes: {
            valid: {
                image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
                audio: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/x-m4a'],
                video: ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/webm']
            },
            invalid: {
                image: ['text/plain', 'application/pdf', 'video/mp4', 'audio/mpeg'],
                audio: ['image/jpeg', 'video/mp4', 'text/plain', 'application/pdf'],
                video: ['image/jpeg', 'audio/mpeg', 'text/plain', 'application/pdf']
            }
        }
    };
};

// Storage statistics test helpers
export const createStorageStatsTestData = () => {
    return {
        mockDirectoryContents: {
            images: ['img1.jpg', 'img2.png', 'img3.gif', 'thumbnails'],
            audio: ['audio1.mp3', 'audio2.wav', 'audio3.ogg'],
            videos: ['video1.mp4', 'video2.mov', 'thumbnails']
        },
        mockFileSizes: {
            'img1.jpg': 1024,
            'img2.png': 2048,
            'img3.gif': 512,
            'audio1.mp3': 3072,
            'audio2.wav': 4096,
            'audio3.ogg': 2560,
            'video1.mp4': 10240,
            'video2.mov': 8192
        },
        expectedStats: {
            images: { files: 3, size: 3584, sizeFormatted: '3.5 KB' },
            audio: { files: 3, size: 9728, sizeFormatted: '9.5 KB' },
            videos: { files: 2, size: 18432, sizeFormatted: '18 KB' },
            total: { files: 8, size: 31744 }
        }
    };
};

// Cleanup test helpers
export const createCleanupTestData = () => {
    return {
        orphanedFiles: [
            { name: 'orphan1.jpg', size: 1024, type: 'image' },
            { name: 'orphan2.mp3', size: 2048, type: 'audio' },
            { name: 'orphan3.mp4', size: 4096, type: 'video' }
        ],
        referencedFiles: [
            { name: 'active1.jpg', size: 1024, type: 'image', questionId: 'q1' },
            { name: 'active2.mp3', size: 2048, type: 'audio', questionId: 'q2' }
        ],
        expectedCleanup: {
            imagesDeleted: 1,
            audioDeleted: 1,
            videosDeleted: 1,
            spaceFreed: 7168 // 1024 + 2048 + 4096
        }
    };
};

// Batch operation test helpers
export const createBatchTestData = () => {
    return {
        validBatch: [
            { buffer: createTestImageBuffer(), originalName: 'batch1.jpg', type: 'image' },
            { buffer: createTestImageBuffer(), originalName: 'batch2.png', type: 'image' },
            { buffer: createTestAudioBuffer(), originalName: 'batch3.mp3', type: 'audio' }
        ],
        mixedBatch: [
            { buffer: createTestImageBuffer(), originalName: 'good1.jpg', type: 'image' },
            { buffer: createInvalidFileBuffer(), originalName: 'bad1.txt', type: 'image' },
            { buffer: createTestAudioBuffer(), originalName: 'good2.mp3', type: 'audio' },
            { buffer: createLargeFileBuffer(15 * 1024 * 1024), originalName: 'bad2.jpg', type: 'image' }
        ],
        expectedResults: {
            validBatch: { successCount: 3, errorCount: 0 },
            mixedBatch: { successCount: 2, errorCount: 2 }
        }
    };
};

export default {
    createTestImageBuffer,
    createTestAudioBuffer,
    createTestVideoBuffer,
    createInvalidFileBuffer,
    createLargeFileBuffer,
    mockFileSystemOperations,
    restoreFileSystemOperations,
    createMediaTestCases,
    createMockUploadData,
    createMockSharp,
    createMockFFmpeg,
    createPerformanceTestData,
    createSecurityTestCases,
    createConcurrentTestScenarios,
    createErrorScenarios,
    createValidationTestCases,
    createStorageStatsTestData,
    createCleanupTestData,
    createBatchTestData
};
