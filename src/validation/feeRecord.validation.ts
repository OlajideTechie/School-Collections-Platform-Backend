import { z } from 'zod';

const dateString = z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
  message: 'Invalid date format. Use a valid ISO 8601 date string.',
});

export const createFeeRecordSchema = z
  .object({
    studentId: z.string().min(1, 'Student ID is required.'),
    title: z.string().min(1, 'Title is required.'),
    totalAmount: z.number().positive('Total amount must be positive.'),
    installmentCount: z.number().int().min(1, 'Installment count must be at least 1.'),
    collectionStartDate: dateString.optional(),
    collectionDueDate: dateString.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.collectionStartDate && data.collectionDueDate) {
      const start = new Date(data.collectionStartDate);
      const due = new Date(data.collectionDueDate);
      if (due < start) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['collectionDueDate'],
          message: 'Collection due date must be on or after the collection start date.',
        });
      }
    }
  });

export type CreateFeeRecordInput = z.infer<typeof createFeeRecordSchema>;
