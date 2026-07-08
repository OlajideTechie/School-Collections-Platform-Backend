import { Router } from 'express';
import { authenticateSchool } from '../middleware/auth.middleware';
import { paymentController } from '../modules/payments/payment.controller';

const router = Router();

/**
 * @openapi
 * /payments/installments/{installmentId}/virtual-account:
 *   post:
 *     tags:
 *       - Payments
 *     summary: Generate an ALATPay virtual account for a specific installment
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: installmentId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Virtual account created successfully.
 *       400:
 *         description: Invalid request or installment already paid.
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Installment not found.
 */
router.post('/installments/:installmentId/virtual-account', authenticateSchool, paymentController.generateVirtualAccount);

/**
 * @openapi-disabled
 * /payments/transactions/{transactionReference}/verify:
 *   post:
 *     tags:
 *       - Payments
 *     summary: Verify an ALATPay bank transfer transaction and sync local payment status
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: transactionReference
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Transaction status verified and local records synced.
 *       400:
 *         description: Invalid request or payment cannot be verified.
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Payment not found.
 */
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
 *     responses:
 *       200:
 *         description: Payment history returned successfully.
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Installment not found.
 */
router.get('/installments/:installmentId/history', authenticateSchool, paymentController.getInstallmentPaymentHistory);

export default router;
