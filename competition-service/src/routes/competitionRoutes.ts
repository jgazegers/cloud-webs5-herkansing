import { Router } from "express";
import { 
  createCompetition, 
  getAllCompetitions, 
  getCompetitionById, 
  getCompetitionsByUser,
  stopCompetition,
  deleteCompetition 
} from "../controllers";
import { authenticateInternalToken } from "../middleware/auth";
import { upload } from "../middleware/upload";
import { MessageQueue } from "../messageQueue";

/**
 * @swagger
 * tags:
 *   name: Competitions
 *   description: Competition management API
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
 *     summary: Create a new competition
 *     tags: [Competitions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: Competition title
 *               description:
 *                 type: string
 *                 description: Competition description
 *               endDate:
 *                 type: string
 *                 format: date-time
 *                 description: Competition end date
 *               targetImage:
 *                 type: string
 *                 format: binary
 *                 description: Target image file
 *               targetImageBase64:
 *                 type: string
 *                 description: Base64 encoded target image (alternative to file)
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CompetitionInput'
 *     responses:
 *       201:
 *         description: Competition created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Competition'
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /:
 *   get:
 *     summary: Get all competitions
 *     tags: [Competitions]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of competitions to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Number of competitions to skip
 *     responses:
 *       200:
 *         description: List of competitions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalCompetitions:
 *                   type: integer
 *                 competitions:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Competition'
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /{competitionId}:
 *   get:
 *     summary: Get competition by ID
 *     tags: [Competitions]
 *     parameters:
 *       - in: path
 *         name: competitionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Competition ID
 *     responses:
 *       200:
 *         description: Competition details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Competition'
 *       404:
 *         description: Competition not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /user/{username}:
 *   get:
 *     summary: Get competitions by user
 *     tags: [Competitions]
 *     parameters:
 *       - in: path
 *         name: username
 *         required: true
 *         schema:
 *           type: string
 *         description: Username
 *     responses:
 *       200:
 *         description: User's competitions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalCompetitions:
 *                   type: integer
 *                 competitions:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Competition'
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /{competitionId}/stop:
 *   patch:
 *     summary: Stop a competition
 *     tags: [Competitions]
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
 *         description: Competition stopped successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Competition'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not the competition owner
 *       404:
 *         description: Competition not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /{competitionId}:
 *   delete:
 *     summary: Delete a competition
 *     tags: [Competitions]
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
 *         description: Competition deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not the competition owner
 *       404:
 *         description: Competition not found
 *       500:
 *         description: Server error
 */

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

  // Delete competition - requires authentication (owner only)
  router.delete(
    "/:competitionId",
    authenticateInternalToken,
    deleteCompetition(messageQueue)
  );

  return router;
}
