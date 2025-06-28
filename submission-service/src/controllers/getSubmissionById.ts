import { Request, Response } from "express";
import { Submission } from "../models";
import { getImageInfo } from "../utils";

export const getSubmissionById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { submissionId } = req.params;
    
    const submission = await Submission.findById(submissionId).select('-__v');
    
    if (!submission) {
      res.status(404).json({ error: "Submission not found" });
      return;
    }

    // Get image info
    const imageInfo = getImageInfo(submission.submissionData);

    res.status(200).json({
      ...submission.toObject(),
      imageInfo: imageInfo || { type: 'unknown', size: 0 }
    });
  } catch (error) {
    console.error("Error retrieving submission:", error);
    res.status(500).json({ error: "Failed to retrieve submission" });
  }
};
