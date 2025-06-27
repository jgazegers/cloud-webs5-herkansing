import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";

const app = express();
const PORT = 3000;

const services = {
  users: "http://user-service:3001",
};

const onErrorHandle = (err: any, req: any, res: any) => {
  console.error('Proxy error:', err);
  res.status(500).send('Proxy error');
};

app.use(
  "/api/users",
  createProxyMiddleware({
    target: services.users,
    changeOrigin: true,
    pathRewrite: {
      "^/api/users": "/",
    },
    on: {
      error: onErrorHandle,
    }
  })
);

app.get("/", (req, res) => {
  res.send("API Gateway is running");
});

app.listen(PORT, () => {
  console.log(`API Gateway is running on http://localhost:${PORT}`);
});
