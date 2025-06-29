#!/bin/bash

# Test script for multi-instance load balancer setup
# This script tests the load balancer across multiple service instances

echo "=== Multi-Instance Load Balancer Test ==="
echo "Testing load distribution across service instances..."
echo

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# API Gateway URL
GATEWAY_URL="http://localhost:3000"

# Test configuration
NUM_REQUESTS=10

# Function to make HTTP request and extract response headers
make_request() {
    local url="$1"
    local method="${2:-GET}"
    local data="$3"
    
    if [ -n "$data" ]; then
        curl -s -X "$method" \
             -H "Content-Type: application/json" \
             -d "$data" \
             -w "HTTPSTATUS:%{http_code}\n" \
             "$url"
    else
        curl -s -X "$method" \
             -w "HTTPSTATUS:%{http_code}\n" \
             "$url"
    fi
}

# Function to test service load distribution
test_load_distribution() {
    local service_name="$1"
    local endpoint="$2"
    local description="$3"
    
    echo -e "${BLUE}Testing $description ($service_name)${NC}"
    echo "Endpoint: $endpoint"
    echo "Making $NUM_REQUESTS requests..."
    
    local success_count=0
    local error_count=0
    
    for i in $(seq 1 $NUM_REQUESTS); do
        response=$(make_request "$GATEWAY_URL$endpoint")
        http_code=$(echo "$response" | grep "HTTPSTATUS:" | cut -d: -f2)
        
        if [[ "$http_code" =~ ^2[0-9][0-9]$ ]]; then
            echo -e "  Request $i: ${GREEN}Success (HTTP $http_code)${NC}"
            ((success_count++))
        else
            echo -e "  Request $i: ${RED}Error (HTTP $http_code)${NC}"
            ((error_count++))
        fi
        
        sleep 0.5  # Small delay between requests
    done
    
    echo -e "Results: ${GREEN}$success_count successes${NC}, ${RED}$error_count errors${NC}"
    echo
}

# Function to check health status
check_health() {
    echo -e "${YELLOW}=== Health Check ===${NC}"
    response=$(make_request "$GATEWAY_URL/health")
    http_code=$(echo "$response" | grep "HTTPSTATUS:" | cut -d: -f2)
    body=$(echo "$response" | sed '/HTTPSTATUS:/d')
    
    echo "HTTP Status: $http_code"
    echo "Response:"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
    echo
}

# Function to check load balancer statistics
check_stats() {
    echo -e "${YELLOW}=== Load Balancer Statistics ===${NC}"
    response=$(make_request "$GATEWAY_URL/stats")
    http_code=$(echo "$response" | grep "HTTPSTATUS:" | cut -d: -f2)
    body=$(echo "$response" | sed '/HTTPSTATUS:/d')
    
    echo "HTTP Status: $http_code"
    echo "Response:"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
    echo
}

# Function to check individual service stats
check_service_stats() {
    local service_name="$1"
    
    echo -e "${YELLOW}=== $service_name Service Statistics ===${NC}"
    response=$(make_request "$GATEWAY_URL/stats/$service_name")
    http_code=$(echo "$response" | grep "HTTPSTATUS:" | cut -d: -f2)
    body=$(echo "$response" | sed '/HTTPSTATUS:/d')
    
    echo "HTTP Status: $http_code"
    echo "Response:"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
    echo
}

# Function to test circuit breaker (simulate service failure)
test_circuit_breaker() {
    echo -e "${YELLOW}=== Circuit Breaker Test ===${NC}"
    echo "Testing with non-existent endpoint to trigger failures..."
    
    # Make multiple requests to a non-existent endpoint to trigger circuit breaker
    for i in $(seq 1 5); do
        response=$(make_request "$GATEWAY_URL/api/users/nonexistent")
        http_code=$(echo "$response" | grep "HTTPSTATUS:" | cut -d: -f2)
        echo "Request $i: HTTP $http_code"
        sleep 1
    done
    echo
}

# Main test execution
echo "Starting multi-instance load balancer tests..."
echo "Make sure Docker Compose is running with: docker-compose up -d"
echo

# Wait a moment for services to be ready
echo "Waiting 5 seconds for services to initialize..."
sleep 5

# Test health endpoint first
check_health

# Test load distribution across different services
test_load_distribution "users" "/api/users" "User Service Load Distribution"
test_load_distribution "competitions" "/api/competitions" "Competition Service Load Distribution" 
test_load_distribution "submissions" "/api/submissions" "Submission Service Load Distribution"

# Note: Image comparison and winner services are internal and not exposed via API Gateway

# Check statistics after load testing
echo -e "${YELLOW}=== Post-Load Test Statistics ===${NC}"
check_stats

# Check individual service statistics
check_service_stats "users"
check_service_stats "competitions" 
check_service_stats "submissions"

echo -e "${BLUE}Note: Image comparison and winner services are internal services${NC}"
echo -e "${BLUE}and are not exposed through the API Gateway${NC}"

# Test circuit breaker functionality
test_circuit_breaker

# Final health check
echo -e "${YELLOW}=== Final Health Check ===${NC}"
check_health

echo -e "${GREEN}=== Multi-Instance Load Balancer Test Complete ===${NC}"
echo
echo "Key points to verify:"
echo "1. Requests should be distributed across multiple instances"
echo "2. Health check should show multiple instances per service"
echo "3. Statistics should show request counts across instances"
echo "4. Circuit breaker should activate after repeated failures"
echo
echo "To view real-time Docker logs:"
echo "  docker-compose logs -f api-gateway"
echo "  docker-compose logs -f user-service-1 user-service-2"
echo
echo "To scale services further:"
echo "  docker-compose up -d --scale user-service-1=3"
