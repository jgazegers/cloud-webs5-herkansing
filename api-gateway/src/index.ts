import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import jwt from "jsonwebtoken";
import { ServiceRegistry } from "./serviceRegistry";
import { createLoadBalancedProxy } from "./loadBalancedProxy";
import { specs, swaggerUi } from "./config/swagger";

const app = express();

// Initialize service registry with load balancers and circuit breakers
const serviceRegistry = new ServiceRegistry();

// Increase payload limit for base64 images (20MB)
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ limit: "20mb", extended: true }));

const PORT = process.env.PORT || 3000;

// Swagger documentation setup
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));

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

/**
 * @swagger
 * tags:
 *   - name: Users
 *     description: User management and authentication
 *   - name: Competitions
 *     description: Competition management
 *   - name: Submissions
 *     description: Submission management
 *   - name: Health
 *     description: Health check and monitoring
 */

/**
 * @swagger
 * /api/users/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserInput'
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Invalid input
 *       409:
 *         description: Username already exists
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/users/login:
 *   post:
 *     summary: Login user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserInput'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Invalid credentials
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/competitions:
 *   post:
 *     summary: Create a new competition
 *     tags: [Competitions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string }
 *               description: { type: string }
 *               endDate: { type: string, format: date-time }
 *               targetImage: { type: string, format: binary }
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CompetitionInput'
 *     responses:
 *       201:
 *         description: Competition created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 *   get:
 *     summary: Get all competitions
 *     tags: [Competitions]
 *     responses:
 *       200:
 *         description: List of competitions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalCompetitions: { type: integer }
 *                 competitions:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Competition'
 */

/**
 * @swagger
 * /api/submissions:
 *   post:
 *     summary: Create a new submission
 *     tags: [Submissions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               competitionId: { type: string }
 *               submissionData: { type: string, format: binary }
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SubmissionInput'
 *     responses:
 *       201:
 *         description: Submission created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /health:
 *   get:
 *     summary: API Gateway health check
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: All services are healthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthCheck'
 *       503:
 *         description: Some services are degraded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthCheck'
 */

/**
 * @swagger
 * /stats:
 *   get:
 *     summary: Load balancer statistics
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Load balancer statistics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoadBalancerStats'
 */

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
  console.log(`🚀 API Gateway is running on http://localhost:${PORT}`);
  console.log(`📚 API documentation: http://localhost:${PORT}/api-docs`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📈 Load balancer stats: http://localhost:${PORT}/stats`);
  console.log(`🌐 Available endpoints:`);
  console.log(`   • Users: /api/users/*`);
  console.log(`   • Competitions: /api/competitions/*`);
  console.log(`   • Submissions: /api/submissions/*`);
});
