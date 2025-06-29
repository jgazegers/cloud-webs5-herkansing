import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Winner Service API',
      version: '1.0.0',
      description: 'Internal API for winner selection and statistics',
    },
    servers: [
      {
        url: 'http://localhost:3005',
        description: 'Development server',
      },
    ],
    components: {
      schemas: {
        WinnerStats: {
          type: 'object',
          properties: {
            totalCompetitions: {
              type: 'integer',
              description: 'Total number of competitions processed',
            },
            completedCompetitions: {
              type: 'integer',
              description: 'Number of competitions with winners selected',
            },
            totalSubmissions: {
              type: 'integer',
              description: 'Total number of submissions processed',
            },
            averageSubmissionsPerCompetition: {
              type: 'number',
              description: 'Average submissions per competition',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Statistics generation timestamp',
            },
          },
        },
        TriggerResponse: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Response message',
            },
            competitionId: {
              type: 'string',
              description: 'Competition ID (for specific triggers)',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Trigger timestamp',
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
  apis: ['./src/server.ts'], // paths to files containing OpenAPI definitions
};

export const specs = swaggerJsdoc(options);
export { swaggerUi };
