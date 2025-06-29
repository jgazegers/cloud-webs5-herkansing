import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Submission Service API',
      version: '1.0.0',
      description: 'API for managing photo competition submissions',
    },
    servers: [
      {
        url: 'http://localhost:3003',
        description: 'Development server',
      },
      {
        url: 'http://localhost:3000/api/submissions',
        description: 'Via API Gateway',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Submission: {
          type: 'object',
          required: ['competitionId', 'submissionData', 'owner'],
          properties: {
            _id: {
              type: 'string',
              description: 'Submission ID',
            },
            competitionId: {
              type: 'string',
              description: 'ID of the competition this submission belongs to',
            },
            submissionData: {
              type: 'string',
              description: 'Base64 encoded submission image',
            },
            owner: {
              type: 'string',
              description: 'Username of submission owner',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp',
            },
          },
        },
        SubmissionInput: {
          type: 'object',
          required: ['competitionId'],
          properties: {
            competitionId: {
              type: 'string',
              description: 'ID of the competition',
            },
            submissionData: {
              type: 'string',
              description: 'Base64 encoded submission image (alternative to file upload)',
            },
          },
        },
        SubmissionListResponse: {
          type: 'object',
          properties: {
            totalSubmissions: {
              type: 'integer',
              description: 'Total number of submissions',
            },
            submissions: {
              type: 'array',
              items: {
                allOf: [
                  { $ref: '#/components/schemas/Submission' },
                  {
                    type: 'object',
                    properties: {
                      imageInfo: {
                        type: 'object',
                        properties: {
                          type: { type: 'string' },
                          size: { type: 'number' },
                        },
                      },
                    },
                  },
                ],
              },
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
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'], // paths to files containing OpenAPI definitions
};

export const specs = swaggerJsdoc(options);
export { swaggerUi };
