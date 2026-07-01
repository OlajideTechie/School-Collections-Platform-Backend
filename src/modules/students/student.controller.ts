import { ZodError } from 'zod';
import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import {
  createStudentSchema,
  studentIdParamSchema,
} from '../../validation/student.validation';
import { studentService } from './student.service';

export const studentController = {
  /**
   * Handles the request to fetch student records.
   * Supports optional filtering by schoolId.
   */
  async getStudents(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const schoolId = req.school?.id;
      if (!schoolId) {
        res.status(401).json({ success: false, message: 'Unauthorized.' });
        return;
      }
      const students = await studentService.getStudents(schoolId);

      res.status(200).json({ success: true, data: students });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        res.status(400).json({ success: false, errors: error.issues });
        return;
      }

      console.error('Error fetching students:', error);
      res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  },

  /**
   * Handles the request to fetch a single student record.
   */
  async getStudentById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = studentIdParamSchema.parse(req.params);
      const schoolId = req.school?.id;
      if (!schoolId) {
        res.status(401).json({ success: false, message: 'Unauthorized.' });
        return;
      }
      const student = await studentService.getStudentById(id, schoolId);

      if (!student) {
        res.status(404).json({ success: false, message: 'Student not found.' });
        return;
      }

      res.status(200).json({ success: true, data: student });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        res.status(400).json({ success: false, errors: error.issues });
        return;
      }

      console.error('Error fetching student:', error);
      res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  },

  /**
   * Handles the request to create a new student.
   * Validates input, calls the student service, and sends the response.
   */
  async createStudent(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const studentData = createStudentSchema.parse(req.body);
      const schoolId = req.school?.id;
      if (!schoolId) {
        res.status(401).json({ success: false, message: 'Unauthorized.' });
        return;
      }
      const student = await studentService.createStudent(studentData, schoolId);

      res.status(201).json({ success: true, data: student });
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        res.status(400).json({ success: false, errors: error.issues });
        return;
      }

      if (error instanceof Error && error.message === 'School not found.') {
        res.status(400).json({ success: false, message: error.message });
        return;
      }

      if (error instanceof Error && error.message === 'Parent phone or email already exists.') {
        res.status(400).json({ success: false, message: error.message });
        return;
      }

      console.error('Error creating student:', error);
      res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  },
};
