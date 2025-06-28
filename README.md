# Cloud Microservices Platform

A microservices-based platform for image competition management with event-driven architecture using RabbitMQ and MongoDB.

## Architecture

This platform consists of the following microservices:

### Core Services
- **API Gateway** (Port 3000) - Main entry point and request routing
- **User Service** (Port 3001) - User authentication and management  
- **Competition Service** (Port 3002) - Competition CRUD operations
- **Submission Service** (Port 3003) - Image submission handling
- **Image Comparison Service** (Port 3004) - Asynchronous image similarity analysis

### Infrastructure
- **MongoDB** (Port 27017) - Primary database
- **RabbitMQ** (Port 5672, Management UI: 15672) - Message broker for event-driven communication

## Event-Driven Architecture

The services communicate through RabbitMQ using a topic exchange pattern:

### Competition Events
- **Publisher**: Competition Service
- **Exchange**: `competitions`
- **Routing Key**: `competition.created`
- **Subscribers**: Submission Service, Image Comparison Service

### Submission Events  
- **Publisher**: Submission Service
- **Exchange**: `submissions`
- **Routing Key**: `submission.created`
- **Subscribers**: Image Comparison Service

## Getting Started

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for local development)

### Running the Platform

1. Clone the repository
2. Start all services:
   ```bash
   docker-compose up
   ```

3. Access services:
   - API Gateway: http://localhost:3000
   - RabbitMQ Management: http://localhost:15672 (admin/password)
   - Individual service health checks available on their respective ports

### Development

Each service can be run individually for development:

```bash
# Example for competition service
cd competition-service
npm install
npm run dev
```

## API Testing

REST client files are available in the `rest/` directory:
- `api-gateway.http`
- `competition-service.http` 
- `submission-service.http`
- `user-service.http`

## Services Overview

### Image Comparison Service (NEW)
Asynchronous microservice that:
- Listens to competition and submission events
- Stores competition target images for comparison
- Analyzes submission image similarity using Imagga API
- Maintains comparison results and scores
- Provides health monitoring and statistics

See `image-comparison-service/README.md` for detailed documentation.

## Future Enhancements

- [ ] Implement actual Imagga API integration
- [ ] Add image preprocessing and optimization
- [ ] Implement leaderboard service
- [ ] Add real-time notifications
- [ ] Implement caching layer with Redis
- [ ] Add comprehensive monitoring and logging
