// src/loadBalancer.ts
import { CircuitBreaker, CircuitBreakerConfig, CircuitState } from './circuitBreaker';

export interface ServiceInstance {
  id: string;
  url: string;
  weight?: number; // For future weighted round-robin
}

export interface LoadBalancerConfig {
  circuitBreakerConfig: CircuitBreakerConfig;
  healthCheckInterval?: number; // ms between health checks
}

export class LoadBalancer {
  private instances: Map<string, ServiceInstance> = new Map();
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private currentIndex: number = 0;
  private config: LoadBalancerConfig;
  private healthCheckTimer?: NodeJS.Timeout;

  constructor(config: LoadBalancerConfig) {
    this.config = config;
  }

  public addInstance(instance: ServiceInstance): void {
    this.instances.set(instance.id, instance);
    this.circuitBreakers.set(
      instance.id, 
      new CircuitBreaker(this.config.circuitBreakerConfig)
    );
    console.log(`Added service instance: ${instance.id} at ${instance.url}`);
  }

  public removeInstance(instanceId: string): void {
    this.instances.delete(instanceId);
    this.circuitBreakers.delete(instanceId);
    console.log(`Removed service instance: ${instanceId}`);
  }

  public getNextInstance(): ServiceInstance | null {
    const availableInstances = this.getAvailableInstances();
    
    if (availableInstances.length === 0) {
      return null;
    }

    // Round-robin selection
    const selectedInstance = availableInstances[this.currentIndex % availableInstances.length];
    this.currentIndex = (this.currentIndex + 1) % availableInstances.length;
    
    return selectedInstance;
  }

  private getAvailableInstances(): ServiceInstance[] {
    const available: ServiceInstance[] = [];
    
    for (const [instanceId, instance] of this.instances) {
      const circuitBreaker = this.circuitBreakers.get(instanceId);
      if (circuitBreaker && circuitBreaker.canExecute()) {
        available.push(instance);
      }
    }
    
    return available;
  }

  public recordSuccess(instanceId: string): void {
    const circuitBreaker = this.circuitBreakers.get(instanceId);
    if (circuitBreaker) {
      circuitBreaker.onSuccess();
    }
  }

  public recordFailure(instanceId: string): void {
    const circuitBreaker = this.circuitBreakers.get(instanceId);
    if (circuitBreaker) {
      circuitBreaker.onFailure();
      console.log(`Recorded failure for instance ${instanceId}. Circuit state: ${circuitBreaker.getState()}`);
    }
  }

  public getInstanceStats() {
    const stats: Record<string, any> = {};
    
    for (const [instanceId, instance] of this.instances) {
      const circuitBreaker = this.circuitBreakers.get(instanceId);
      stats[instanceId] = {
        url: instance.url,
        circuitBreaker: circuitBreaker ? circuitBreaker.getStats() : null,
        available: circuitBreaker ? circuitBreaker.canExecute() : false
      };
    }
    
    return stats;
  }

  public getAllInstances(): ServiceInstance[] {
    return Array.from(this.instances.values());
  }

  public getAvailableInstanceCount(): number {
    return this.getAvailableInstances().length;
  }

  public getTotalInstanceCount(): number {
    return this.instances.size;
  }
}
