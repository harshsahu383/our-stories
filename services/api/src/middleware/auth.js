
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma.js';

export async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');

  if (!token) {
    return res.status(401).json({
      error: 'Authentication required.',
    });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    if (!payload.sub) {
      return res.status(401).json({
        error: 'Invalid authentication token.',
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        role: true,
        tokenVersion: true,
      },
    });

    if (
      !user ||
      (payload.tokenVersion ?? 0) !== user.tokenVersion
    ) {
      return res.status(401).json({
        error: 'Session expired. Please sign in again.',
      });
    }

    req.user = {
      id: user.id,
      role: user.role,
    };

    next();
  } catch (error) {
    if (
      error.name === 'JsonWebTokenError' ||
      error.name === 'TokenExpiredError' ||
      error.name === 'NotBeforeError'
    ) {
      return res.status(401).json({
        error: 'Session expired. Please sign in again.',
      });
    }

    next(error);
  }
}
