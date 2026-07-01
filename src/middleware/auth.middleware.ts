import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';

const JWT_SECRET = process.env.JWT_SECRET || 'change-me';

export interface AuthenticatedRequest extends Request {
  school?: {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
  };
  token?: string;
}

export const authenticateSchool = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authorization header missing.' });
  }

  const token = authHeader.replace('Bearer ', '').trim();

  try {
    jwt.verify(token, JWT_SECRET);

    const session = await prisma.schoolSession.findUnique({
      where: { token },
      include: { school: true },
    });

    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
    }

    req.school = {
      id: session.school.id,
      name: session.school.name,
      email: session.school.email,
      phone: session.school.phone,
    };
    req.token = token;

    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid token.' });
  }
};
