# CBT Sync Service Testing Guide (Docker Environment)

## Prerequisites
- Docker and Docker Compose installed
- CBT application running in Docker (`docker-compose up -d`)

## Quick Test Commands

### 1. Run All Integration Tests (Including Sync)
```bash
cd /home/jamiebones/Coding_Directory/Tutorials/cbt-app
docker-compose -f docker-compose.test.yml up --abort-on-container-exit
```

### 2. Run Only Sync Integration Tests
```bash
cd /home/jamiebones/Coding_Directory/Tutorials/cbt-app
docker-compose -f docker-compose.test.yml run backend-test npm run test:integration -- sync.integration.test.js
```

### 3. Manual API Testing (Using Docker Backend)

#### Step 1: Check API Health
```bash
curl -X GET http://localhost:4000/api/health
```

#### Step 2: Create Test Data (using Docker exec)
```bash
# Create test data in the running backend container
docker exec cbt-app-backend-1 node -e "
import { SyncTestDataGenerator } from './src/tests/sync-test-data.js';
import { connectDatabase } from './src/config/database.js';
(async () => {
  await connectDatabase();
  const generator = new SyncTestDataGenerator();
  const data = await generator.createTestData();
  console.log('Test data created:', data.test._id.toString());
  process.exit(0);
})();
"
```

#### Step 3: Test Sync Status
```bash
curl -X GET "http://localhost:4000/api/sync/status/test-center-001?from=2025-08-01&to=2025-08-31"
```

#### Step 4: Test Download Package Creation
```bash
# First, get a test ID from the database
TEST_ID=$(docker exec cbt-app-mongo-1 mongo --quiet cbt_app --eval "
  db.tests.findOne({title: /Sync/}, {_id: 1})._id.str
" | tail -1)

echo "Using test ID: $TEST_ID"

# Create download package
curl -X POST "http://localhost:4000/api/sync/download-users" \
  -H "Content-Type: application/json" \
  -d "{\"testCenterId\": \"test-center-001\", \"testId\": \"$TEST_ID\"}" | jq '.'
```

#### Step 5: Test Results Upload
```bash
# Using the package ID from step 4
PACKAGE_ID="test-center-001_YOUR_TEST_ID_TIMESTAMP"

curl -X POST "http://localhost:4000/api/sync/upload-results" \
  -H "Content-Type: application/json" \
  -d "{
    \"packageId\": \"$PACKAGE_ID\",
    \"testCenterId\": \"test-center-001\",
    \"results\": [
      {
        \"enrollmentId\": \"ENROLLMENT_ID_FROM_DOWNLOAD_RESPONSE\",
        \"userId\": \"USER_ID_FROM_DOWNLOAD_RESPONSE\",
        \"testId\": \"$TEST_ID\",
        \"answers\": {\"1\": \"B\", \"2\": \"B\", \"3\": \"B\"},
        \"startTime\": \"2025-08-25T09:00:00.000Z\",
        \"endTime\": \"2025-08-25T09:30:00.000Z\",
        \"score\": 85.5
      }
    ]
  }" | jq '.'
```

## Test Verification Commands

### Check Database State
```bash
# Check enrollments
docker exec cbt-app-mongo-1 mongo --quiet cbt_app --eval "
  db.testenrollments.find({syncStatus: {$in: ['registered', 'downloaded', 'results_uploaded']}}).count()
"

# Check sync status distribution
docker exec cbt-app-mongo-1 mongo --quiet cbt_app --eval "
  db.testenrollments.aggregate([
    {$group: {_id: '$syncStatus', count: {$sum: 1}}},
    {$sort: {_id: 1}}
  ]).forEach(printjson)
"
```

### View Container Logs
```bash
# Backend logs
docker-compose logs backend --tail=50

# MongoDB logs
docker-compose logs mongo --tail=20
```

## Expected Test Results

### Successful Download Package Response
```json
{
  "success": true,
  "message": "Package created for test \"Mathematics Test\" with 3 student registrations",
  "packageId": "test-center-001_TEST_ID_TIMESTAMP",
  "data": {
    "packageId": "test-center-001_TEST_ID_TIMESTAMP",
    "testCenterId": "test-center-001",
    "testId": "TEST_ID",
    "testTitle": "Mathematics Test for Sync Testing",
    "enrollments": [...],
    "users": [...],
    "test": {...},
    "metadata": {
      "totalEnrollments": 3,
      "totalUsers": 3,
      "totalQuestions": 5,
      "downloadFormat": "json",
      "offlineDbSetup": {
        "singleTest": true,
        "testId": "TEST_ID",
        "testTitle": "Mathematics Test for Sync Testing"
      }
    }
  }
}
```

### Successful Results Upload Response
```json
{
  "success": true,
  "message": "Processed 3 results successfully",
  "packageId": "test-center-001_TEST_ID_TIMESTAMP",
  "summary": {
    "total": 3,
    "success": 3,
    "failures": 0
  },
  "details": [...]
}
```

## Troubleshooting

### Common Issues

1. **"No registrations found"**
   - Ensure test data is created first
   - Check that syncStatus is 'registered'
   - Verify testCenterId and testId are correct

2. **"Test with ID not found"**
   - Create test data using the data generator
   - Check MongoDB for available tests

3. **Connection errors**
   - Ensure Docker containers are running: `docker-compose ps`
   - Check container health: `docker-compose logs backend`

### Reset Test Environment
```bash
# Stop and restart containers
docker-compose down
docker-compose up -d

# Clear test data
docker exec cbt-app-backend-1 node -e "
import { SyncTestDataGenerator } from './src/tests/sync-test-data.js';
import { connectDatabase } from './src/config/database.js';
(async () => {
  await connectDatabase();
  const generator = new SyncTestDataGenerator();
  await generator.clearExistingTestData();
  console.log('Test data cleared');
  process.exit(0);
})();
"
```

## Docker-Specific Testing Benefits

1. **Isolated Environment**: Tests run in isolated containers
2. **Consistent Database State**: Fresh test database for each test run
3. **Real Network Conditions**: Tests actual HTTP calls through Docker network
4. **Production-Like Setup**: Same environment as production deployment
5. **Automated Cleanup**: Containers destroyed after tests complete

## Integration Test Coverage

✅ Download package creation for single test
✅ Package export in multiple formats (JSON, MongoDB)
✅ Results upload and processing
✅ Sync status tracking and reporting
✅ Error handling and validation
✅ Complete offline workflow simulation
✅ Database state verification
✅ Partial failure handling
