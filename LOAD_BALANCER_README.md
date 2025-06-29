# API Gateway Load Balancer

## Overview
The API Gateway now includes a sophisticated load balancer with round-robin distribution and circuit breaker functionality. This provides high availability, fault tolerance, and automatic failover capabilities.

## Architecture Components

### 1. Circuit Breaker
**Purpose**: Prevents cascading failures by stopping requests to unhealthy service instances.

**States**:
- `CLOSED`: Normal operation, all requests pass through
- `OPEN`: Circuit is open, requests fail fast (service is unhealthy)
- `HALF_OPEN`: Testing if service has recovered

**Configuration**:
```typescript
{
  failureThreshold: 3,     // Open after 3 failures
  successThreshold: 2,     // Close after 2 successes  
  timeout: 5000,          // 5 second timeout
  resetTimeoutMs: 10000,  // Wait 10 seconds before retry
}
```

### 2. Load Balancer
**Purpose**: Distributes requests across multiple service instances using round-robin algorithm.

**Features**:
- Round-robin distribution
- Health-aware routing (skips unhealthy instances)
- Success/failure tracking per instance
- Circuit breaker integration

### 3. Service Registry
**Purpose**: Manages multiple services and their instances with centralized configuration.

**Current Services** (Public-facing via API Gateway):
- **User Service**: 2 instances (user-service-1:3001, user-service-2:3001)
- **Competition Service**: 2 instances (competition-service-1:3002, competition-service-2:3002)
- **Submission Service**: 2 instances (submission-service-1:3003, submission-service-2:3003)

**Internal Services** (Not exposed via API Gateway):
- **Image Comparison Service**: 2 instances (image-comparison-service-1:3004, image-comparison-service-2:3004)
- **Winner Service**: 2 instances (winner-service-1:3005, winner-service-2:3005)

> **Note**: Image comparison and winner services are internal microservices that communicate via RabbitMQ message queues. They are not exposed through the API Gateway as they are designed for internal processing, not external API access. Their health endpoints are available directly for internal monitoring if needed.

## API Endpoints

### Health Check
```http
GET /health
```
Returns overall system health and individual service status.

**Response Example**:
```json
{
  "status": "healthy",
  "timestamp": "2025-06-29T10:00:00.000Z",
  "services": {
    "total": 3,
    "healthy": 3,
    "degraded": 0
  },
  "details": {
    "users": {
      "user-service-1": {
        "url": "http://user-service:3001",
        "circuitBreaker": {
          "state": "CLOSED",
          "failureCount": 0,
          "successCount": 0
        },
        "available": true
      }
    }
  }
}
```

### Statistics
```http
GET /stats
```
Returns detailed load balancer statistics for all services.

```http
GET /stats/{serviceName}
```
Returns statistics for a specific service.

## Circuit Breaker Behavior

### Failure Detection
- HTTP 5xx responses count as failures
- Network timeouts count as failures
- Connection errors count as failures

### Recovery Process
1. After `failureThreshold` failures → Circuit opens
2. Wait `resetTimeoutMs` before trying again
3. Circuit goes to `HALF_OPEN` state
4. After `successThreshold` successes → Circuit closes

### Fail-Fast Response
When circuit is open:
```json
{
  "error": "Service temporarily unavailable",
  "service": "competitions",
  "instance": "competition-service-1"
}
```

## Load Balancing Algorithm

### Round-Robin Distribution
1. Maintain list of healthy instances
2. Select next instance in sequence
3. Wrap around to beginning when reaching end
4. Skip instances with open circuits

### Example Flow
```
Request 1 → user-service-1
Request 2 → user-service-2  
Request 3 → user-service-1 (wraparound)
Request 4 → user-service-2
```

## Configuration

### Adding Service Instances
To add more instances for load balancing, modify `serviceRegistry.ts`:

```typescript
// In setupUserService()
userLB.addInstance({
  id: 'user-service-2',
  url: 'http://user-service-2:3001'
});

userLB.addInstance({
  id: 'user-service-3',  
  url: 'http://user-service-3:3001'
});
```

### Circuit Breaker Tuning
Adjust parameters in `ServiceRegistry` constructor:

```typescript
const defaultCircuitBreakerConfig: CircuitBreakerConfig = {
  failureThreshold: 5,        // More tolerant
  successThreshold: 3,        // Require more successes
  timeout: 10000,            // Longer timeout
  resetTimeoutMs: 30000,     // Wait longer before retry
};
```

## Monitoring

### Health Monitoring
- Monitor `/health` endpoint for system status
- Set up alerts when `status !== "healthy"`
- Track `services.degraded` count

### Performance Monitoring
- Monitor `/stats` for load distribution
- Track circuit breaker state changes
- Monitor failure rates per instance

### Logging
The load balancer logs:
- Instance selection: `"Routing GET /api/users to user-service-1"`
- Failures: `"Request failed for user-service-1: Connection timeout"`
- Circuit state changes: `"Circuit state: OPEN"`

## Error Handling

### No Healthy Instances
When all instances are unhealthy:
```json
{
  "error": "Service temporarily unavailable",
  "service": "users",
  "instance": "unknown"
}
```

### Service Discovery Failure
When service doesn't exist:
```json
{
  "error": "Service nonexistent not found"
}
```

## Integration

### Existing Features Preserved
- JWT token exchange for competition/submission services
- Large payload handling (20MB limit)
- Proper content-type handling
- Authentication middleware

### Backward Compatibility
- All existing API routes work unchanged
- Same response formats
- Same authentication requirements

## Testing

Use the provided REST client file:
```
/rest/api-gateway-loadbalancer.http
```

Test scenarios:
1. Normal load balancing behavior
2. Health check responses
3. Circuit breaker activation (simulate service failure)
4. Service recovery
5. Statistics monitoring

## Future Enhancements

### Potential Improvements
- **Weighted Round-Robin**: Assign different weights to instances
- **Health Checks**: Active health checking with HTTP ping
- **Service Discovery**: Dynamic service registration/deregistration
- **Metrics**: Prometheus/Grafana integration
- **Load Balancing Algorithms**: Least connections, random, etc.
- **Rate Limiting**: Per-service or per-instance rate limits

## Docker Multi-Instance Setup

The load balancer is pre-configured to work with multiple service instances. The Docker Compose setup includes 2 instances of each service:

**Service Instances**:
- **user-service-1** (internal port 3001, external 3001)
- **user-service-2** (internal port 3001, external 3011)
- **competition-service-1** (internal port 3002, external 3002)
- **competition-service-2** (internal port 3002, external 3012)
- **submission-service-1** (internal port 3003, external 3003)
- **submission-service-2** (internal port 3003, external 3013)
- **image-comparison-service-1** (internal port 3004, external 3004)
- **image-comparison-service-2** (internal port 3004, external 3014)
- **winner-service-1** (internal port 3005, external 3005)
- **winner-service-2** (internal port 3005, external 3015)

**Commands**:
```bash
# Start all services with multiple instances
docker-compose up -d

# View logs for specific service instances
docker-compose logs -f user-service-1 user-service-2

# View all API gateway logs
docker-compose logs -f api-gateway

# Test the load balancer
./test-multi-instance.sh
```
