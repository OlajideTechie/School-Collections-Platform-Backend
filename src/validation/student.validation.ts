import { z } from 'zod';

export const createStudentSchema = z.object({
  firstName: z.string().min(1, 'First name is required.'),
  lastName: z.string().min(1, 'Last name is required.'),
  parentName: z.string().min(1, 'Parent name is required.'),
  parentPhone: z.string().regex(/^[0-9]{11}$/, 'Parent phone must be an 11 digit number.'),
  parentEmail: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.string().email('Invalid email format.').optional(),
  ),
});

export const studentIdParamSchema = z.object({
  id: z.string().min(1, 'Student ID is required.'),
});

export type CreateStudentInput = z.infer<typeof createStudentSchema>;
