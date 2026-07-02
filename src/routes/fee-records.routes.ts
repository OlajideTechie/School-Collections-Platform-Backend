import { Router } from 'express';
import { authenticateSchool } from '../middleware/auth.middleware';
import { feeRecordController } from '../modules/fee-records/feeRecord.controller';

const router = Router();

/**
 * @openapi
 * /fee-records:
 *   post:
 *     tags:
 *       - FeeRecords
 *     summary: Create a new fee record (with generated installments)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - studentId
 *               - title
 *               - totalAmount
 *               - installmentCount
 *             properties:
 *               studentId:
 *                 type: string
 *               title:
 *                 type: string
 *               totalAmount:
 *                 type: number
 *               installmentCount:
 *                 type: integer
 *               collectionStartDate:
 *                 type: string
 *                 format: date
 *                 description: Start date for the first installment.
 *               collectionDueDate:
 *                 type: string
 *                 format: date
 *                 description: Due date for the last installment.
 *     responses:
 *       201:
 *         description: Fee record created with installments.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     title:
 *                       type: string
 *                     totalAmount:
 *                       type: number
 *                     installmentCount:
 *                       type: integer
 *                     startDate:
 *                       type: string
 *                       format: date-time
 *                     dueDate:
 *                       type: string
 *                       format: date-time
 *                     status:
 *                       type: string
 *                     paymentSummary:
 *                       type: object
 *                       properties:
 *                         totalAmount:
 *                           type: number
 *                         amountPaid:
 *                           type: number
 *                         outstandingBalance:
 *                           type: number
 *                         installmentsPaid:
 *                           type: integer
 *                         installmentsPending:
 *                           type: integer
 *                     paymentLinks:
 *                       nullable: true
 *                     student:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         firstName:
 *                           type: string
 *                         lastName:
 *                           type: string
 *                         parentName:
 *                           type: string
 *                         parentPhone:
 *                           type: string
 *                         parentEmail:
 *                           type: string
 *                     installments:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           sequence:
 *                             type: integer
 *                           amount:
 *                             type: number
 *                           dueDate:
 *                             type: string
 *                             format: date-time
 *                           status:
 *                             type: string
 *                           paymentLink:
 *                             nullable: true
 *       400:
 *         description: Invalid input or student mismatch.
 *       401:
 *         description: Unauthorized.
 */
router.post('/', authenticateSchool, feeRecordController.createFeeRecord);

export default router;
