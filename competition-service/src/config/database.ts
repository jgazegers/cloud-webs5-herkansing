import mongoose from "mongoose";

export async function connectToDatabase(): Promise<void> {
  try {
    const mongoUri = process.env.MONGODB_URI || "mongodb://mongo:27017/competition-service";
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(mongoUri);
    console.log(`✅ Connected to MongoDB at ${mongoUri}`);
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    throw error;
  }
}
