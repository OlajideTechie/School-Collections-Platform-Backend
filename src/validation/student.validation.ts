import { z } from 'zod';

export const createStudentSchema = z.object({
  schoolId: z.string().min(1, 'School ID is required.'),
  firstName: z.string().min(1, 'First name is required.'),
  lastName: z.string().min(1, 'Last name is required.'),
  parentName: z.string().min(1, 'Parent name is required.'),
  parentPhone: z.string().min(11, 'Parent phone is required.').max(11, 'Parent phone cannot exceed 11 digits.'),
  parentEmail: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.string().email('Invalid email format.').optional(),
  ),
});

export const listStudentsQuerySchema = z.object({
  schoolId: z.string().min(1, 'School ID cannot be empty.').optional(),
});

export const studentIdParamSchema = z.object({
  id: z.string().min(1, 'Student ID is required.'),
});

export type CreateStudentInput = z.infer<typeof createStudentSchema>;
export type ListStudentsQuery = z.infer<typeof listStudentsQuerySchema>;
