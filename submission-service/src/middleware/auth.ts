import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

// JWT middleware to extract username from token
export const authenticateInternalToken = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({ error: "Access token required" });
    return;
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET_INTERNAL || "your-secret-key"
    ) as any;
    req.username = decoded.username; // Extract username from JWT payload
    next();
  } catch (error) {
    res.status(403).json({ error: "Invalid or expired token" });
  }
};
