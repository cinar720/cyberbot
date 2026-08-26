import type { Request, Response, NextFunction } from 'express';
import { getSession, type SessionData } from '../auth/session.js';

declare global {
  namespace Express {
    interface Request {
      session?: SessionData;
      sessionToken?: string;
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.['cyberbot_session'];
  if (!token) {
    res.status(401).json({ success: false, error: { message: 'Oturum bulunamadı.' } });
    return;
  }

  const session = getSession(token);
  if (!session) {
    res.status(401).json({ success: false, error: { message: 'Oturum süresi dolmuş.' } });
    return;
  }

  req.session = session;
  req.sessionToken = token;
  next();
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = req.cookies?.['cyberbot_session'];
  if (token) {
    const session = getSession(token);
    if (session) {
      req.session = session;
      req.sessionToken = token;
    }
  }
  next();
}
