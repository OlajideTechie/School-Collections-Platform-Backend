import prisma from '../../config/database';
import { CreateStudentInput, ListStudentsQuery } from '../../validation/student.validation';

export const studentService = {
  /**
   * Creates a new student record in the database.
   * @param studentData - The data for the new student.
   * @returns The created student object.
   * @throws Error if the school does not exist.
   */
  async createStudent(studentData: CreateStudentInput) {
    const school = await prisma.school.findUnique({
      where: { id: studentData.schoolId },
    });

    if (!school) {
      throw new Error('School not found.');
    }

    return prisma.student.create({ data: studentData });
  },

  async getStudents(query: ListStudentsQuery) {
    return prisma.student.findMany({
      where: query.schoolId ? { schoolId: query.schoolId } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  },

  async getStudentById(id: string) {
    return prisma.student.findUnique({
      where: { id },
    });
  },
};
