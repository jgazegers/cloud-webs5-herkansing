import { Request, Response } from "express";
import mongoose from "mongoose";
import fs from "fs";
import { Competition } from "../models/Competition";
import { MessageQueue, CompetitionCreatedEvent } from "../messageQueue";
import { MAX_IMAGE_SIZE } from "../middleware/upload";
import { isValidBase64Image, getImageInfo, fileToBase64 } from "../utils/imageUtils";

// Main controller function
export const createCompetition = (messageQueue: MessageQueue) => {
  return async (req: Request, res: Response) => {
    try {
      // Process image data from request
      const { competitionData, targetImageBase64 } = processImageData(req);

      // Validate required fields
      const fieldError = validateRequiredFields(competitionData, targetImageBase64);
      if (fieldError) {
        res.status(400).json({ error: fieldError });
        return;
      }

      // Validate image format and size
      const imageError = validateImage(targetImageBase64);
      if (imageError) {
        res.status(400).json({ error: imageError });
        return;
      }

      // Validate dates
      const dateError = validateDates(competitionData);
      if (dateError) {
        res.status(400).json({ error: dateError });
        return;
      }

      // Create and save competition
      const competition = await createAndSaveCompetition(
        competitionData, 
        targetImageBase64, 
        req.username!
      );

      // Publish competition created event (non-blocking)
      await publishCompetitionEvent(messageQueue, competition);

      // Get image info for response
      const imageInfo = getImageInfo(targetImageBase64);

      // Send successful response
      res.status(201).json({
        ...competition.toObject(),
        targetImageInfo: {
          type: imageInfo?.type || "unknown",
          size: imageInfo?.size || 0,
        },
      });
    } catch (error: any) {
      console.error("Error creating competition:", error);
      res.status(400).json({ error: error.message });
    }
  };
};


// Helper function to process uploaded file or JSON image data
const processImageData = (req: Request): { competitionData: any; targetImageBase64: string } => {
  let competitionData: any;
  let targetImageBase64: string;

  if (req.file) {
    // Form-data submission with file upload
    competitionData = {
      title: req.body.title,
      description: req.body.description,
      location:
        typeof req.body.location === "string"
          ? JSON.parse(req.body.location)
          : req.body.location,
      startDate: req.body.startDate,
      endDate: req.body.endDate,
    };
    
    // Convert uploaded file to base64
    const { mimetype } = req.file;
    targetImageBase64 = fileToBase64(req.file.path, mimetype);

    // Clean up uploaded file after processing
    fs.unlinkSync(req.file.path);
  } else {
    // JSON submission with base64 image
    competitionData = req.body;
    targetImageBase64 = competitionData.targetImage;
  }

  return { competitionData, targetImageBase64 };
};

// Helper function to validate required fields
const validateRequiredFields = (competitionData: any, targetImageBase64: string): string | null => {
  if (!competitionData.title || !competitionData.description || !targetImageBase64) {
    return "Missing required fields: title, description, and targetImage are required";
  }
  return null;
};

// Helper function to validate image format and size
const validateImage = (targetImageBase64: string): string | null => {
  // Validate base64 image format
  if (!isValidBase64Image(targetImageBase64)) {
    return "Invalid target image format. Please provide a valid base64-encoded image (JPEG, PNG, GIF, WebP, or BMP)";
  }

  // Check image size
  const imageInfo = getImageInfo(targetImageBase64);
  if (!imageInfo) {
    return "Failed to process target image data";
  }

  if (imageInfo.size > MAX_IMAGE_SIZE) {
    return `Target image too large. Maximum size is ${MAX_IMAGE_SIZE / (1024 * 1024)}MB`;
  }

  return null;
};

// Helper function to validate competition dates
const validateDates = (competitionData: any): string | null => {
  const startDate = new Date(competitionData.startDate);
  const endDate = new Date(competitionData.endDate);
  const now = new Date();

  if (startDate < now) {
    return "Start date cannot be in the past";
  }

  if (endDate <= startDate) {
    return "End date must be after start date";
  }

  return null;
};

// Helper function to create and save competition
const createAndSaveCompetition = async (
  competitionData: any, 
  targetImageBase64: string, 
  username: string
) => {
  const competition = new Competition({
    ...competitionData,
    targetImage: targetImageBase64,
    owner: username,
  });
  
  await competition.save();
  return competition;
};

// Helper function to publish competition created event
const publishCompetitionEvent = async (
  messageQueue: MessageQueue, 
  competition: any
): Promise<void> => {
  const event: CompetitionCreatedEvent = {
    competition: {
      _id: (competition._id as mongoose.Types.ObjectId).toString(),
      title: competition.title,
      description: competition.description,
      targetImage: competition.targetImage,
      location: competition.location,
      startDate: competition.startDate,
      endDate: competition.endDate,
      owner: competition.owner,
      createdAt: competition.createdAt,
      updatedAt: competition.updatedAt,
    },
  };

  try {
    await messageQueue.publishCompetitionCreated(event);
  } catch (mqError) {
    console.error("Failed to publish competition created event:", mqError);
    console.log(
      "🚨 Competition created but event not published. Manual intervention may be required."
    );
  }
};

