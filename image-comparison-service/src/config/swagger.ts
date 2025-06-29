import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Image Comparison Service API',
      version: '1.0.0',
      description: 'Internal API for image comparison and similarity analysis',
    },
    servers: [
      {
        url: 'http://localhost:3004',
        description: 'Development server',
      },
    ],
    components: {
      schemas: {
        ComparisonResult: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'Comparison result ID',
            },
            competitionId: {
              type: 'string',
              description: 'Competition ID',
            },
            submissionId: {
              type: 'string',
              description: 'Submission ID',
            },
            similarity: {
              type: 'number',
              minimum: 0,
              maximum: 1,
              description: 'Similarity score between 0 and 1',
            },
            tags: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  confidence: { type: 'number' },
                },
              },
              description: 'Image analysis tags',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Analysis timestamp',
            },
          },
        },
        ComparisonStats: {
          type: 'object',
          properties: {
            totalComparisons: {
              type: 'integer',
              description: 'Total number of comparisons performed',
            },
            averageSimilarity: {
              type: 'number',
              description: 'Average similarity score',
            },
            highestSimilarity: {
              type: 'number',
              description: 'Highest similarity score recorded',
            },
            lowestSimilarity: {
              type: 'number',
              description: 'Lowest similarity score recorded',
            },
            totalCompetitions: {
              type: 'integer',
              description: 'Number of competitions analyzed',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Statistics generation timestamp',
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message',
            },
          },
        },
        HealthCheck: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['healthy'],
            },
            service: {
              type: 'string',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
      },
    },
  },
  apis: ['./src/index.ts'], // paths to files containing OpenAPI definitions
};

export const specs = swaggerJsdoc(options);
export { swaggerUi };
