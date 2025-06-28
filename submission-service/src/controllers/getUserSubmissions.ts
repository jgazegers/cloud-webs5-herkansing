import { Request, Response } from "express";
import { Submission } from "../models";
import { getImageInfo } from "../utils";

export const getUserSubmissions = async (req: Request, res: Response): Promise<void> => {
  try {
    const submissions = await Submission.find({ owner: req.username })
      .select('-__v')
      .sort({ createdAt: -1 });

    res.status(200).json({
      totalSubmissions: submissions.length,
      submissions: submissions.map(submission => {
        const imageInfo = getImageInfo(submission.submissionData);
        return {
          ...submission.toObject(),
          imageInfo: imageInfo || { type: 'unknown', size: 0 },
          // Truncate base64 for list view
          submissionData: submission.submissionData.substring(0, 100) + '...[truncated]'
        };
      })
    });
  } catch (error) {
    console.error("Error retrieving user submissions:", error);
    res.status(500).json({ error: "Failed to retrieve user submissions" });
  }
};
