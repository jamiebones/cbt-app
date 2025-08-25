#!/bin/bash
# Quick sync test script for Docker environment

echo "🔄 Creating test data for sync functionality..."

# Create test data using MongoDB directly
docker exec cbt-app-mongo-1 mongosh --quiet cbt_app -u cbt_user -p cbt_password_123 --eval "
// Create a test user
const testUser = {
  _id: new ObjectId(),
  name: 'Test Student',
  email: 'test.student@example.com',
  role: 'student',
  createdAt: new Date(),
  updatedAt: new Date()
};

db.users.insertOne(testUser);

// Create test enrollment with sync status
const testEnrollment = {
  _id: new ObjectId(),
  test: ObjectId('68a3037abcd4a6e1235de7ee'), // Using existing test
  user: testUser._id,
  testCenterId: 'test-center-001',
  syncStatus: 'registered',
  scheduledDate: new Date('2025-08-25'),
  scheduledTime: '09:00',
  syncMetadata: {
    registeredAt: new Date(),
    packageId: null,
    downloadedAt: null,
    resultsUploadedAt: null
  },
  createdAt: new Date(),
  updatedAt: new Date()
};

db.testenrollments.insertOne(testEnrollment);

print('✅ Test data created:');
print('- User ID:', testUser._id);
print('- Enrollment ID:', testEnrollment._id);
print('- Test ID: 68a3037abcd4a6e1235de7ee');
print('- Test Center: test-center-001');
"

echo "✅ Test data creation completed!"

echo ""
echo "🧪 Testing sync status endpoint..."
curl -s -X GET "http://localhost:4000/api/sync/status/test-center-001?from=2025-08-01&to=2025-08-31" | jq '.'

echo ""
echo "🧪 Testing download package creation..."
curl -s -X POST "http://localhost:4000/api/sync/download-users" \
  -H "Content-Type: application/json" \
  -d '{"testCenterId": "test-center-001", "testId": "68a3037abcd4a6e1235de7ee"}' | jq '.success, .message, .data.packageId, .data.metadata.totalEnrollments'

echo ""
echo "🧪 Testing sync status after download..."
curl -s -X GET "http://localhost:4000/api/sync/status/test-center-001?from=2025-08-01&to=2025-08-31" | jq '.data.summary'

echo ""
echo "✅ Sync functionality test completed!"
echo "📋 Check the sync status to see the enrollment moved from 'registered' to 'downloaded'"
