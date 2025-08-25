// Debug script to test enrollment population
console.log("Starting debug test...");

try {
    // Import using require since this is a debug script
    const mongoose = require('mongoose');
    const path = require('path');
    
    // Get the models by requiring them
    process.chdir('/app');
    
    const { TestEnrollment } = require('./src/models/TestEnrollment.js');
    const { User } = require('./src/models/User.js');
    const { Test } = require('./src/models/Test.js');
    const { connectDatabase } = require('./src/config/database.js');
    
    (async () => {
        await connectDatabase();
        console.log("✅ Connected to database");
        
        const testCenterId = '68abdaa97af3ab009589b03d';
        const testId = '68abdaa97af3ab009589b03e';
        
        console.log("Testing enrollment query...");
        
        const enrollments = await TestEnrollment.find({
            test: testId,
            testCenterOwner: new mongoose.Types.ObjectId(testCenterId),
            syncStatus: 'registered'
        });
        
        console.log(`Found ${enrollments.length} enrollments without populate`);
        
        const enrollmentsWithPopulate = await TestEnrollment.find({
            test: testId,
            testCenterOwner: new mongoose.Types.ObjectId(testCenterId),
            syncStatus: 'registered'
        }).populate([
            { path: 'student', select: 'firstName lastName email studentId' },
            { path: 'test', select: 'title duration instructions' }
        ]);
        
        console.log(`Found ${enrollmentsWithPopulate.length} enrollments with populate`);
        
        enrollmentsWithPopulate.forEach((e, i) => {
            console.log(`Enrollment ${i + 1}:`);
            console.log('- ID:', e._id.toString());
            console.log('- Student populated:', !!e.student);
            console.log('- Student ID:', e.student ? e.student._id?.toString() : 'N/A');
            console.log('- Test populated:', !!e.test);
        });
        
        process.exit(0);
    })();
} catch (error) {
    console.error('Debug script error:', error.message);
    process.exit(1);
}
