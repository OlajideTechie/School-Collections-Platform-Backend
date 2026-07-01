import { ZodError } from 'zod';
import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import {
  createSchoolSchema,
  schoolIdParamSchema,
  schoolLoginSchema,
} from '../../validation/school.validation';
import { schoolService } from './school.service';

export const schoolController = {
  async registerSchool(req: Request, res: Response): Promise<void> {
    try {
      const schoolData = createSchoolSchema.parse(req.body);
      const school = await schoolService.createSchool(schoolData);

      res.status(201).json({ success: true, data: school });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        res.status(400).json({ success: false, errors: error.issues });
        return;
      }

      if (error instanceof Error && error.message === 'School name, email, or phone already exists.') {
        res.status(400).json({ success: false, message: error.message });
        return;
      }

      console.error('Error registering school:', error);
      res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  },

  async loginSchool(req: Request, res: Response): Promise<void> {
    try {
      const credentials = schoolLoginSchema.parse(req.body);
      const result = await schoolService.loginSchool(credentials);
      res.status(200).json({ success: true, data: result });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        res.status(400).json({ success: false, errors: error.issues });
        return;
      }
      if (error instanceof Error && error.message === 'Invalid login credentials.') {
        res.status(401).json({ success: false, message: error.message });
        return;
      }

      console.error('Error logging in school:', error);
      res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  },

  async logoutSchool(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const token = req.token;
      if (!token) {
        res.status(401).json({ success: false, message: 'Authorization token missing.' });
        return;
      }

      await schoolService.logoutSchool(token);
      res.status(200).json({ success: true, message: 'Logged out successfully.' });
    } catch (error: unknown) {
      if (error instanceof Error && error.message === 'Invalid session token.') {
        res.status(401).json({ success: false, message: error.message });
        return;
      }

      console.error('Error logging out school:', error);
      res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  },

  async getSchoolById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = schoolIdParamSchema.parse(req.params);
      const school = await schoolService.getSchoolById(id);

      if (!school) {
        res.status(404).json({ success: false, message: 'School not found.' });
        return;
      }

      res.status(200).json({ success: true, data: school });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        res.status(400).json({ success: false, errors: error.issues });
        return;
      }

      console.error('Error fetching school:', error);
      res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  },
};
