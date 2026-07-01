import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../../config/database';
import {
  CreateSchoolInput,
  SchoolLoginInput,
} from '../../validation/school.validation';

const JWT_SECRET = process.env.JWT_SECRET || 'change-me';

export const schoolService = {
  async createSchool(schoolData: CreateSchoolInput) {
    const duplicateConditions = [
      { name: schoolData.name },
      { email: schoolData.email },
      schoolData.phone ? { phone: schoolData.phone } : undefined,
    ].filter(Boolean) as Array<Record<string, unknown>>;

    const existingSchool = await prisma.school.findFirst({
      where: {
        OR: duplicateConditions,
      },
    });

    if (existingSchool) {
      throw new Error('School name, email, or phone already exists.');
    }

    const hashedPassword = await bcrypt.hash(schoolData.password, 10);

    const school = await prisma.school.create({
      data: {
        name: schoolData.name,
        email: schoolData.email,
        phone: schoolData.phone,
        password: hashedPassword,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return school;
  },

  async loginSchool(credentials: SchoolLoginInput) {
    const school = await prisma.school.findUnique({
      where: { email: credentials.email },
    });

    if (!school) {
      throw new Error('Invalid login credentials.');
    }

    const isValidPassword = await bcrypt.compare(
      credentials.password,
      school.password,
    );

    if (!isValidPassword) {
      throw new Error('Invalid login credentials.');
    }

    const token = jwt.sign(
      { id: school.id, name: school.name },
      JWT_SECRET,
      { expiresIn: '1h' },
    );

    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.schoolSession.create({
      data: {
        schoolId: school.id,
        token,
        expiresAt,
      },
    });

    return {
      token,
      school: {
        id: school.id,
        name: school.name,
        email: school.email,
        phone: school.phone,
      },
    };
  },

  async logoutSchool(token: string) {
    const session = await prisma.schoolSession.findUnique({
      where: { token },
    });

    if (!session) {
      throw new Error('Invalid session token.');
    }

    await prisma.schoolSession.update({
      where: { token },
      data: { revokedAt: new Date() },
    });

    return true;
  },

  async getSchoolById(id: string) {
    return prisma.school.findUnique({
      where: { id },
    });
  },
};
