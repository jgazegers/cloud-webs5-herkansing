import { Router } from "express";
import { 
  createCompetition, 
  getAllCompetitions, 
  getCompetitionById, 
  getCompetitionsByUser,
  stopCompetition 
} from "../controllers";
import { authenticateInternalToken } from "../middleware/auth";
import { upload } from "../middleware/upload";
import { MessageQueue } from "../messageQueue";

export function createCompetitionRoutes(messageQueue: MessageQueue): Router {
  const router = Router();

  // Create competition - requires authentication and optional file upload
  router.post(
    "/",
    authenticateInternalToken,
    upload.single("targetImage"),
    createCompetition(messageQueue)
  );

  // Get all competitions
  router.get("/", getAllCompetitions);

  // Get specific competition by ID
  router.get("/:competitionId", getCompetitionById);

  // Get competitions by user
  router.get("/user/:username", getCompetitionsByUser);

  // Stop competition - requires authentication (owner only)
  router.patch(
    "/:competitionId/stop",
    authenticateInternalToken,
    stopCompetition(messageQueue)
  );

  return router;
}
