import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import jwt from "jsonwebtoken";
import { ServiceRegistry } from "./serviceRegistry";
import { createLoadBalancedProxy } from "./loadBalancedProxy";

const app = express();

// Initialize service registry with load balancers and circuit breakers
const serviceRegistry = new ServiceRegistry();

// Increase payload limit for base64 images (20MB)
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ limit: "20mb", extended: true }));

const PORT = process.env.PORT || 3000;

// Remove old hardcoded services - now managed by ServiceRegistry
// const services = { ... }

// Remove old error handler - now handled by load balancer
// const onErrorHandle = (err: any, req: any, res: any) => { ... }

// JWT token exchange middleware for competition service
const jwtTokenExchange = (req: any, res: any, next: any) => {
  const authHeader = req.headers["authorization"];
  const externalToken = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (!externalToken) {
    return res.status(401).json({ error: "Access token required" });
  }

  try {
    // Verify external token with JWT_SECRET_EXTERNAL
    const decoded = jwt.verify(
      externalToken,
      process.env.JWT_SECRET_EXTERNAL || "external-secret"
    ) as any;

    // Create new internal token with JWT_SECRET_INTERNAL
    const internalToken = jwt.sign(
      {
        username: decoded.username,
        // Copy other relevant claims if needed
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour expiry
      },
      process.env.JWT_SECRET_INTERNAL || "internal-secret"
    );

    // Replace the authorization header with the internal token
    req.headers["authorization"] = `Bearer ${internalToken}`;
    next();
  } catch (error) {
    console.error("JWT token exchange error:", error);
    return res.status(403).json({ error: "Invalid or expired token" });
  }
};

// User service proxy with load balancing
app.use(
  "/api/users",
  createLoadBalancedProxy(serviceRegistry, {
    serviceName: 'users',
    pathRewrite: {
      "^/api/users": "/",
    },
  })
);

// Competition service proxy with JWT token exchange and load balancing
app.use(
  "/api/competitions",
  jwtTokenExchange, // First validate external token and exchange for internal token
  createLoadBalancedProxy(serviceRegistry, {
    serviceName: 'competitions',
    pathRewrite: {
      "^/api/competitions": "/",
    },
  })
);

// Submission service proxy with JWT token exchange and load balancing
app.use(
  "/api/submissions",
  jwtTokenExchange, // First validate external token and exchange for internal token
  createLoadBalancedProxy(serviceRegistry, {
    serviceName: 'submissions',
    pathRewrite: {
      "^/api/submissions": "/",
    },
  })
);

// Note: Image comparison and winner services are internal services
// that communicate via RabbitMQ. They are not exposed through the API Gateway
// as they are meant for internal processing, not external API access.

// Health check and statistics endpoints
app.get("/health", (req, res) => {
  const stats = serviceRegistry.getAllStats();
  const totalServices = Object.keys(stats).length;
  const healthyServices = Object.values(stats).filter(
    (service: any) => service.summary.availableInstances > 0
  ).length;

  res.status(healthyServices === totalServices ? 200 : 503).json({
    status: healthyServices === totalServices ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    services: {
      total: totalServices,
      healthy: healthyServices,
      degraded: totalServices - healthyServices
    },
    details: stats
  });
});

app.get("/stats", (req, res) => {
  res.json({
    timestamp: new Date().toISOString(),
    loadBalancer: serviceRegistry.getAllStats()
  });
});

app.get("/stats/:serviceName", (req, res) => {
  const serviceName = req.params.serviceName;
  const stats = serviceRegistry.getServiceStats(serviceName);
  
  if (!stats) {
    res.status(404).json({ error: `Service ${serviceName} not found` });
    return;
  }

  res.json({
    service: serviceName,
    timestamp: new Date().toISOString(),
    ...stats
  });
});

app.get("/", (req, res) => {
  res.send("API Gateway is running");
});

app.listen(PORT, () => {
  console.log(`API Gateway is running on http://localhost:${PORT}`);
});
