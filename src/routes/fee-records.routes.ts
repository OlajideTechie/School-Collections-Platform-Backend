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
 *                     virtualAccounts:
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
 *                           virtualAccount:
 *                             nullable: true
 *       400:
 *         description: Invalid input or student mismatch.
 *       401:
 *         description: Unauthorized.
 */
router.post('/', authenticateSchool, feeRecordController.createFeeRecord);

/**
 * @openapi
 * /fee-records:
 *   get:
 *     tags:
 *       - FeeRecords
 *     summary: Get all fee records for the authenticated school
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all fee records.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       title:
 *                         type: string
 *                       totalAmount:
 *                         type: number
 *                       installmentCount:
 *                         type: integer
 *                       startDate:
 *                         type: string
 *                         format: date-time
 *                       dueDate:
 *                         type: string
 *                         format: date-time
 *                       status:
 *                         type: string
 *                       student:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           firstName:
 *                             type: string
 *                           lastName:
 *                             type: string
 *                           parentName:
 *                             type: string
 *                           parentPhone:
 *                             type: string
 *                           parentEmail:
 *                             type: string
 *                       paymentSummary:
 *                         type: object
 *                         properties:
 *                           totalAmount:
 *                             type: number
 *                           amountPaid:
 *                             type: number
 *                           outstandingBalance:
 *                             type: number
 *                           installmentsPaid:
 *                             type: integer
 *                           installmentsPending:
 *                             type: integer
 *       401:
 *         description: Unauthorized.
 *       500:
 *         description: Internal server error.
 */
router.get('/', authenticateSchool, feeRecordController.getFeeRecords);

/**
 * @openapi
 * /fee-records/{id}:
 *   get:
 *     tags:
 *       - FeeRecords
 *     summary: Get a specific fee record by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Fee record ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Fee record details.
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
 *       400:
 *         description: Invalid input.
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Fee record not found.
 *       500:
 *         description: Internal server error.
 */
router.get('/:id', authenticateSchool, feeRecordController.getFeeRecordById);

/**
 * @openapi
 * /fee-records/{id}/installments:
 *   get:
 *     tags:
 *       - FeeRecords
 *     summary: Get all installments for a specific fee record
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Fee record ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of installments.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       sequence:
 *                         type: integer
 *                       amount:
 *                         type: number
 *                       dueDate:
 *                         type: string
 *                         format: date-time
 *                       status:
 *                         type: string
 *                       payments:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                             reference:
 *                               type: string
 *                             transactionReference:
 *                               type: string
 *                             amount:
 *                               type: number
 *                             status:
 *                               type: string
 *                             paidAt:
 *                               type: string
 *                               format: date-time
 *                             createdAt:
 *                               type: string
 *                               format: date-time
 *       400:
 *         description: Invalid input.
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Fee record not found.
 *       500:
 *         description: Internal server error.
 */
router.get('/:id/installments', authenticateSchool, feeRecordController.getInstallments);

export default router;
