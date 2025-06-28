import { Request, Response } from "express";
import { Competition } from "../models/Competition";
import { MessageQueue, CompetitionStoppedEvent } from "../messageQueue";

export const stopCompetition = (messageQueue: MessageQueue) => {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const { competitionId } = req.params;
      const username = (req as any).username;

      if (!username) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }

      // Find the competition
      const competition = await Competition.findById(competitionId);
      if (!competition) {
        res.status(404).json({ error: "Competition not found" });
        return;
      }

      // Check if user is the owner
      if (competition.owner !== username) {
        res.status(403).json({ error: "Only the competition owner can stop the competition" });
        return;
      }

      // Check if competition is already stopped or ended
      if (competition.status === 'stopped') {
        res.status(400).json({ error: "Competition is already stopped" });
        return;
      }

      if (competition.status === 'ended') {
        res.status(400).json({ error: "Competition has already ended" });
        return;
      }

      // Check if competition has a winner already
      if (competition.winnerSubmissionId) {
        res.status(400).json({ error: "Cannot stop competition - winner already selected" });
        return;
      }

      // Update competition status
      competition.status = 'stopped';
      competition.stoppedAt = new Date();
      await competition.save();

      // Publish competition stopped event
      const event: CompetitionStoppedEvent = {
        competitionId: (competition._id as any).toString(),
        title: competition.title,
        owner: competition.owner,
        stoppedAt: competition.stoppedAt!,
      };

      try {
        await messageQueue.publishCompetitionStopped(event);
      } catch (mqError) {
        console.error("Failed to publish competition stopped event:", mqError);
        console.log("🚨 Competition stopped but event not published. Manual intervention may be required.");
      }

      res.status(200).json({
        message: "Competition stopped successfully",
        competition: {
          id: competition._id,
          title: competition.title,
          status: competition.status,
          stoppedAt: competition.stoppedAt,
        },
      });
    } catch (error) {
      console.error("Error stopping competition:", error);
      res.status(500).json({ error: "Failed to stop competition" });
    }
  };
};
