import { z } from 'zod';

export const createSchoolSchema = z.object({
  name: z.string().min(1, 'School name is required.'),
  email: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.string().email('Invalid email format.').nonempty('Email is required.'),
  ),
  phone: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.string().regex(/^[0-9]{11}$/, 'Phone must be an 11 digit number.').optional(),
  ),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
});

export const schoolLoginSchema = z.object({
  email: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.string().email('Invalid email format.').nonempty('Email is required.'),
  ),
  password: z.string().min(8, 'Password is required.'),
});

export const schoolIdParamSchema = z.object({
  id: z.string().min(1, 'School ID is required.'),
});

export type CreateSchoolInput = z.infer<typeof createSchoolSchema>;
export type SchoolLoginInput = z.infer<typeof schoolLoginSchema>;
