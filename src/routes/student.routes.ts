import { Router } from 'express';
import { authenticateSchool } from '../middleware/auth.middleware';
import { studentController } from '../modules/students/student.controller';

const studentRouter = Router();
studentRouter.use(authenticateSchool);

/**
 * @openapi
 * /students:
 *   get:
 *     tags:
 *       - Students
 *     summary: Get student records for the logged-in school
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Students retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Student'
 *       400:
 *         description: Invalid query parameter.
 *       500:
 *         description: Server error.
 */
studentRouter.get('/', studentController.getStudents);

/**
 * @openapi
 * /students/{id}:
 *   get:
 *     tags:
 *       - Students
 *     summary: Get a student by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Student ID.
 *     responses:
 *       200:
 *         description: Student retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Student'
 *       404:
 *         description: Student not found.
 *       500:
 *         description: Server error.
 */
studentRouter.get('/:id', studentController.getStudentById);

/**
 * @openapi
 * /students:
 *   post:
 *     tags:
 *       - Students
 *     summary: Create a new student record
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - firstName
 *               - lastName
 *               - parentName
 *               - parentPhone
 *             properties:
 *               firstName:
 *                 type: string
 *                 description: Student's first name.
 *                 example: "Alice"
 *               lastName:
 *                 type: string
 *                 description: Student's last name.
 *                 example: "Smith"
 *               parentName:
 *                 type: string
 *                 description: Name of the student's parent/guardian.
 *                 example: "Robert Smith"
 *               parentPhone:
 *                 type: string
 *                 description: Phone number of the student's parent/guardian.
 *                 example: "08012345678"
 *               parentEmail:
 *                 type: string
 *                 format: email
 *                 description: Email address of the student's parent/guardian (optional).
 *                 example: "robert.smith@example.com"
 *     responses:
 *       201:
 *         description: Student created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Student'
 *       400:
 *         description: Invalid input data.
 *       500:
 *         description: Server error.
 */
studentRouter.post('/', studentController.createStudent);

export default studentRouter;
