import { Request, Response } from "express";
import { Submission } from "../models";

export const getSubmissionsByCompetition = async (req: Request, res: Response): Promise<void> => {
  try {
    const { competitionId } = req.params;
    
    const submissions = await Submission.find({ competitionId })
      .select('-__v') // Exclude version field
      .sort({ createdAt: -1 }); // Sort by newest first

    res.status(200).json({
      competitionId,
      totalSubmissions: submissions.length,
      submissions: submissions.map(submission => ({
        ...submission.toObject(),
        // Truncate base64 image data in list view for performance
        submissionData: submission.submissionData.substring(0, 100) + '...[truncated]'
      }))
    });
  } catch (error) {
    console.error("Error retrieving submissions:", error);
    res.status(500).json({ error: "Failed to retrieve submissions" });
  }
};
