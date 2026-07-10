import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { paymentService } from './payment.service';
import { buildPaginationMeta, parsePagination } from '../../utils/pagination';
import { PaymentStatus } from '@prisma/client';

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
      const pagination = parsePagination({
        page: req.query.page,
        limit: req.query.limit,
      });

      const history = await paymentService.getInstallmentPaymentHistory(installmentId, schoolId, {
        skip: pagination.skip,
        limit: pagination.limit,
      });

      res.status(200).json({
        success: true,
        data: history.data,
        pagination: buildPaginationMeta(pagination, history.total),
      });
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

  async getPayments(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const schoolId = req.school?.id;
      if (!schoolId) {
        res.status(401).json({ success: false, message: 'Unauthorized.' });
        return;
      }

      const pagination = parsePagination({
        page: req.query.page,
        limit: req.query.limit,
      });

      const statusQuery = Array.isArray(req.query.status)
        ? req.query.status[0]
        : req.query.status;

      const status =
        typeof statusQuery === 'string' &&
        ['PENDING', 'SUCCESS', 'FAILED'].includes(statusQuery)
          ? (statusQuery as PaymentStatus)
          : undefined;

      const payments = await paymentService.getPaymentsPaginated(schoolId, {
        skip: pagination.skip,
        limit: pagination.limit,
        status,
      });

      res.status(200).json({
        success: true,
        data: payments.data,
        pagination: buildPaginationMeta(pagination, payments.total),
      });
    } catch (error: unknown) {
      console.error('Error fetching payments:', error);
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
