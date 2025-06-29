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
        console.log(`⚠️  Validation failed - Missing required fields: ${fieldError}`);
        res.status(400).json({ error: fieldError });
        return;
      }

      // Validate image format and size
      const imageError = validateImage(targetImageBase64);
      if (imageError) {
        console.log(`⚠️  Validation failed - Image validation error: ${imageError}`);
        res.status(400).json({ error: imageError });
        return;
      }

      // Validate dates
      const dateError = validateDates(competitionData);
      if (dateError) {
        console.log(`⚠️  Validation failed - Date validation error: ${dateError}`);
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
      console.error("❌ Error creating competition:", error);
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
  const missingFields: string[] = [];
  
  if (!competitionData.title) missingFields.push('title');
  if (!competitionData.description) missingFields.push('description');
  if (!targetImageBase64) missingFields.push('targetImage');
  
  if (missingFields.length > 0) {
    console.log(`📝 Validation details - Missing fields: [${missingFields.join(', ')}]`);
    return `Missing required fields: ${missingFields.join(', ')} are required`;
  }
  
  console.log(`✅ Required fields validation passed`);
  return null;
};

// Helper function to validate image format and size
const validateImage = (targetImageBase64: string): string | null => {
  // Validate base64 image format
  if (!isValidBase64Image(targetImageBase64)) {
    console.log(`📝 Validation details - Invalid image format detected`);
    return "Invalid target image format. Please provide a valid base64-encoded image (JPEG, PNG, GIF, WebP, or BMP)";
  }

  // Check image size
  const imageInfo = getImageInfo(targetImageBase64);
  if (!imageInfo) {
    console.log(`📝 Validation details - Failed to process image data`);
    return "Failed to process target image data";
  }

  console.log(`📝 Validation details - Image info: type=${imageInfo.type}, size=${(imageInfo.size / 1024).toFixed(1)}KB`);

  if (imageInfo.size > MAX_IMAGE_SIZE) {
    console.log(`📝 Validation details - Image too large: ${(imageInfo.size / (1024 * 1024)).toFixed(1)}MB > ${MAX_IMAGE_SIZE / (1024 * 1024)}MB`);
    return `Target image too large. Maximum size is ${MAX_IMAGE_SIZE / (1024 * 1024)}MB`;
  }

  console.log(`✅ Image validation passed`);
  return null;
};

// Helper function to validate competition dates
const validateDates = (competitionData: any): string | null => {
  // If no dates are provided, competition runs indefinitely until manually stopped
  if (!competitionData.startDate && !competitionData.endDate) {
    console.log(`📝 Date validation - No dates provided, competition will run indefinitely`);
    return null;
  }

  const now = new Date();

  // If only startDate is provided
  if (competitionData.startDate && !competitionData.endDate) {
    const startDate = new Date(competitionData.startDate);
    console.log(`📝 Date validation - Start date only: ${startDate.toISOString()}`);
    
    if (startDate < now) {
      console.log(`📝 Validation details - Start date ${startDate.toISOString()} is in the past (current: ${now.toISOString()})`);
      return "Start date cannot be in the past";
    }
    console.log(`✅ Date validation passed - Start date only`);
    return null;
  }

  // If only endDate is provided
  if (!competitionData.startDate && competitionData.endDate) {
    const endDate = new Date(competitionData.endDate);
    console.log(`📝 Date validation - End date only: ${endDate.toISOString()}`);
    
    if (endDate <= now) {
      console.log(`📝 Validation details - End date ${endDate.toISOString()} is not in the future (current: ${now.toISOString()})`);
      return "End date must be in the future";
    }
    console.log(`✅ Date validation passed - End date only`);
    return null;
  }

  // If both dates are provided
  if (competitionData.startDate && competitionData.endDate) {
    const startDate = new Date(competitionData.startDate);
    const endDate = new Date(competitionData.endDate);
    console.log(`📝 Date validation - Both dates: start=${startDate.toISOString()}, end=${endDate.toISOString()}`);

    if (startDate < now) {
      console.log(`📝 Validation details - Start date ${startDate.toISOString()} is in the past (current: ${now.toISOString()})`);
      return "Start date cannot be in the past";
    }

    if (endDate <= startDate) {
      console.log(`📝 Validation details - End date ${endDate.toISOString()} is not after start date ${startDate.toISOString()}`);
      return "End date must be after start date";
    }
    
    console.log(`✅ Date validation passed - Both dates valid`);
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
      status: competition.status,
      owner: competition.owner,
      createdAt: competition.createdAt,
      updatedAt: competition.updatedAt,
    },
  };

  try {
    await messageQueue.publishCompetitionCreated(event);
    console.log(`✅ Competition created successfully: "${competition.title}" (ID: ${competition._id})`);
  } catch (mqError) {
    console.error("❌ Failed to publish competition created event:", mqError);
    console.log(
      "🚨 Competition created but event not published. Manual intervention may be required."
    );
  }
};

