import path from 'path';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const isProduction = process.env.NODE_ENV === 'production';
const baseDir = process.cwd();
const normalizeGlob = (filePath: string) => filePath.replace(/\\/g, '/');
const apiFiles = isProduction
  ? [
      normalizeGlob(path.resolve(baseDir, 'dist', 'routes', '**', '*.js')),
      normalizeGlob(path.resolve(baseDir, 'dist', 'server.js')),
    ]
  : [
      normalizeGlob(path.resolve(baseDir, 'src', 'routes', '**', '*.ts')),
      normalizeGlob(path.resolve(baseDir, 'src', 'server.ts')),
    ];

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
        url: process.env.API_URL || 'http://localhost:5000',
        description: isProduction
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
        SchoolInput: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Name of the school.' },
            email: { type: 'string', format: 'email', nullable: true, description: 'Contact email for the school.' },
            phone: { type: 'string', nullable: true, description: 'Contact phone number for the school.' },
            password: { type: 'string', description: 'Password for school login.' },
          },
          required: ['name', 'password'],
        },
        SchoolLoginInput: {
          type: 'object',
          properties: {
            email: { type: 'string', format: 'email', description: 'School login email.' },
            password: { type: 'string', description: 'Password for school login.' },
          },
          required: ['email', 'password'],
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
        PaymentSummary: {
          type: 'object',
          properties: {
            totalAmount: { type: 'number' },
            amountPaid: { type: 'number' },
            outstandingBalance: { type: 'number' },
            installmentsPaid: { type: 'integer' },
            installmentsPending: { type: 'integer' },
          },
        },
        FeeRecord: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            totalAmount: { type: 'number' },
            installmentCount: { type: 'integer' },
            startDate: { type: 'string', format: 'date-time', nullable: true },
            dueDate: { type: 'string', format: 'date-time', nullable: true },
            status: { type: 'string', enum: ['PENDING','PARTIALLY_PAID','PAID','OVERDUE'] },
            paymentSummary: { $ref: '#/components/schemas/PaymentSummary' },
            paymentLinks: { type: 'object', nullable: true },
            student: { $ref: '#/components/schemas/Student' },
            installments: {
              type: 'array',
              items: { $ref: '#/components/schemas/Installment' },
            },
          },
        },
        Installment: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            sequence: { type: 'integer' },
            amount: { type: 'number' },
            dueDate: { type: 'string', format: 'date-time' },
            status: { type: 'string', enum: ['PENDING', 'PAID', 'OVERDUE'] },
            paymentLink: { type: 'string', nullable: true },
          },
        },
      },
    },
  },
  // Paths to files containing OpenAPI definitions (JSDoc comments)
  apis: apiFiles,
};

const swaggerSpec = swaggerJsdoc(options);

export const setupSwagger = (app: Express) => {
   const swaggerUrl = `${process.env.API_URL || "http://localhost:5000"}/api-docs`;
   app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
   console.log(`Swagger documentation available at ${swaggerUrl}`);
};

export default swaggerSpec;