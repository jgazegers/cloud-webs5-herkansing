import { Request, Response } from "express";
import { Submission, ValidCompetition } from "../models";
import { eventService } from "../services/eventServiceSingleton";

export const deleteSubmission = async (req: Request, res: Response): Promise<void> => {
  try {
    const { submissionId } = req.params;
    const username = req.username;

    if (!username) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    // Find the submission
    const submission = await Submission.findById(submissionId);
    if (!submission) {
      res.status(404).json({ error: "Submission not found" });
      return;
    }

    // Check if user is the submission owner OR the competition owner
    let canDelete = false;
    let deleteReason = "";

    if (submission.owner === username) {
      canDelete = true;
      deleteReason = "submission owner";
    } else {
      // Check if user is the competition owner
      const competition = await ValidCompetition.findOne({ 
        competitionId: submission.competitionId 
      });
      
      if (competition && competition.owner === username) {
        canDelete = true;
        deleteReason = "competition owner";
      }
    }

    if (!canDelete) {
      res.status(403).json({ 
        error: "You can only delete your own submissions or submissions from competitions you own" 
      });
      return;
    }

    // Delete the submission
    await Submission.findByIdAndDelete(submissionId);

    // Publish submission deleted event
    try {
      await eventService.publishSubmissionDeleted({
        submission: {
          _id: submission._id.toString(),
          competitionId: submission.competitionId,
          owner: submission.owner,
          deletedAt: new Date(),
        }
      });
    } catch (error) {
      console.error('Failed to publish submission deleted event:', error);
      // Continue with response - don't fail the deletion
    }

    res.status(200).json({
      message: "Submission deleted successfully",
      submission: {
        id: submission._id,
        competitionId: submission.competitionId,
        owner: submission.owner,
        deletedBy: username,
        deleteReason: deleteReason,
        deletedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("Error deleting submission:", error);
    res.status(500).json({ error: "Failed to delete submission" });
  }
};
