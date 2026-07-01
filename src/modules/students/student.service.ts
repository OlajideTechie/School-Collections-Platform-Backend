import prisma from '../../config/database';
import { CreateStudentInput } from '../../validation/student.validation';

export const studentService = {
  /**
   * Creates a new student record in the database.
   * @param studentData - The data for the new student.
   * @param schoolId - The logged-in school's ID.
   * @returns The created student object.
   */
  async createStudent(studentData: CreateStudentInput, schoolId: string) {
    const duplicateParent = await prisma.student.findFirst({
      where: {
        OR: [
          { parentPhone: studentData.parentPhone },
          studentData.parentEmail ? { parentEmail: studentData.parentEmail } : undefined,
        ].filter(Boolean) as Array<{ parentPhone?: string; parentEmail?: string }>,
      },
    });

    if (duplicateParent) {
      throw new Error('Parent phone or email already exists.');
    }

    return prisma.student.create({
      data: {
        ...studentData,
        schoolId,
      },
    });
  },

  async getStudents(schoolId: string) {
    return prisma.student.findMany({
      where: { schoolId },
      orderBy: { createdAt: 'desc' },
    });
  },

  async getStudentById(id: string, schoolId: string) {
    return prisma.student.findFirst({
      where: { id, schoolId },
    });
  },
};
