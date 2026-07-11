import type { Prisma } from '@prisma/client';
import prisma from '../../config/database';
import { CreateStudentInput } from '../../validation/student.validation';

interface StudentListFilters {
  search?: string;
}

function buildStudentWhere(
  schoolId: string,
  filters?: StudentListFilters
): Prisma.StudentWhereInput {
  const searchTerms =
    filters?.search
      ?.trim()
      .split(/\s+/)
      .filter((term) => term.length > 0) ?? [];

  const where: Prisma.StudentWhereInput = { schoolId };

  if (searchTerms.length > 0) {
    where.AND = searchTerms.map((term) => ({
      OR: [
        { firstName: { contains: term, mode: 'insensitive' } },
        { lastName: { contains: term, mode: 'insensitive' } },
      ],
    }));
  }

  return where;
}

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

  async getStudents(schoolId: string, filters?: StudentListFilters) {
    return prisma.student.findMany({
      where: buildStudentWhere(schoolId, filters),
      orderBy: { createdAt: 'desc' },
    });
  },

  async getStudentsPaginated(
    schoolId: string,
    pagination: { skip: number; limit: number },
    filters?: StudentListFilters
  ) {
    const where = buildStudentWhere(schoolId, filters);

    const [data, total] = await prisma.$transaction([
      prisma.student.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.limit,
      }),
      prisma.student.count({ where }),
    ]);

    return { data, total };
  },

  async getStudentById(id: string, schoolId: string) {
    return prisma.student.findFirst({
      where: { id, schoolId },
    });
  },
};
