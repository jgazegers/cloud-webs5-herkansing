import express from "express";
import { authenticateInternalToken, upload } from "../middleware";
import {
  createSubmission,
  deleteSubmission,
  getSubmissionsByCompetition,
  getSubmissionById,
  getUserSubmissions
} from "../controllers";

/**
 * @swagger
 * tags:
 *   name: Submissions
 *   description: Submission management API
 */

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthCheck'
 */

/**
 * @swagger
 * /:
 *   post:
 *     summary: Create a new submission
 *     tags: [Submissions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - competitionId
 *             properties:
 *               competitionId:
 *                 type: string
 *                 description: ID of the competition
 *               submissionData:
 *                 type: string
 *                 format: binary
 *                 description: Submission image file
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SubmissionInput'
 *     responses:
 *       201:
 *         description: Submission created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Submission'
 *       400:
 *         description: Invalid input or competition not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *       409:
 *         description: Duplicate submission
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /competition/{competitionId}:
 *   get:
 *     summary: Get submissions for a competition
 *     tags: [Submissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: competitionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Competition ID
 *     responses:
 *       200:
 *         description: List of submissions for the competition
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SubmissionListResponse'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /user/my-submissions:
 *   get:
 *     summary: Get current user's submissions
 *     tags: [Submissions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user's submissions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SubmissionListResponse'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /{submissionId}:
 *   get:
 *     summary: Get submission by ID
 *     tags: [Submissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: submissionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Submission ID
 *     responses:
 *       200:
 *         description: Submission details with full image data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Submission'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Submission not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /{submissionId}:
 *   delete:
 *     summary: Delete a submission
 *     tags: [Submissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: submissionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Submission ID
 *     responses:
 *       200:
 *         description: Submission deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not authorized to delete this submission
 *       404:
 *         description: Submission not found
 *       500:
 *         description: Server error
 */

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
