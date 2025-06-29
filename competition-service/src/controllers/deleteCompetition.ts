import { Request, Response } from "express";
import { Competition } from "../models/Competition";
import { MessageQueue, CompetitionDeletedEvent } from "../messageQueue";

export const deleteCompetition = (messageQueue: MessageQueue) => {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const { competitionId } = req.params;
      const username = (req as any).username;

      if (!username) {
        console.log(`⚠️  Delete competition failed - No authentication provided`);
        res.status(401).json({ error: "Authentication required" });
        return;
      }

      // Find the competition
      const competition = await Competition.findById(competitionId);
      if (!competition) {
        console.log(`⚠️  Delete competition failed - Competition not found: ${competitionId}`);
        res.status(404).json({ error: "Competition not found" });
        return;
      }

      // Check if user is the owner
      if (competition.owner !== username) {
        console.log(`⚠️  Delete competition failed - User ${username} is not the owner of competition ${competitionId} (owner: ${competition.owner})`);
        res.status(403).json({ error: "Only the competition owner can delete the competition" });
        return;
      }

      // Delete the competition
      await Competition.findByIdAndDelete(competitionId);

      // Publish competition deleted event
      const event: CompetitionDeletedEvent = {
        competitionId: (competition._id as any).toString(),
        title: competition.title,
        owner: competition.owner,
        deletedAt: new Date(),
      };

      try {
        await messageQueue.publishCompetitionDeleted(event);
        console.log(`✅ Competition deleted successfully: "${competition.title}" (ID: ${competition._id})`);
      } catch (mqError) {
        console.error("❌ Failed to publish competition deleted event:", mqError);
        console.log("🚨 Competition deleted but event not published. Manual intervention may be required.");
      }

      res.status(200).json({
        message: "Competition deleted successfully",
        competition: {
          id: competition._id,
          title: competition.title,
          owner: competition.owner,
          deletedAt: event.deletedAt,
        },
      });
    } catch (error) {
      console.error("❌ Error deleting competition:", error);
      res.status(500).json({ error: "Failed to delete competition" });
    }
  };
};
