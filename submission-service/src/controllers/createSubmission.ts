import { Request, Response } from "express";
import fs from "fs";
import { Submission, ValidCompetition } from "../models";
import { getImageInfo, fileToBase64, areImagesIdentical } from "../utils";
import { MAX_IMAGE_SIZE } from "../middleware";
import { eventService } from "../services/eventServiceSingleton";

export const createSubmission = async (req: Request, res: Response): Promise<void> => {
  try {
    // Handle both form-data and JSON input
    let submissionData: any;
    let base64Image: string;

    if (req.file) {
      // Form-data submission with file upload
      submissionData = {
        competitionId: req.body.competitionId,
      };
      // Convert uploaded file to base64
      const { path: filePath, mimetype } = req.file;
      base64Image = fileToBase64(filePath, mimetype);
      
      // Clean up the uploaded file after conversion
      fs.unlinkSync(filePath);
    } else {
      // JSON submission with base64 image
      submissionData = req.body;
      base64Image = submissionData.submissionData;
    }

    // Validate required fields
    if (!submissionData.competitionId || !base64Image) {
      res.status(400).json({ 
        error: "Missing required fields: competitionId and submissionData are required" 
      });
      return;
    }

    // Check if the competition exists in our local cache
    const validCompetition = await ValidCompetition.findOne({ 
      competitionId: submissionData.competitionId 
    });

    if (!validCompetition) {
      res.status(400).json({ 
        error: "Invalid competition ID. Competition does not exist or is not accepting submissions." 
      });
      return;
    }

    // Check if competition has ended or been stopped
    if (validCompetition.status === 'stopped') {
      res.status(400).json({ 
        error: "Competition has been stopped by the owner and is no longer accepting submissions." 
      });
      return;
    }

    if (validCompetition.status === 'ended') {
      res.status(400).json({ 
        error: "Competition has ended and is no longer accepting submissions." 
      });
      return;
    }

    // Check if competition has naturally ended based on end date
    if (validCompetition.endDate) {
      const now = new Date();
      if (validCompetition.endDate < now) {
        res.status(400).json({ 
          error: "Competition has ended and is no longer accepting submissions." 
        });
        return;
      }
    }

    // Check if competition hasn't started yet
    if (validCompetition.startDate) {
      const now = new Date();
      if (validCompetition.startDate > now) {
        res.status(400).json({ 
          error: "Competition has not started yet. Submissions will be accepted starting from " + 
                 validCompetition.startDate.toISOString() 
        });
        return;
      }
    }

    // Validate and get info from base64 image
    const imageInfo = getImageInfo(base64Image);
    if (!imageInfo) {
      res.status(400).json({ error: "Invalid image data. Must be a valid base64-encoded image." });
      return;
    }

    // Check image size
    if (imageInfo.size > MAX_IMAGE_SIZE) {
      res.status(400).json({ error: "Image size exceeds the 5MB limit." });
      return;
    }

    // Validate that the submission image is not identical to the target image
    if (areImagesIdentical(base64Image, validCompetition.targetImage)) {
      res.status(400).json({ 
        error: "Submission image cannot be identical to the competition target image. Please upload a different image." 
      });
      return;
    }

    const submission = new Submission({
      ...submissionData,
      owner: req.username, // Set owner from JWT token
      submissionData: base64Image // Save as base64 string
    });

    await submission.save();

    // Publish submission created event
    try {
      await eventService.publishSubmissionCreated({
        submission: {
          _id: submission._id.toString(),
          competitionId: submission.competitionId,
          owner: submission.owner,
          submissionData: submission.submissionData,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    } catch (error) {
      console.error('Failed to publish submission created event:', error);
      // Continue with response - don't fail the submission creation
    }

    res.status(201).json({
      ...submission.toObject(),
      competitionTitle: validCompetition.title,
      imageInfo: {
        type: imageInfo.type,
        size: imageInfo.size
      }
    });
  } catch (error) {
    console.error("Error saving submission:", error);
    res.status(500).json({ error: "Failed to save submission" });
  }
};
