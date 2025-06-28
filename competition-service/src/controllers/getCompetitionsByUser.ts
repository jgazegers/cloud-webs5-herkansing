import { Request, Response } from "express";
import { Competition } from "../models/Competition";
import { getImageInfo } from "../utils/imageUtils";

export const getCompetitionsByUser = async (req: Request, res: Response) => {
  try {
    const { username } = req.params;

    const competitions = await Competition.find({ owner: username })
      .select("-__v")
      .sort({ createdAt: -1 });

    res.status(200).json({
      owner: username,
      totalCompetitions: competitions.length,
      competitions: competitions.map((competition) => {
        const imageInfo = getImageInfo(competition.targetImage);
        return {
          ...competition.toObject(),
          // Truncate base64 image data in list view
          targetImage:
            competition.targetImage.substring(0, 100) + "...[truncated]",
          targetImageInfo: imageInfo || { type: "unknown", size: 0 },
        };
      }),
    });
  } catch (error) {
    console.error("Error retrieving user competitions:", error);
    res.status(500).json({ error: "Failed to retrieve user competitions" });
  }
};
