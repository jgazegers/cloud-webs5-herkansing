import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { IUser, IUserInput, User } from "./models/User";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { specs, swaggerUi } from "./config/swagger";

const createUser = async (userData: IUserInput): Promise<IUser> => {
  const user = new User(userData);
  return await user.save();
};

const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/userdb";

const connectDB = async () => {
  try {
    await mongoose.connect(mongoUri);
    console.log(`✅ Connected to MongoDB at ${mongoUri}`);
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
};

const startServer = async () => {
  console.log("🚀 Starting User Service...");
  
  try {
    await connectDB();

    const app = express();
    app.use(express.json());

    // Swagger documentation setup
    app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));

    // Health check endpoint
    /**
     * @swagger
     * /health:
     *   get:
     *     summary: Health check endpoint
     *     tags: [Health]
     *     responses:
     *       200:
     *         description: Service is healthy
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/HealthCheck'
     */
    app.get('/health', (req, res) => {
      res.status(200).json({
        status: 'healthy',
        service: 'user-service',
        timestamp: new Date().toISOString()
      });
    });

    /**
     * @swagger
     * /register:
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
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Error'
     *       409:
     *         description: Username already exists
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Error'
     *       500:
     *         description: Server error
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Error'
     */
    app.post("/register", async (req, res) => {
      try {
        const { username, password } = req.body;

        if (!username || !password) {
          console.log(`⚠️  Registration attempt failed: Missing username or password`);
          res.status(400).json({ error: "Username and password are required" });
          return;
        }

        const user = await createUser({ username, password });
        console.log(`✅ User registered successfully: ${username}`);
        res.status(201).json(user);
      } catch (error) {
        console.error("❌ Error creating user:", error);
        res.status(500).json({ error: "Failed to create user", detail: error });
      }
    });

    /**
     * @swagger
     * /login:
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
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Error'
     *       401:
     *         description: Invalid credentials
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Error'
     *       500:
     *         description: Server error
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Error'
     */
    app.post("/login", async (req, res) => {
      try {
        const { username, password } = req.body;

        const user = await User.findOne({ username });

        if (!user) {
          console.log(`⚠️  Login attempt failed: User not found - ${username}`);
          res.status(404).json({ error: "User not found" });
          return;
        }

        const isMatch = await user.comparePassword(password);

        if (!isMatch) {
          console.log(`⚠️  Login attempt failed: Incorrect password for user - ${username}`);
          res.status(401).json({ error: "Incorrect password" });
          return;
        }

        const jwtSecret = process.env.JWT_SECRET_EXTERNAL;
        if (jwtSecret === undefined) {
          console.error("❌ JWT secret not configured");
          res.status(500).json({ error: "No JWT secret found" });
          return;
        }

        const token = jwt.sign({ username }, jwtSecret, {
          expiresIn: "1h",
        });

        console.log(`✅ User logged in successfully: ${username}`);
        res.status(200).json(token);
      } catch (error) {
        console.error("❌ Error during login:", error);
        res.status(500).json({ errorMessage: "Failed to login", error });
      }
    });

    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => {
      console.log(`✅ User Service started successfully`);
      console.log(`🌐 Server running on port ${PORT}`);
      console.log(`📋 Service capabilities:`);
      console.log(`   • User registration and authentication`);
      console.log(`   • JWT token generation for external access`);
      console.log(`   • Health checks and status monitoring`);
      console.log(`   • API documentation and testing with Swagger`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`📚 API documentation: http://localhost:${PORT}/api-docs`);
    });
  } catch (error) {
    console.error("❌ Failed to start User Service:", error);
    process.exit(1);
  }
};

// Graceful shutdown handlers
async function gracefulShutdown(signal: string): Promise<void> {
  console.log(`\n🛑 ${signal} received, shutting down gracefully...`);
  try {
    await mongoose.connection.close();
    console.log('✅ User Service stopped successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during graceful shutdown:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start the server
startServer();
