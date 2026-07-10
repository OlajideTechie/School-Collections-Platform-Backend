import { Router } from 'express';
import { alatpayWebhookController } from '../modules/webhooks/alatpayWebhook.controller';

const router = Router();

// /**
//  * @openapi
//  * /webhooks/alatpay:
//  *   post:
//  *     tags:
//  *       - Webhooks
//  *     summary: Receive ALATPay payment webhook notifications
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             type: object
//  *     responses:
//  *       200:
//  *         description: Webhook processed successfully.
//  *       401:
//  *         description: Invalid webhook signature.
//  *       400:
//  *         description: Missing transaction reference.
//  */
router.post('/alatpay', alatpayWebhookController.handleWebhook);

export default router;
