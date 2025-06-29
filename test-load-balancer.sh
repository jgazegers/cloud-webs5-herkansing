#!/bin/bash

# Test script for API Gateway Load Balancer
echo "🚀 Testing API Gateway Load Balancer"
echo "=================================="

API_GATEWAY="http://localhost:3000"

echo ""
echo "1. Testing Health Check..."
curl -s "$API_GATEWAY/health" | jq '.'

echo ""
echo "2. Testing Load Balancer Statistics..."
curl -s "$API_GATEWAY/stats" | jq '.'

echo ""
echo "3. Testing User Service Statistics..."
curl -s "$API_GATEWAY/stats/users" | jq '.'

echo ""
echo "4. Testing Competition Service Statistics..."
curl -s "$API_GATEWAY/stats/competitions" | jq '.'

echo ""
echo "5. Testing Submission Service Statistics..."
curl -s "$API_GATEWAY/stats/submissions" | jq '.'

echo ""
echo "6. Testing Non-existent Service..."
curl -s "$API_GATEWAY/stats/nonexistent" | jq '.'

echo ""
echo "7. Testing Load Balancing (5 requests to user service)..."
for i in {1..5}; do
  echo "Request $i:"
  curl -s "$API_GATEWAY/api/users" -w "Status: %{http_code}\n" | head -1
  sleep 1
done

echo ""
echo "✅ Load balancer tests completed!"
echo ""
echo "📊 View final statistics:"
curl -s "$API_GATEWAY/stats" | jq '.loadBalancer | to_entries[] | {service: .key, available: .value.summary.availableInstances, total: .value.summary.totalInstances}'
