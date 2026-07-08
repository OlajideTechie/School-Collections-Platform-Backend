import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { alatpayService } from '../../integrations/alatpay/alatpay.service';
import { paymentService } from '../payments/payment.service';

// Controller to handle ALATPay webhook notifications idempotently
export const alatpayWebhookController = {
  async handleWebhook(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const rawBodyBuffer = (req as AuthenticatedRequest & { rawBody?: Buffer }).rawBody;
      const rawBody = Buffer.isBuffer(rawBodyBuffer) ? rawBodyBuffer.toString('utf8') : JSON.stringify(req.body || {});
      const signature =
        req.get('x-alatpay-signature') ||
        req.get('alatpay-signature') ||
        req.get('x-wema-signature') ||
        req.get('x-signature') ||
        req.get('signature');

      if (!alatpayService.verifySignature(rawBody, signature)) {
        res.status(401).json({ success: false, message: 'Invalid webhook signature.' });
        return;
      }

      const result = await paymentService.handleAlatpayWebhook(req.body);

      res.status(200).json({ success: true, data: result });
    } catch (error: unknown) {
      if (error instanceof Error && error.message === 'Missing transaction reference.') {
        res.status(400).json({ success: false, message: error.message });
        return;
      }

      if (error instanceof Error && error.message === 'Payment not found.') {
        res.status(404).json({ success: false, message: error.message });
        return;
      }

      console.error('Error handling ALATPay webhook:', error);
      res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  },
};
