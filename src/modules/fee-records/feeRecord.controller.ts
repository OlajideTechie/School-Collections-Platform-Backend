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
};
