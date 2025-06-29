import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Photo Competition Platform API Gateway',
      version: '1.0.0',
      description: 'Unified API Gateway for the Photo Competition Platform microservices',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'API Gateway',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'External JWT token for API access',
        },
      },
      schemas: {
        // User schemas
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            username: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        UserInput: {
          type: 'object',
          required: ['username', 'password'],
          properties: {
            username: { type: 'string', minLength: 3, maxLength: 50 },
            password: { type: 'string', minLength: 6 },
          },
        },
        LoginResponse: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            token: { type: 'string' },
            user: {
              type: 'object',
              properties: {
                username: { type: 'string' },
              },
            },
          },
        },
        // Competition schemas
        Competition: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            targetImage: { type: 'string' },
            owner: { type: 'string' },
            endDate: { type: 'string', format: 'date-time' },
            isActive: { type: 'boolean' },
            winnerId: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        CompetitionInput: {
          type: 'object',
          required: ['title', 'description', 'endDate'],
          properties: {
            title: { type: 'string', minLength: 1, maxLength: 100 },
            description: { type: 'string', minLength: 1, maxLength: 500 },
            endDate: { type: 'string', format: 'date-time' },
            targetImageBase64: { type: 'string' },
          },
        },
        // Submission schemas
        Submission: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            competitionId: { type: 'string' },
            submissionData: { type: 'string' },
            owner: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        SubmissionInput: {
          type: 'object',
          required: ['competitionId'],
          properties: {
            competitionId: { type: 'string' },
            submissionData: { type: 'string' },
          },
        },
        // Common schemas
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            detail: { type: 'string' },
          },
        },
        HealthCheck: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' },
            services: {
              type: 'object',
              properties: {
                total: { type: 'integer' },
                healthy: { type: 'integer' },
                degraded: { type: 'integer' },
              },
            },
          },
        },
        LoadBalancerStats: {
          type: 'object',
          properties: {
            timestamp: { type: 'string', format: 'date-time' },
            loadBalancer: { type: 'object' },
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
  apis: ['./src/index.ts'], // paths to files containing OpenAPI definitions
};

export const specs = swaggerJsdoc(options);
export { swaggerUi };
