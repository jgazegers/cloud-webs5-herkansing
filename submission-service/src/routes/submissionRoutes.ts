import express from "express";
import { authenticateInternalToken, upload } from "../middleware";
import {
  createSubmission,
  deleteSubmission,
  getSubmissionsByCompetition,
  getSubmissionById,
  getUserSubmissions
} from "../controllers";

const router = express.Router();

// POST endpoint to create a submission
router.post("/", authenticateInternalToken, upload.single('submissionData'), createSubmission);

// GET endpoint to retrieve submissions for a competition
router.get("/competition/:competitionId", authenticateInternalToken, getSubmissionsByCompetition);

// GET endpoint to retrieve user's own submissions (must come before /:submissionId)
router.get("/user/my-submissions", authenticateInternalToken, getUserSubmissions);

// GET endpoint to retrieve a specific submission with full image data
router.get("/:submissionId", authenticateInternalToken, getSubmissionById);

// DELETE endpoint to delete a submission (owner or competition owner only)
router.delete("/:submissionId", authenticateInternalToken, deleteSubmission);

export default router;
