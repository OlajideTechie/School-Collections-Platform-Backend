import { Router } from 'express';
import { authenticateSchool } from '../middleware/auth.middleware';
import { paymentController } from '../modules/payments/payment.controller';

const router = Router();

/**
 * Manual virtual-account generation is intentionally disabled.
 * Virtual accounts are generated automatically by background jobs.
 */

/**
 * @openapi
 * /payments:
 *   get:
 *     tags:
 *       - Payments
 *     summary: Retrieve all payments for the authenticated school
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: page
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *       - name: limit
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *       - name: status
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *           enum: [PENDING, SUCCESS, FAILED]
 *     responses:
 *       200:
 *         description: Payment list returned successfully.
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
 *                       installmentId:
 *                         type: string
 *                       installmentSequence:
 *                         type: integer
 *                       reference:
 *                         type: string
 *                       transactionReference:
 *                         type: string
 *                       amount:
 *                         type: number
 *                       status:
 *                         type: string
 *                       paidAt:
 *                         type: string
 *                         format: date-time
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     hasNextPage:
 *                       type: boolean
 *                     hasPreviousPage:
 *                       type: boolean
 */
router.get('/', authenticateSchool, paymentController.getPayments);

// /**
//  * @openapi
//  * /payments/transactions/{transactionReference}/verify:
//  *   post:
//  *     tags:
//  *       - Payments
//  *     summary: Verify an ALATPay bank transfer transaction and sync local payment status
//  *     security:
//  *       - bearerAuth: []
//  *     parameters:
//  *       - name: transactionReference
//  *         in: path
//  *         required: true
//  *         schema:
//  *           type: string
//  *     responses:
//  *       200:
//  *         description: Transaction status verified and local records synced.
//  *       400:
//  *         description: Invalid request or payment cannot be verified.
//  *       401:
//  *         description: Unauthorized.
//  *       404:
//  *         description: Payment not found.
//  */
router.post('/transactions/:transactionReference/verify', authenticateSchool, paymentController.verifyAlatpayTransaction);

/**
 * @openapi
 * /payments/installments/{installmentId}/history:
 *   get:
 *     tags:
 *       - Payments
 *     summary: Retrieve payment history for an installment
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: installmentId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *       - name: page
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *       - name: limit
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Payment history returned successfully.
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
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     hasNextPage:
 *                       type: boolean
 *                     hasPreviousPage:
 *                       type: boolean
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Installment not found.
 */
router.get('/installments/:installmentId/history', authenticateSchool, paymentController.getInstallmentPaymentHistory);

export default router;
