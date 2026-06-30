import { ZodError } from 'zod';
import { Request, Response } from 'express';
import {
  createStudentSchema,
  listStudentsQuerySchema,
  studentIdParamSchema,
} from '../../validation/student.validation';
import { studentService } from './student.service';

export const studentController = {
  /**
   * Handles the request to fetch student records.
   * Supports optional filtering by schoolId.
   */
  async getStudents(req: Request, res: Response): Promise<void> {
    try {
      const query = listStudentsQuerySchema.parse(req.query);
      const students = await studentService.getStudents(query);

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
  async getStudentById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = studentIdParamSchema.parse(req.params);
      const student = await studentService.getStudentById(id);

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
  async createStudent(req: Request, res: Response): Promise<void> {
    try {
      const studentData = createStudentSchema.parse(req.body);
      const student = await studentService.createStudent(studentData);

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

      console.error('Error creating student:', error);
      res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  },
};
