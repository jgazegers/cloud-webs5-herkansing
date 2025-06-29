// src/loadBalancedProxy.ts
import { RequestHandler } from 'express';
import { createProxyMiddleware, Options } from 'http-proxy-middleware';
import { ServiceRegistry } from './serviceRegistry';
import { ServiceInstance } from './loadBalancer';

export interface LoadBalancedProxyOptions extends Omit<Options, 'target'> {
  serviceName: string;
  pathRewrite?: { [regexp: string]: string };
  onError?: (err: any, req: any, res: any) => void;
  onProxyReq?: (proxyReq: any, req: any, res: any) => void;
}

export function createLoadBalancedProxy(
  serviceRegistry: ServiceRegistry,
  options: LoadBalancedProxyOptions
): RequestHandler {
  const { serviceName, onError, onProxyReq, ...proxyOptions } = options;

  // Custom router function that uses load balancer
  const router = (req: any): string | undefined => {
    const instance = serviceRegistry.getServiceInstance(serviceName);
    if (!instance) {
      console.error(`No available instances for service: ${serviceName}`);
      return undefined;
    }

    // Store instance info in request for later use
    req.selectedInstance = instance;
    console.log(`Routing ${req.method} ${req.url} to ${instance.id} (${instance.url})`);
    
    return instance.url;
  };

  // Custom error handler that records failures
  const errorHandler = (err: any, req: any, res: any) => {
    const instance: ServiceInstance = req.selectedInstance;
    
    if (instance) {
      serviceRegistry.recordFailure(serviceName, instance.id);
      console.error(`Request failed for ${instance.id}: ${err.message}`);
    }

    // Call custom error handler if provided, otherwise use default
    if (onError) {
      onError(err, req, res);
    } else {
      console.error("Proxy error:", err);
      if (!res.headersSent) {
        res.status(503).json({ 
          error: "Service temporarily unavailable",
          service: serviceName,
          instance: instance?.id || 'unknown'
        });
      }
    }
  };

  // Success handler for recording successful requests
  const successHandler = (proxyRes: any, req: any, res: any) => {
    const instance: ServiceInstance = req.selectedInstance;
    
    if (instance) {
      // Record success if response is not an error status
      if (proxyRes.statusCode < 500) {
        serviceRegistry.recordSuccess(serviceName, instance.id);
      } else {
        // 5xx responses are considered failures
        serviceRegistry.recordFailure(serviceName, instance.id);
      }
    }
  };

  // Custom proxy request handler
  const proxyReqHandler = (proxyReq: any, req: any, res: any) => {
    // Handle large file uploads and form data
    if (req.headers['content-length']) {
      proxyReq.setHeader('content-length', req.headers['content-length']);
    }
    if (req.headers['content-type']) {
      proxyReq.setHeader('content-type', req.headers['content-type']);
    }

    // Handle JSON payloads properly for large requests
    if (req.body && typeof req.body === 'object') {
      const bodyData = JSON.stringify(req.body);
      proxyReq.setHeader('Content-Type', 'application/json');
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
      proxyReq.write(bodyData);
    }

    // Call custom proxy request handler if provided
    if (onProxyReq) {
      onProxyReq(proxyReq, req, res);
    }
  };

  return createProxyMiddleware({
    target: 'http://placeholder', // This will be overridden by router
    changeOrigin: true,
    router,
    on: {
      error: errorHandler,
      proxyRes: successHandler,
      proxyReq: proxyReqHandler,
    },
    ...proxyOptions,
  });
}
