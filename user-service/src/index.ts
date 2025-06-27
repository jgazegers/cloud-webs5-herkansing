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
    console.log(`Connected to MongoDB at ${mongoUri}`);
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
};

const startServer = async () => {
  await connectDB();

  const app = express();
  app.use(express.json()); // Don't forget to parse JSON body!

  app.post("/register", async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        res.status(400).json({ error: "Username and password are required" });
        return;
      }

      const user = await createUser({ username, password });
      res.status(201).json(user);
    } catch (error) {
      console.log(error);
      res.status(500).json({ error: "Failed to create user", detail: error });
    }
  });

  app.post("/login", async (req, res) => {
    try {
      const { username, password } = req.body;

      const user = await User.findOne({ username });

      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      const isMatch = await user.comparePassword(password);

      if (!isMatch) {
        res.status(401).json({ error: "Incorrect password" });
        return;
      }

      const jwtSecret = process.env.JWT_SECRET_EXTERNAL;
      if (jwtSecret === undefined) {
        res.status(500).json({ error: "No JWT secret found" });
        return;
      }

      const token = jwt.sign({ username }, jwtSecret, {
        expiresIn: "1h",
      });

      res.status(200).json(token);
    } catch (error) {
      console.log(error);
      res.status(500).json({ errorMessage: "Failed to login", error });
    }
  });

  app.listen(3001, () => {
    console.log("Users service connected");
  });
};

startServer();
