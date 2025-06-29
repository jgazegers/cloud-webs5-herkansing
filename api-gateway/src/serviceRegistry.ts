// src/serviceRegistry.ts
import { LoadBalancer, LoadBalancerConfig, ServiceInstance } from './loadBalancer';
import { CircuitBreakerConfig } from './circuitBreaker';

export class ServiceRegistry {
  private loadBalancers: Map<string, LoadBalancer> = new Map();
  private defaultConfig: LoadBalancerConfig;

  constructor() {
    // Default circuit breaker configuration
    const defaultCircuitBreakerConfig: CircuitBreakerConfig = {
      failureThreshold: 3,        // Open circuit after 3 failures
      successThreshold: 2,        // Close circuit after 2 successes
      timeout: 5000,              // 5 second timeout
      resetTimeoutMs: 10000,      // Wait 10 seconds before retry
    };

    this.defaultConfig = {
      circuitBreakerConfig: defaultCircuitBreakerConfig,
      healthCheckInterval: 30000,  // 30 seconds
    };

    this.initializeServices();
  }

  private initializeServices(): void {
    // Initialize load balancers for public-facing services only
    // Image comparison and winner services are internal and communicate via RabbitMQ
    this.setupUserService();
    this.setupCompetitionService();
    this.setupSubmissionService();
  }

  private setupUserService(): void {
    const userLB = new LoadBalancer(this.defaultConfig);
    
    // Add multiple user service instances
    userLB.addInstance({
      id: 'user-service-1',
      url: 'http://user-service-1:3001'
    });
    
    userLB.addInstance({
      id: 'user-service-2',
      url: 'http://user-service-2:3001'
    });

    this.loadBalancers.set('users', userLB);
  }

  private setupCompetitionService(): void {
    const competitionLB = new LoadBalancer(this.defaultConfig);
    
    // Add multiple competition service instances
    competitionLB.addInstance({
      id: 'competition-service-1',
      url: 'http://competition-service-1:3002'
    });
    
    competitionLB.addInstance({
      id: 'competition-service-2',
      url: 'http://competition-service-2:3002'
    });

    this.loadBalancers.set('competitions', competitionLB);
  }

  private setupSubmissionService(): void {
    const submissionLB = new LoadBalancer(this.defaultConfig);
    
    // Add multiple submission service instances
    submissionLB.addInstance({
      id: 'submission-service-1',
      url: 'http://submission-service-1:3003'
    });
    
    submissionLB.addInstance({
      id: 'submission-service-2',
      url: 'http://submission-service-2:3003'
    });

    this.loadBalancers.set('submissions', submissionLB);
  }

  // Image comparison and winner services are removed from the service registry
  // as they are internal services that communicate via RabbitMQ and should not
  // be exposed through the API Gateway for external access.
  // Their health endpoints are available directly if needed for internal monitoring.

  public getLoadBalancer(serviceName: string): LoadBalancer | null {
    return this.loadBalancers.get(serviceName) || null;
  }

  public getServiceInstance(serviceName: string): ServiceInstance | null {
    const loadBalancer = this.getLoadBalancer(serviceName);
    return loadBalancer ? loadBalancer.getNextInstance() : null;
  }

  public recordSuccess(serviceName: string, instanceId: string): void {
    const loadBalancer = this.getLoadBalancer(serviceName);
    if (loadBalancer) {
      loadBalancer.recordSuccess(instanceId);
    }
  }

  public recordFailure(serviceName: string, instanceId: string): void {
    const loadBalancer = this.getLoadBalancer(serviceName);
    if (loadBalancer) {
      loadBalancer.recordFailure(instanceId);
    }
  }

  public getAllStats() {
    const stats: Record<string, any> = {};
    
    for (const [serviceName, loadBalancer] of this.loadBalancers) {
      stats[serviceName] = {
        ...loadBalancer.getInstanceStats(),
        summary: {
          totalInstances: loadBalancer.getTotalInstanceCount(),
          availableInstances: loadBalancer.getAvailableInstanceCount()
        }
      };
    }
    
    return stats;
  }

  public getServiceStats(serviceName: string) {
    const loadBalancer = this.getLoadBalancer(serviceName);
    if (!loadBalancer) {
      return null;
    }

    return {
      instances: loadBalancer.getInstanceStats(),
      summary: {
        totalInstances: loadBalancer.getTotalInstanceCount(),
        availableInstances: loadBalancer.getAvailableInstanceCount()
      }
    };
  }

  // Utility method to add more instances dynamically
  public addServiceInstance(serviceName: string, instance: ServiceInstance): boolean {
    const loadBalancer = this.getLoadBalancer(serviceName);
    if (loadBalancer) {
      loadBalancer.addInstance(instance);
      return true;
    }
    return false;
  }

  // Utility method to remove instances dynamically
  public removeServiceInstance(serviceName: string, instanceId: string): boolean {
    const loadBalancer = this.getLoadBalancer(serviceName);
    if (loadBalancer) {
      loadBalancer.removeInstance(instanceId);
      return true;
    }
    return false;
  }
}
