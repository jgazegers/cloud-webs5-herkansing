import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import jwt from "jsonwebtoken";

const app = express();

// Increase payload limit for base64 images (20MB)
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ limit: "20mb", extended: true }));

const PORT = 3000;

const services = {
  users: "http://user-service:3001",
  competitions: "http://competition-service:3002",
  submissions: "http://submission-service:3003",
};

const onErrorHandle = (err: any, req: any, res: any) => {
  console.error("Proxy error:", err);
  res.status(500).send("Proxy error");
};

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

app.use(
  "/api/users",
  createProxyMiddleware({
    target: services.users,
    changeOrigin: true,
    pathRewrite: {
      "^/api/users": "/",
    },
    // Configure proxy to handle larger payloads
    on: {
      error: onErrorHandle,
      proxyReq: (proxyReq, req, res) => {
        // Ensure proper headers are set for large payloads
        if (req.headers['content-length']) {
          proxyReq.setHeader('content-length', req.headers['content-length']);
        }
        // Handle JSON payloads properly for large requests
        if (req.body && typeof req.body === 'object') {
          const bodyData = JSON.stringify(req.body);
          proxyReq.setHeader('Content-Type', 'application/json');
          proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
          proxyReq.write(bodyData);
        }
      },
    },
  })
);

// Competition service proxy with JWT token exchange
app.use(
  "/api/competitions",
  jwtTokenExchange, // First validate external token and exchange for internal token
  createProxyMiddleware({
    target: services.competitions,
    changeOrigin: true,
    pathRewrite: {
      "^/api/competitions": "/",
    },
    on: {
      error: onErrorHandle,
      proxyReq: (proxyReq, req, res) => {
        // Handle large file uploads and form data
        if (req.headers['content-length']) {
          proxyReq.setHeader('content-length', req.headers['content-length']);
        }
        if (req.headers['content-type']) {
          proxyReq.setHeader('content-type', req.headers['content-type']);
        }
      },
    },
  })
);

app.use(
  "/api/submissions",
  jwtTokenExchange, // First validate external token and exchange for internal token
  createProxyMiddleware({
    target: services.submissions,
    changeOrigin: true,
    pathRewrite: {
      "^/api/submissions": "/",
    },
    on: {
      error: onErrorHandle,
      proxyReq: (proxyReq, req, res) => {
        // Handle large file uploads and form data
        if (req.headers['content-length']) {
          proxyReq.setHeader('content-length', req.headers['content-length']);
        }
        if (req.headers['content-type']) {
          proxyReq.setHeader('content-type', req.headers['content-type']);
        }
      },
    },
  })
);

app.get("/", (req, res) => {
  res.send("API Gateway is running");
});

app.listen(PORT, () => {
  console.log(`API Gateway is running on http://localhost:${PORT}`);
});
