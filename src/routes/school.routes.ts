import { Router } from 'express';
import { authenticateSchool } from '../middleware/auth.middleware';
import { schoolController } from '../modules/schools/school.controller';

const schoolRouter = Router();

/**
 * @openapi
 * /schools:
 *   post:
 *     tags:
 *       - Schools
 *     summary: Register a new school
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SchoolInput'
 *     responses:
 *       201:
 *         description: School registered successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/School'
 *       400:
 *         description: Invalid input data.
 *       500:
 *         description: Server error.
 */
schoolRouter.post('/', schoolController.registerSchool);

/**
 * @openapi
 * /schools/login:
 *   post:
 *     tags:
 *       - Schools
 *     summary: Login as a school
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SchoolLoginInput'
 *     responses:
 *       200:
 *         description: School logged in successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                     school:
 *                       $ref: '#/components/schemas/School'
 *       400:
 *         description: Invalid input data.
 *       401:
 *         description: Invalid credentials.
 *       500:
 *         description: Server error.
 */
schoolRouter.post('/login', schoolController.loginSchool);

/**
 * @openapi
 * /schools/logout:
 *   post:
 *     tags:
 *       - Schools
 *     summary: Logout the current school session
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: School logged out successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized.
 *       500:
 *         description: Server error.
 */
schoolRouter.post('/logout', authenticateSchool, schoolController.logoutSchool);

// Admin-only endpoint; commented out until admin auth is implemented.
// schoolRouter.get('/:id', schoolController.getSchoolById);

export default schoolRouter;
