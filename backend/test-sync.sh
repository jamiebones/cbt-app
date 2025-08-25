#!/bin/bash

# CBT Sync Service Testing Script
# Tests the complete sync workflow: create package -> download -> upload results

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_BASE="http://localhost:4000/api"
TEST_CENTER_ID="test-center-001"
TEST_DIR="/tmp/cbt-sync-test"

echo -e "${BLUE}🚀 CBT Sync Service Testing Script${NC}"
echo -e "${BLUE}===================================${NC}"
echo ""

# Function to make API calls and check response
api_call() {
    local method=$1
    local endpoint=$2
    local data=$3
    local expected_status=${4:-200}
    
    echo -e "${YELLOW}📡 API Call: ${method} ${endpoint}${NC}"
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "HTTPSTATUS:%{http_code}" -X GET "${API_BASE}${endpoint}" -H "Content-Type: application/json")
    else
        response=$(curl -s -w "HTTPSTATUS:%{http_code}" -X "$method" "${API_BASE}${endpoint}" -H "Content-Type: application/json" -d "$data")
    fi
    
    http_code=$(echo $response | tr -d '\n' | sed -e 's/.*HTTPSTATUS://')
    body=$(echo $response | sed -e 's/HTTPSTATUS:.*//')
    
    echo "Response Code: $http_code"
    echo "Response Body: $body" | jq '.' 2>/dev/null || echo "$body"
    echo ""
    
    if [ "$http_code" -ne "$expected_status" ]; then
        echo -e "${RED}❌ Expected status $expected_status but got $http_code${NC}"
        exit 1
    fi
    
    echo "$body"
}

# Function to get test data info
get_test_info() {
    echo -e "${BLUE}📊 Getting test data information...${NC}"
    
    # Get users with sync test email pattern
    users_response=$(api_call "GET" "/users?email=@synctest.com")
    
    # Get tests with sync in title  
    tests_response=$(api_call "GET" "/tests?search=sync")
    
    echo -e "${GREEN}✅ Test data retrieved${NC}"
    echo ""
}

# Function to create test data
create_test_data() {
    echo -e "${BLUE}🎭 Creating test data...${NC}"
    
    cd /home/jamiebones/Coding_Directory/Tutorials/cbt-app/backend
    node src/tests/sync-test-data.js create
    
    echo -e "${GREEN}✅ Test data created${NC}"
    echo ""
}

# Function to test sync status endpoint
test_sync_status() {
    echo -e "${BLUE}📊 Testing sync status endpoint...${NC}"
    
    from_date="2025-08-01"
    to_date="2025-08-31"
    
    status_response=$(api_call "GET" "/sync/status/${TEST_CENTER_ID}?from=${from_date}&to=${to_date}")
    
    echo -e "${GREEN}✅ Sync status endpoint working${NC}"
    echo ""
    
    echo "$status_response"
}

