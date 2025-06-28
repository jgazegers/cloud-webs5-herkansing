# Image Comparison Service

An asynchronous microservice that listens to competition and submission events to perform image similarity analysis using the Imagga API.

## Overview

This service:
- Listens to `competition.created` events to store competition IDs and target images
- Listens to `submission.created` events to store submission IDs and images for comparison
- Uses the Imagga API for image similarity analysis (configurable)
- Stores only essential data: IDs and image data required for comparison
- Maintains comparison results and scores in MongoDB

## Features

- **Event-Driven Architecture**: Responds to RabbitMQ events from other services
- **Imagga Integration**: Ready for Imagga API integration (currently in mock mode)
- **Persistent Storage**: Stores competitions, submissions, and comparison results
- **Health Monitoring**: Provides health check and statistics endpoints
- **Graceful Shutdown**: Handles SIGINT/SIGTERM for clean shutdown

## Environment Variables

```bash
# Database Configuration
MONGO_URI=mongodb://mongo:27017/image_comparison_db

# Message Queue Configuration
RABBITMQ_URL=amqp://admin:password@rabbitmq:5672

# Imagga API Configuration (optional)
IMAGGA_API_KEY=your_api_key_here
IMAGGA_API_SECRET=your_api_secret_here

# Server Configuration
PORT=3004
```

## API Endpoints

- `GET /health` - Service health check
- `GET /stats` - View service statistics (competitions, submissions, comparisons)

## Event Handling

### Competition Created Events
- Stores competition ID and target image only (minimal data footprint)
- Prepares for future image comparisons

### Submission Created Events
- Stores submission ID, competition ID, and submission image only
- Creates a comparison task record
- Will trigger Imagga API comparison (when implemented)

## Development Status

✅ **Completed:**
- Event subscription and handling
- Database models and storage
- Basic service infrastructure
- Health monitoring endpoints

🚧 **TODO:**
- Implement actual Imagga API integration
- Add image preprocessing and optimization
- Implement comparison scoring logic
- Add result publishing to other services

## Running the Service

The service is designed to run as part of the Docker Compose stack:

```bash
docker-compose up image-comparison-service
```

Or for development:

```bash
cd image-comparison-service
npm run dev
```
