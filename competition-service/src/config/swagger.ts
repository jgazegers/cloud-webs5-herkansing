import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Competition Service API',
      version: '1.0.0',
      description: 'API for managing photo competitions',
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development server',
      },
      {
        url: 'http://localhost:3000/api/competitions',
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
        Competition: {
          type: 'object',
          required: ['title', 'description', 'endDate', 'targetImage'],
          properties: {
            _id: {
              type: 'string',
              description: 'Competition ID',
            },
            title: {
              type: 'string',
              description: 'Competition title',
              minLength: 1,
              maxLength: 100,
            },
            description: {
              type: 'string',
              description: 'Competition description',
              minLength: 1,
              maxLength: 500,
            },
            targetImage: {
              type: 'string',
              description: 'Base64 encoded target image',
            },
            owner: {
              type: 'string',
              description: 'Username of competition owner',
            },
            endDate: {
              type: 'string',
              format: 'date-time',
              description: 'Competition end date',
            },
            isActive: {
              type: 'boolean',
              description: 'Whether competition is active',
              default: true,
            },
            winnerId: {
              type: 'string',
              description: 'ID of winning submission',
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
        CompetitionInput: {
          type: 'object',
          required: ['title', 'description', 'endDate'],
          properties: {
            title: {
              type: 'string',
              description: 'Competition title',
              minLength: 1,
              maxLength: 100,
            },
            description: {
              type: 'string',
              description: 'Competition description',
              minLength: 1,
              maxLength: 500,
            },
            endDate: {
              type: 'string',
              format: 'date-time',
              description: 'Competition end date (must be in the future)',
            },
            targetImageBase64: {
              type: 'string',
              description: 'Base64 encoded target image (alternative to file upload)',
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
