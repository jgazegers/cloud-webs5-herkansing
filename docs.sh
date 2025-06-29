#!/bin/bash

# Photo Competition Platform - Documentation Access Script
# This script provides quick access to all Swagger documentation endpoints

echo "📚 Photo Competition Platform - API Documentation"
echo "=================================================="
echo ""

# Check if services are running
echo "🔍 Checking service availability..."
echo ""

services=(
  "3000:API Gateway"
  "3001:Competition Service" 
  "3002:User Service"
  "3003:Submission Service"
  "3004:Image Comparison Service"
  "3005:Winner Service"
)

for service in "${services[@]}"; do
  port="${service%%:*}"
  name="${service##*:}"
  
  if curl -s -f "http://localhost:$port/health" > /dev/null 2>&1; then
    echo "✅ $name (port $port) - Running"
  else
    echo "❌ $name (port $port) - Not available"
  fi
done

echo ""
echo "📖 Swagger Documentation URLs:"
echo "=============================="
echo ""
echo "🌐 API Gateway (Main Entry Point):"
echo "   📚 http://localhost:3000/api-docs"
echo "   📊 http://localhost:3000/health"
echo "   📈 http://localhost:3000/stats"
echo ""
echo "👥 User Service:"
echo "   📚 http://localhost:3002/api-docs"
echo "   📊 http://localhost:3002/health"
echo ""
echo "🏆 Competition Service:"
echo "   📚 http://localhost:3001/api-docs"
echo "   📊 http://localhost:3001/health"
echo ""
echo "📸 Submission Service:"
echo "   📚 http://localhost:3003/api-docs"
echo "   📊 http://localhost:3003/health"
echo ""
echo "🔍 Image Comparison Service (Internal):"
echo "   📚 http://localhost:3004/api-docs"
echo "   📊 http://localhost:3004/health"
echo ""
echo "🏅 Winner Service (Internal):"
echo "   📚 http://localhost:3005/api-docs"
echo "   📊 http://localhost:3005/health"
echo "   📈 http://localhost:3005/stats"
echo ""

echo "💡 Quick Start:"
echo "==============="
echo "1. Start all services: docker-compose up"
echo "2. Access main API docs: http://localhost:3000/api-docs"
echo "3. Register a user via API Gateway"
echo "4. Login to get JWT token"
echo "5. Use token to access protected endpoints"
echo ""

echo "🔑 Authentication Flow:"
echo "======================"
echo "POST /api/users/register → Register"
echo "POST /api/users/login → Get JWT token"
echo "Use 'Authorization: Bearer <token>' header"
echo ""

# Ask if user wants to open the main documentation
read -p "🚀 Open main API documentation in browser? (y/n): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if command -v xdg-open > /dev/null; then
        xdg-open "http://localhost:3000/api-docs"
    elif command -v open > /dev/null; then
        open "http://localhost:3000/api-docs"
    else
        echo "Please open http://localhost:3000/api-docs in your browser"
    fi
fi
