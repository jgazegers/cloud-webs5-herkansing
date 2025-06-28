import mongoose from "mongoose";

export async function connectToDatabase(): Promise<void> {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://mongo:27017/competition-service"
    );
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
}
