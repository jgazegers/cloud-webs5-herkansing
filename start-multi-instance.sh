#!/bin/bash

# Script to start the multi-instance microservices setup for load balancer testing

echo "🚀 Starting multi-instance microservices setup..."

# Stop any existing containers
echo "Stopping existing containers..."
docker-compose down

# Build and start all services with multiple instances
echo "Building and starting all services..."
docker-compose up --build -d

# Wait for services to be ready
echo "Waiting for services to start..."
sleep 10

# Check status of all containers
echo "📊 Container status:"
docker-compose ps

echo ""
echo "🎯 Service endpoints:"
echo "API Gateway: http://localhost:3000"
echo ""
echo "Service instances (direct access for testing):"
echo "User Service 1:         http://localhost:3001"
echo "User Service 2:         http://localhost:3011"
echo "Competition Service 1:  http://localhost:3002"
echo "Competition Service 2:  http://localhost:3012"
echo "Submission Service 1:   http://localhost:3003"
echo "Submission Service 2:   http://localhost:3013"
echo "Image Comparison 1:     http://localhost:3004"
echo "Image Comparison 2:     http://localhost:3014"
echo "Winner Service 1:       http://localhost:3005"
echo "Winner Service 2:       http://localhost:3015"
echo ""
echo "📈 Load balancer endpoints:"
echo "Health Check: http://localhost:3000/health"
echo "All Stats:    http://localhost:3000/stats"
echo "User Stats:   http://localhost:3000/stats/users"
echo "Competition:  http://localhost:3000/stats/competitions"
echo "Submission:   http://localhost:3000/stats/submissions"
echo "Image Comp:   http://localhost:3000/stats/image-comparison"
echo "Winners:      http://localhost:3000/stats/winners"
echo ""
echo "✅ Multi-instance setup complete!"
echo ""
echo "💡 To test load balancing, use the test scripts:"
echo "   ./test-load-balancer.sh"
echo "   or open rest/api-gateway-loadbalancer.http in VS Code"
