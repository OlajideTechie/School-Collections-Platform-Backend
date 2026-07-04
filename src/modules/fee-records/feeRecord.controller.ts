import { ZodError } from 'zod';
import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { createFeeRecordSchema } from '../../validation/feeRecord.validation';
import { feeRecordService } from './feeRecord.service';

export const feeRecordController = {
  async createFeeRecord(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const payload = createFeeRecordSchema.parse(req.body);
      const schoolId = req.school?.id;
      if (!schoolId) {
        res.status(401).json({ success: false, message: 'Unauthorized.' });
        return;
      }

      const feeRecord = await feeRecordService.createFeeRecord(payload, schoolId);

      res.status(201).json({ success: true, data: feeRecord });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        res.status(400).json({ success: false, errors: error.issues });
        return;
      }

      if (error instanceof Error && (error.message === 'Student not found.' || error.message === 'Student does not belong to the authenticated school.')) {
        res.status(400).json({ success: false, message: error.message });
        return;
      }

      console.error('Error creating fee record:', error);
      res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  },

  async getFeeRecords(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const schoolId = req.school?.id;
      if (!schoolId) {
        res.status(401).json({ success: false, message: 'Unauthorized.' });
        return;
      }

      const feeRecords = await feeRecordService.getFeeRecords(schoolId);

      res.status(200).json({ success: true, data: feeRecords });
    } catch (error: unknown) {
      console.error('Error fetching fee records:', error);
      res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  },

  async getFeeRecordById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const schoolId = req.school?.id;
      
      if (!schoolId) {
        res.status(401).json({ success: false, message: 'Unauthorized.' });
        return;
      }

      if (!id) {
        res.status(400).json({ success: false, message: 'Fee record ID is required.' });
        return;
      }

      const feeRecord = await feeRecordService.getFeeRecordById(id, schoolId);

      if (!feeRecord) {
        res.status(404).json({ success: false, message: 'Fee record not found.' });
        return;
      }

      res.status(200).json({ success: true, data: feeRecord });
    } catch (error: unknown) {
      console.error('Error fetching fee record:', error);
      res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  },

  async getInstallments(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const schoolId = req.school?.id;
      
      if (!schoolId) {
        res.status(401).json({ success: false, message: 'Unauthorized.' });
        return;
      }

      if (!id) {
        res.status(400).json({ success: false, message: 'Fee record ID is required.' });
        return;
      }

      const installments = await feeRecordService.getInstallments(id, schoolId);

      if (!installments) {
        res.status(404).json({ success: false, message: 'Fee record not found.' });
        return;
      }

      res.status(200).json({ success: true, data: installments });
    } catch (error: unknown) {
      console.error('Error fetching installments:', error);
      res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  },
};
