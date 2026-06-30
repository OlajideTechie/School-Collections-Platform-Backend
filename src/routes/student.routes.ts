import { Router } from 'express';
import { studentController } from '../modules/students/student.controller';

const studentRouter = Router();

/**
 * @openapi
 * /students:
 *   get:
 *     tags:
 *       - Students
 *     summary: Get student records
 *     parameters:
 *       - in: query
 *         name: schoolId
 *         schema:
 *           type: string
 *         required: false
 *         description: Filter students by school ID.
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - schoolId
 *               - firstName
 *               - lastName
 *               - parentName
 *               - parentPhone
 *             properties:
 *               schoolId:
 *                 type: string
 *                 description: The ID of the school the student belongs to.
 *                 example: "clx000000000000000000000"
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
 *                 example: "+1234567890"
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
