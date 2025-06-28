import { Request, Response } from "express";
import { Competition } from "../models/Competition";
import { getImageInfo } from "../utils/imageUtils";

export const getAllCompetitions = async (req: Request, res: Response) => {
  try {
    // Build filter object based on query parameters
    const filter: any = {};

    // Filter by location name (case-insensitive partial match)
    if (req.query.location) {
      filter["location.name"] = { 
        $regex: req.query.location as string, 
        $options: "i" 
      };
    }

    // Filter by owner (exact match)
    if (req.query.owner) {
      filter.owner = req.query.owner as string;
    }

    // Filter by date range
    if (req.query.status) {
      const now = new Date();
      const status = req.query.status as string;
      
      switch (status) {
        case "active":
          // Competitions that are currently running
          filter.startDate = { $lte: now };
          filter.endDate = { $gte: now };
          break;
        case "upcoming":
          // Competitions that haven't started yet
          filter.startDate = { $gt: now };
          break;
        case "ended":
          // Competitions that have ended
          filter.endDate = { $lt: now };
          break;
      }
    }

    // Custom date range filtering
    if (req.query.startAfter || req.query.endBefore) {
      if (req.query.startAfter) {
        filter.startDate = { 
          ...filter.startDate,
          $gte: new Date(req.query.startAfter as string) 
        };
      }
      if (req.query.endBefore) {
        filter.endDate = { 
          ...filter.endDate,
          $lte: new Date(req.query.endBefore as string) 
        };
      }
    }

    const competitions = await Competition.find(filter)
      .select("-__v")
      .sort({ createdAt: -1 });

    res.status(200).json({
      totalCompetitions: competitions.length,
      appliedFilters: {
        location: req.query.location || null,
        owner: req.query.owner || null,
        status: req.query.status || null,
        startAfter: req.query.startAfter || null,
        endBefore: req.query.endBefore || null,
      },
      competitions: competitions.map((competition) => {
        const imageInfo = getImageInfo(competition.targetImage);
        return {
          ...competition.toObject(),
          // Truncate base64 image data in list view for performance
          targetImage:
            competition.targetImage.substring(0, 100) + "...[truncated]",
          targetImageInfo: imageInfo || { type: "unknown", size: 0 },
          // Include winner information if available
          hasWinner: !!competition.winnerSubmissionId,
          winner: competition.winnerSubmissionId ? {
            submissionId: competition.winnerSubmissionId,
            score: competition.winnerScore,
            owner: competition.winnerOwner,
            selectedAt: competition.winnerSelectedAt
          } : null,
        };
      }),
    });
  } catch (error) {
    console.error("Error retrieving competitions:", error);
    res.status(500).json({ error: "Failed to retrieve competitions" });
  }
};
