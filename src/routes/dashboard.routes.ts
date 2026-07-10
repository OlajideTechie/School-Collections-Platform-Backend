import { Router } from 'express';
import { authenticateSchool } from '../middleware/auth.middleware';
import { dashboardController } from '../modules/dashboard/dashboard.controller';

const router = Router();

/**
 * @openapi
 * /dashboard:
 *   get:
 *     tags:
 *       - Dashboard
 *     summary: Retrieve dashboard summary metrics and recent payments for the authenticated school
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: recentLimit
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 20
 *         description: Number of recent payments to return. Defaults to 5.
 *     responses:
 *       200:
 *         description: Dashboard summary returned successfully.
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
 *                     totals:
 *                       type: object
 *                       properties:
 *                         totalCollected:
 *                           type: number
 *                         totalOutstandingBalance:
 *                           type: number
 *                         totalPartialPayments:
 *                           type: number
 *                           minimum: 0
 *                           maximum: 100
 *                           description: Percentage of fee records that are partially paid.
 *                         collectionRate:
 *                           type: number
 *                           minimum: 0
 *                           maximum: 100
 *                           description: Percentage of billed amount already collected.
 *                         overdueAmount:
 *                           type: number
 *                         dueSoonInstallmentsCount:
 *                           type: number
 *                           minimum: 0
 *                           maximum: 100
 *                           description: Percentage of unpaid installments due within the next 7 days.
 *                         pendingPaymentsCount:
 *                           type: number
 *                           minimum: 0
 *                           maximum: 100
 *                           description: Percentage of payments that are pending.
 *                     feeRecordStatusBreakdown:
 *                       type: object
 *                       description: Fee record status distribution, returned as percentages.
 *                       properties:
 *                         pending:
 *                           type: number
 *                           minimum: 0
 *                           maximum: 100
 *                         partiallyPaid:
 *                           type: number
 *                           minimum: 0
 *                           maximum: 100
 *                         paid:
 *                           type: number
 *                           minimum: 0
 *                           maximum: 100
 *                         overdue:
 *                           type: number
 *                           minimum: 0
 *                           maximum: 100
 *                     recentPayments:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           reference:
 *                             type: string
 *                           transactionReference:
 *                             type: string
 *                           amount:
 *                             type: number
 *                           status:
 *                             type: string
 *                           paidAt:
 *                             type: string
 *                             format: date-time
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *       401:
 *         description: Unauthorized.
 */
router.get('/', authenticateSchool, dashboardController.getOverview);

export default router;
