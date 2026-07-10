import { ZodError } from 'zod';
import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { createFeeRecordSchema } from '../../validation/feeRecord.validation';
import { feeRecordService } from './feeRecord.service';
import { buildPaginationMeta, parsePagination } from '../../utils/pagination';
import { FeeRecordStatus } from '@prisma/client';

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

      const pagination = parsePagination({
        page: req.query.page,
        limit: req.query.limit,
      });

      const statusQuery = Array.isArray(req.query.status)
        ? req.query.status[0]
        : req.query.status;

      const allowedStatuses: FeeRecordStatus[] = [
        'PENDING',
        'PARTIALLY_PAID',
        'PAID',
        'OVERDUE',
      ];

      const status =
        typeof statusQuery === 'string' &&
        allowedStatuses.includes(statusQuery as FeeRecordStatus)
          ? (statusQuery as FeeRecordStatus)
          : undefined;

      const feeRecords = await feeRecordService.getFeeRecords(schoolId, {
        status,
        skip: pagination.skip,
        limit: pagination.limit,
      });

      res.status(200).json({
        success: true,
        data: feeRecords.data,
        summary: feeRecords.summary,
        pagination: buildPaginationMeta(pagination, feeRecords.total),
      });
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

      const feeRecord = await feeRecordService.getFeeRecordById(id as string, schoolId);

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

      const pagination = parsePagination({
        page: req.query.page,
        limit: req.query.limit,
      });

      const installments = await feeRecordService.getInstallments(id as string, schoolId, {
        skip: pagination.skip,
        limit: pagination.limit,
      });

      if (!installments) {
        res.status(404).json({ success: false, message: 'Fee record not found.' });
        return;
      }

      res.status(200).json({
        success: true,
        data: installments.data,
        pagination: buildPaginationMeta(pagination, installments.total),
      });
    } catch (error: unknown) {
      console.error('Error fetching installments:', error);
      res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  },
};
