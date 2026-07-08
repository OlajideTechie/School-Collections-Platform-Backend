import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { paymentService } from './payment.service';

export const paymentController = {
  async generateVirtualAccount(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const schoolId = req.school?.id;
      if (!schoolId) {
        res.status(401).json({ success: false, message: 'Unauthorized.' });
        return;
      }

      const installmentIdParam = req.params.installmentId;
      const installmentId = Array.isArray(installmentIdParam) ? installmentIdParam[0] : installmentIdParam;

      const result = await paymentService.generateInstallmentVirtualAccount(installmentId, schoolId);

      res.status(201).json({ success: true, data: result });
    } catch (error: unknown) {
      if (error instanceof Error && error.message === 'Installment not found.') {
        res.status(404).json({ success: false, message: error.message });
        return;
      }

      if (error instanceof Error && (error.message === 'Installment does not belong to the authenticated school.' || error.message === 'Installment already paid.' || error.message === 'Customer email is required.' || error.message === 'Customer phone is required.')) {
        res.status(400).json({ success: false, message: error.message });
        return;
      }

      console.error('Error generating virtual account:', error);
      res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  },

  async getInstallmentPaymentHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const schoolId = req.school?.id;
      if (!schoolId) {
        res.status(401).json({ success: false, message: 'Unauthorized.' });
        return;
      }

      const installmentIdParam = req.params.installmentId;
      const installmentId = Array.isArray(installmentIdParam) ? installmentIdParam[0] : installmentIdParam;
      const history = await paymentService.getInstallmentPaymentHistory(installmentId, schoolId);

      res.status(200).json({ success: true, data: history });
    } catch (error: unknown) {
      if (error instanceof Error && error.message === 'Installment not found.') {
        res.status(404).json({ success: false, message: error.message });
        return;
      }

      if (error instanceof Error && error.message === 'Installment does not belong to the authenticated school.') {
        res.status(400).json({ success: false, message: error.message });
        return;
      }

      console.error('Error fetching payment history:', error);
      res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  },

  async verifyAlatpayTransaction(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const schoolId = req.school?.id;
      if (!schoolId) {
        res.status(401).json({ success: false, message: 'Unauthorized.' });
        return;
      }

      const transactionReferenceParam = req.params.transactionReference;
      const transactionReference = Array.isArray(transactionReferenceParam) ? transactionReferenceParam[0] : transactionReferenceParam;
      const result = await paymentService.verifyAlatpayTransaction(transactionReference, schoolId);

      res.status(200).json({ success: true, data: result });
    } catch (error: unknown) {
      if (error instanceof Error && error.message === 'Payment not found.') {
        res.status(404).json({ success: false, message: error.message });
        return;
      }

      if (error instanceof Error && (error.message === 'Payment does not belong to the authenticated school.' || error.message === 'Transaction reference is required.')) {
        res.status(400).json({ success: false, message: error.message });
        return;
      }

      console.error('Error verifying ALATPay transaction:', error);
      res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  },
};
