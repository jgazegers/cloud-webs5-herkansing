# Photo Competition Platform - API Documentation

This document provides information about the Swagger/OpenAPI documentation available for each service in the Photo Competition Platform.

## API Documentation Overview

The Photo Competition Platform consists of multiple microservices, each with its own Swagger documentation. Below you'll find the endpoints for accessing the API documentation for each service.

## Service Documentation Endpoints

### 🌐 API Gateway
- **URL**: http://localhost:3000/api-docs
- **Port**: 3000
- **Description**: Unified API documentation for all external-facing endpoints
- **Provides access to**:
  - User registration and authentication (`/api/users/*`)
  - Competition management (`/api/competitions/*`)
  - Submission management (`/api/submissions/*`)
  - Health checks and load balancer statistics

### 👥 User Service
- **URL**: http://localhost:3002/api-docs
- **Port**: 3002 (default)
- **Description**: User management and authentication API
- **Key endpoints**:
  - `POST /register` - Register a new user
  - `POST /login` - User authentication
  - `GET /health` - Service health check

### 🏆 Competition Service
- **URL**: http://localhost:3001/api-docs
- **Port**: 3001
- **Description**: Competition management API
- **Key endpoints**:
  - `POST /` - Create a new competition
  - `GET /` - Get all competitions
  - `GET /{competitionId}` - Get competition by ID
  - `GET /user/{username}` - Get competitions by user
  - `PATCH /{competitionId}/stop` - Stop a competition
  - `DELETE /{competitionId}` - Delete a competition

### 📸 Submission Service
- **URL**: http://localhost:3003/api-docs
- **Port**: 3003
- **Description**: Submission management API
- **Key endpoints**:
  - `POST /` - Create a new submission
  - `GET /competition/{competitionId}` - Get submissions for a competition
  - `GET /user/my-submissions` - Get current user's submissions
  - `GET /{submissionId}` - Get submission by ID
  - `DELETE /{submissionId}` - Delete a submission

### 🔍 Image Comparison Service (Internal)
- **URL**: http://localhost:3004/api-docs
- **Port**: 3004
- **Description**: Internal image analysis and comparison API
- **Note**: This is an internal service that communicates via RabbitMQ
- **Key endpoints**:
  - `GET /health` - Service health check
  - Internal message queue consumers for image analysis

### 🏅 Winner Service (Internal)
- **URL**: http://localhost:3005/api-docs
- **Port**: 3005
- **Description**: Internal winner selection and statistics API
- **Note**: This is an internal service that communicates via RabbitMQ
- **Key endpoints**:
  - `GET /health` - Service health check
  - `GET /stats` - Winner selection statistics
  - `POST /trigger-winner-selection` - Manual trigger for winner selection
  - `POST /trigger-winner-selection/{competitionId}` - Trigger for specific competition

## Authentication

Most endpoints require JWT authentication. To use the API:

1. **Register** a user via the User Service or API Gateway
2. **Login** to obtain a JWT token
3. Include the token in the `Authorization` header: `Bearer <your-jwt-token>`

### Token Types

- **External Tokens**: Used for client applications via the API Gateway
- **Internal Tokens**: Used for inter-service communication (automatically handled by the API Gateway)

## Quick Start

1. **Start all services** using Docker Compose:
   ```bash
   docker-compose up
   ```

2. **Access the main API documentation** via the API Gateway:
   ```
   http://localhost:3000/api-docs
   ```

3. **Register a user**:
   ```bash
   curl -X POST http://localhost:3000/api/users/register \
     -H "Content-Type: application/json" \
     -d '{"username": "testuser", "password": "password123"}'
   ```

4. **Login to get a token**:
   ```bash
   curl -X POST http://localhost:3000/api/users/login \
     -H "Content-Type: application/json" \
     -d '{"username": "testuser", "password": "password123"}'
   ```

5. **Use the token** to access protected endpoints:
   ```bash
   curl -X GET http://localhost:3000/api/competitions \
     -H "Authorization: Bearer <your-jwt-token>"
   ```

## Health Checks

Each service provides a health check endpoint:

- API Gateway: http://localhost:3000/health
- User Service: http://localhost:3002/health
- Competition Service: http://localhost:3001/health
- Submission Service: http://localhost:3003/health
- Image Comparison Service: http://localhost:3004/health
- Winner Service: http://localhost:3005/health

## Load Balancer Statistics

The API Gateway provides load balancer statistics:

- All services: http://localhost:3000/stats
- Specific service: http://localhost:3000/stats/{serviceName}

## Architecture

The platform uses a microservices architecture with:

- **API Gateway**: Entry point for external clients with load balancing and circuit breakers
- **Message Queue**: RabbitMQ for asynchronous communication between services
- **Database**: MongoDB for data persistence
- **Image Analysis**: Imagga API integration for image similarity detection

## Development

When developing or testing:

1. **Use the API Gateway** (port 3000) for external API access
2. **Access individual services** directly for debugging
3. **Check service logs** for detailed error information
4. **Use Swagger UI** for interactive API testing

## Support

For issues or questions:

1. Check the service health endpoints
2. Review the Swagger documentation for API details
3. Check service logs for error messages
4. Ensure all required environment variables are set
