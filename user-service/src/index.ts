import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { IUser, IUserInput, User } from "./models/User";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";

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

    app.get("/health", (req, res) => {
      res.status(200).json({ 
        status: "healthy",
        service: "user-service",
        timestamp: new Date().toISOString()
      });
    });

    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => {
      console.log(`✅ User Service started successfully`);
      console.log(`🌐 Server running on port ${PORT}`);
      console.log(`📋 Service capabilities:`);
      console.log(`   • User registration and authentication`);
      console.log(`   • JWT token generation for external access`);
      console.log(`   • Health checks and status monitoring`);
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