# Function to get test ID from database
get_test_id() {
    echo -e "${BLUE}🔍 Finding test ID for sync testing...${NC}"
    
    cd /home/jamiebones/Coding_Directory/Tutorials/cbt-app/backend
    
    # Use MongoDB to get the test ID
    test_id=$(docker exec cbt-app-mongo-1 mongo --quiet cbt_app --eval "
        db.tests.findOne({title: /Sync/}, {_id: 1})._id.str
    " | tail -1)
    
    if [ -z "$test_id" ]; then
        echo -e "${RED}❌ No test found with 'Sync' in title${NC}"
        echo "Available tests:"
        docker exec cbt-app-mongo-1 mongo --quiet cbt_app --eval "
            db.tests.find({}, {title: 1}).forEach(function(doc) { print(doc.title); })
        "
        exit 1
    fi
    
    echo -e "${GREEN}✅ Found test ID: $test_id${NC}"
    echo ""
    echo "$test_id"
}

# Function to test download package creation
test_download_package() {
    local test_id=$1
    
    echo -e "${BLUE}📦 Testing download package creation...${NC}"
    
    # Create download package
    download_data="{\"testCenterId\": \"${TEST_CENTER_ID}\", \"testId\": \"${test_id}\"}"
    
    package_response=$(api_call "POST" "/sync/download-users" "$download_data")
    
    # Extract package ID
    package_id=$(echo "$package_response" | jq -r '.packageId // empty')
    
    if [ -z "$package_id" ] || [ "$package_id" = "null" ]; then
        echo -e "${RED}❌ Failed to create download package${NC}"
        echo "Response: $package_response"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Download package created: $package_id${NC}"
    echo ""
    
    # Save package data for testing
    mkdir -p "$TEST_DIR"
    echo "$package_response" > "$TEST_DIR/package_response.json"
    echo "$package_id" > "$TEST_DIR/package_id.txt"
    
    echo "$package_id"
}

# Function to test package export
test_package_export() {
    local package_response_file="$TEST_DIR/package_response.json"
    
    echo -e "${BLUE}📤 Testing package export functionality...${NC}"
    
    if [ ! -f "$package_response_file" ]; then
        echo -e "${RED}❌ Package response file not found${NC}"
        exit 1
    fi
    
    # Extract package data
    package_data=$(cat "$package_response_file" | jq '.data')
    
    # Test JSON export
    json_export_data="{\"packageData\": $package_data, \"format\": \"json\"}"
    json_export_response=$(api_call "POST" "/sync/export-package" "$json_export_data")
    
    echo -e "${GREEN}✅ JSON export working${NC}"
    
    # Test MongoDB export
    mongo_export_data="{\"packageData\": $package_data, \"format\": \"mongoexport\"}"
    mongo_export_response=$(api_call "POST" "/sync/export-package" "$mongo_export_data")
    
    echo -e "${GREEN}✅ MongoDB export working${NC}"
    
    # Save export responses
    echo "$json_export_response" > "$TEST_DIR/json_export.json"
    echo "$mongo_export_response" > "$TEST_DIR/mongo_export.json"
    
    echo ""
}

# Function to test results upload
test_results_upload() {
    local package_id=$1
    local package_response_file="$TEST_DIR/package_response.json"
    
    echo -e "${BLUE}📤 Testing results upload...${NC}"
    
    if [ ! -f "$package_response_file" ]; then
        echo -e "${RED}❌ Package response file not found${NC}"
        exit 1
    fi
    
    # Extract enrollment data for creating mock results
    enrollments=$(cat "$package_response_file" | jq '.data.enrollments')
    
    # Create mock test results
    results_data=$(echo "$enrollments" | jq --arg pkg_id "$package_id" --arg center_id "$TEST_CENTER_ID" '
    {
        "packageId": $pkg_id,
        "testCenterId": $center_id,
        "results": [
            .[] | {
                "enrollmentId": .id,
                "userId": .userId,
                "testId": .testId,
                "answers": {"1": "B", "2": "B", "3": "B", "4": "B", "5": "B"},
                "startTime": "2025-08-25T09:00:00.000Z",
                "endTime": "2025-08-25T10:00:00.000Z",
                "score": 85.5
            }
        ]
    }')
    
    echo "Uploading results for package: $package_id"
    
    results_response=$(api_call "POST" "/sync/upload-results" "$results_data")
    
    echo -e "${GREEN}✅ Results upload working${NC}"
    echo ""
    
    # Save results response
    echo "$results_response" > "$TEST_DIR/results_upload.json"
    
    echo "$results_response"
}

# Function to verify sync status after operations
verify_sync_status() {
    echo -e "${BLUE}🔍 Verifying sync status after operations...${NC}"
    
    from_date="2025-08-01"
    to_date="2025-08-31"
    
    final_status_response=$(api_call "GET" "/sync/status/${TEST_CENTER_ID}?from=${from_date}&to=${to_date}")
    
    echo -e "${GREEN}✅ Final sync status retrieved${NC}"
    echo ""
    
    # Save final status
    echo "$final_status_response" > "$TEST_DIR/final_status.json"
    
    echo "$final_status_response"
}

# Function to show test summary
show_test_summary() {
    echo -e "${BLUE}📋 Test Summary${NC}"
    echo -e "${BLUE}===============${NC}"
    echo ""
    
    if [ -d "$TEST_DIR" ]; then
        echo -e "${GREEN}Test files created in: $TEST_DIR${NC}"
        echo "Files:"
        ls -la "$TEST_DIR"
        echo ""
        
        echo -e "${YELLOW}Package ID:${NC}"
        cat "$TEST_DIR/package_id.txt" 2>/dev/null || echo "Not found"
        echo ""
        
        echo -e "${YELLOW}Download Package Summary:${NC}"
        cat "$TEST_DIR/package_response.json" | jq '.data.metadata // empty' 2>/dev/null || echo "Not found"
        echo ""
        
        echo -e "${YELLOW}Results Upload Summary:${NC}"
        cat "$TEST_DIR/results_upload.json" | jq '.summary // empty' 2>/dev/null || echo "Not found"
        echo ""
    fi
    
    echo -e "${GREEN}🎉 All sync tests completed successfully!${NC}"
}

# Function to clean up test data
cleanup_test_data() {
    echo -e "${BLUE}🧹 Cleaning up test data...${NC}"
    
    cd /home/jamiebones/Coding_Directory/Tutorials/cbt-app/backend
    node src/tests/sync-test-data.js clear
    
    # Remove test directory
    rm -rf "$TEST_DIR"
    
    echo -e "${GREEN}✅ Cleanup completed${NC}"
}

# Main test execution
main() {
    echo -e "${BLUE}Starting CBT Sync Service Tests...${NC}"
    echo ""
    
    # Check if API is accessible
    echo -e "${BLUE}🏥 Checking API health...${NC}"
    health_response=$(api_call "GET" "/health")
    echo -e "${GREEN}✅ API is healthy${NC}"
    echo ""
    
    # Create test data
    create_test_data
    
    # Get test ID
    test_id=$(get_test_id)
    
    # Test sync status (initial)
    test_sync_status
    
    # Test download package creation
    package_id=$(test_download_package "$test_id")
    
    # Test package export
    test_package_export
    
    # Test results upload
    test_results_upload "$package_id"
    
    # Verify final sync status
    verify_sync_status
    
    # Show test summary
    show_test_summary
    
    # Ask if user wants to cleanup
    echo -e "${YELLOW}Do you want to clean up test data? (y/n):${NC}"
    read -r cleanup_choice
    if [ "$cleanup_choice" = "y" ] || [ "$cleanup_choice" = "Y" ]; then
        cleanup_test_data
    else
        echo -e "${BLUE}Test data preserved for manual inspection${NC}"
    fi
}

# Handle script arguments
case "${1:-}" in
    "cleanup")
        cleanup_test_data
        ;;
    "create-data")
        create_test_data
        ;;
    "test-status")
        test_sync_status
        ;;
    *)
        main
        ;;
esac
