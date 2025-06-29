# Multi-Instance Load Balancer Deployment Guide

## Quick Start

1. **Start the multi-instance setup**:
   ```bash
   docker-compose up -d
   ```

2. **Wait for services to initialize** (about 30 seconds):
   ```bash
   docker-compose logs -f api-gateway
   ```

3. **Test the load balancer**:
   ```bash
   ./test-multi-instance.sh
   ```

4. **Check health status**:
   ```bash
   curl http://localhost:3000/health
   ```

## Service Instances

The system now runs multiple instances of each service:

| Service | Instance 1 | Instance 2 | API Gateway Route |
|---------|------------|------------|-------------------|
| User Service | user-service-1:3001 | user-service-2:3001 | `/api/users` |
| Competition Service | competition-service-1:3002 | competition-service-2:3002 | `/api/competitions` |
| Submission Service | submission-service-1:3003 | submission-service-2:3003 | `/api/submissions` |
| Image Comparison Service | image-comparison-service-1:3004 | image-comparison-service-2:3004 | *Internal only* |
| Winner Service | winner-service-1:3005 | winner-service-2:3005 | *Internal only* |

> **Note**: Image comparison and winner services are internal microservices that communicate via RabbitMQ. They are not exposed through the API Gateway for security and architectural reasons.

## Load Balancer Features

✅ **Round-robin distribution** across instances  
✅ **Circuit breaker** for fault tolerance  
✅ **Health monitoring** and automatic failover  
✅ **Statistics and monitoring** endpoints  
✅ **JWT token exchange** preserved  
✅ **Backward compatibility** with existing APIs  

## API Endpoints

- **API Gateway**: http://localhost:3000
- **Health Check**: http://localhost:3000/health
- **Load Balancer Stats**: http://localhost:3000/stats
- **Service-specific Stats**: http://localhost:3000/stats/{serviceName}

## Testing

### 1. Basic Load Balancer Test
```bash
./test-load-balancer.sh
```

### 2. Multi-Instance Test
```bash
./test-multi-instance.sh
```

### 3. Manual Testing
Use the REST client files in `/rest/` directory:
- `api-gateway-loadbalancer.http` - Load balancer specific tests
- `api-gateway.http` - General API gateway tests

### 4. Monitor Logs
```bash
# API Gateway logs
docker-compose logs -f api-gateway

# Specific service instances
docker-compose logs -f user-service-1 user-service-2

# All services
docker-compose logs -f
```

## Verification Checklist

After deployment, verify:

- [ ] All services start successfully
- [ ] Health endpoint shows all instances as healthy
- [ ] Load balancer distributes requests across instances
- [ ] Circuit breaker activates on failures
- [ ] Statistics show request counts per instance
- [ ] JWT authentication still works for protected endpoints

## Troubleshooting

### Services Not Starting
```bash
# Check service status
docker-compose ps

# Check specific service logs
docker-compose logs user-service-1
```

### Load Balancer Not Working
```bash
# Check API gateway logs
docker-compose logs api-gateway

# Verify service registry configuration
curl http://localhost:3000/stats
```

### Circuit Breaker Issues
```bash
# Check circuit breaker states
curl http://localhost:3000/health

# Reset by restarting API gateway
docker-compose restart api-gateway
```

## Monitoring

### Health Monitoring
```bash
# Overall system health
curl http://localhost:3000/health | jq

# Individual service stats
curl http://localhost:3000/stats/users | jq
```

### Performance Monitoring
```bash
# All load balancer statistics
curl http://localhost:3000/stats | jq

# Monitor request distribution
watch -n 2 'curl -s http://localhost:3000/stats | jq ".loadBalancer.users"'
```

## Configuration

### Adding More Instances
1. Add new service to `docker-compose.yml`
2. Update `serviceRegistry.ts` to register the new instance
3. Restart the API gateway: `docker-compose restart api-gateway`

### Tuning Circuit Breaker
Edit `api-gateway/src/serviceRegistry.ts`:
```typescript
const defaultCircuitBreakerConfig: CircuitBreakerConfig = {
  failureThreshold: 3,        // Failures before opening circuit
  successThreshold: 2,        // Successes before closing circuit
  timeout: 5000,              // Request timeout (ms)
  resetTimeoutMs: 10000,      // Wait time before retry (ms)
};
```

## Documentation

- **Load Balancer Details**: `LOAD_BALANCER_README.md`
- **RabbitMQ Pattern**: `RABBITMQ_PATTERN.md`
- **Competition Filtering**: `competition-service/FILTERING.md`

## Files Added/Modified

- `api-gateway/src/circuitBreaker.ts` - Circuit breaker implementation
- `api-gateway/src/loadBalancer.ts` - Round-robin load balancer
- `api-gateway/src/serviceRegistry.ts` - Service instance management
- `api-gateway/src/loadBalancedProxy.ts` - Proxy with load balancing
- `api-gateway/src/index.ts` - Updated to use load balancer
- `docker-compose.yml` - Multi-instance service configuration
- `test-multi-instance.sh` - Comprehensive testing script
- `rest/api-gateway-loadbalancer.http` - REST client tests
