import { Request, Response } from "express";
import { Competition } from "../models/Competition";
import { getImageInfo } from "../utils/imageUtils";

export const getCompetitionById = async (req: Request, res: Response) => {
  try {
    const { competitionId } = req.params;

    const competition = await Competition.findById(competitionId).select(
      "-__v"
    );

    if (!competition) {
      console.log(`⚠️  Get competition failed - Competition not found: ${competitionId}`);
      res.status(404).json({ error: "Competition not found" });
      return;
    }

    // Get image info
    const imageInfo = getImageInfo(competition.targetImage);

    console.log(`✅ Competition retrieved successfully: ${competition.title} (ID: ${competitionId})`);
    res.status(200).json({
      ...competition.toObject(),
      targetImageInfo: imageInfo || { type: "unknown", size: 0 },
    });
  } catch (error) {
    console.error("❌ Error retrieving competition:", error);
    res.status(500).json({ error: "Failed to retrieve competition" });
  }
};
