import express from "express";
import { authenticateInternalToken, upload } from "../middleware";
import {
  createSubmission,
  getSubmissionsByCompetition,
  getSubmissionById,
  getUserSubmissions
} from "../controllers";

const router = express.Router();

// POST endpoint to create a submission
router.post("/", authenticateInternalToken, upload.single('submissionData'), createSubmission);

// GET endpoint to retrieve submissions for a competition
router.get("/competition/:competitionId", authenticateInternalToken, getSubmissionsByCompetition);

// GET endpoint to retrieve a specific submission with full image data
router.get("/:submissionId", authenticateInternalToken, getSubmissionById);

// GET endpoint to retrieve user's own submissions
router.get("/user/my-submissions", authenticateInternalToken, getUserSubmissions);

export default router;
