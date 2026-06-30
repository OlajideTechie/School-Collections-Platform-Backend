import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ScholarPay Collections Platform API',
      version: '1.0.0',
      description: 'REST API for managing school fees collections, student records, and automated notifications.',
    },
    servers: [
      {
        url: 'process.env.API_URL || http://localhost:5000',
        description: process.env.NODE_ENV === 'production'
         ? 'Production server' 
         : 'Development server',
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
        School: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string', nullable: true },
            phone: { type: 'string', nullable: true },
          },
        },
        Student: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            schoolId: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            parentName: { type: 'string' },
            parentPhone: { type: 'string' },
            parentEmail: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        StudentInput: { // Schema for request body
          type: 'object',
          properties: {
            schoolId: { type: 'string', description: 'The ID of the school the student belongs to.' },
            firstName: { type: 'string', description: 'Student\'s first name.' },
            lastName: { type: 'string', description: 'Student\'s last name.' },
            parentName: { type: 'string', description: 'Name of the student\'s parent/guardian.' },
            parentPhone: { type: 'string', description: 'Phone number of the student\'s parent/guardian.' },
            parentEmail: { type: 'string', format: 'email', description: 'Email address of the student\'s parent/guardian (optional).', nullable: true },
          },
        },
        CollectionPlan: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            studentId: { type: 'string' },
            title: { type: 'string' },
            totalAmount: { type: 'number' },
            installmentCount: { type: 'integer' },
          },
        },
        Installment: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            amount: { type: 'number' },
            dueDate: { type: 'string', format: 'date-time' },
            status: { type: 'string', enum: ['PENDING', 'PAID', 'OVERDUE'] },
          },
        },
      },
    },
  },
  // Paths to files containing OpenAPI definitions (JSDoc comments)
  apis: ['./src/routes/*.ts', './src/server.ts'],
};

const swaggerSpec = swaggerJsdoc(options);

export const setupSwagger = (app: Express) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  console.log('Swagger documentation available at http://localhost:5000/api-docs');
};

export default swaggerSpec;