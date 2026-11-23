import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { NextFunction, Request, Response } from 'express';
import type { CoachAccount } from './types.ts';

const EPHEMERAL_SECRET = crypto.randomBytes(32).toString('hex');

function getJwtSecret(): string {
  const configured = process.env.JWT_SECRET?.trim();
  return configured && configured.length >= 16 ? configured : EPHEMERAL_SECRET;
}

export interface AuthTokenPayload {
  sub: string;
  email: string;
  coachName: string;
  roleTitle: string;
}

export interface AuthenticatedRequest extends Request {
  coach?: CoachAccount;
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function safeEqualSecret(candidate: string, expected: string): boolean {
  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function signCoachToken(
  coach: CoachAccount,
  rememberMe: boolean,
): string {
  const payload: AuthTokenPayload = {
    sub: coach.id,
    email: coach.email,
    coachName: coach.coachName,
    roleTitle: coach.roleTitle,
  };
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: rememberMe ? '30d' : '12h',
  });
}

export function verifyCoachToken(token: string): CoachAccount | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as AuthTokenPayload;
    if (!decoded?.sub || !decoded?.email) return null;
    return {
      id: decoded.sub,
      email: decoded.email,
      coachName: decoded.coachName || 'Coach',
      roleTitle: decoded.roleTitle || 'Head Conditioning Coach',
    };
  } catch {
    return null;
  }
}

export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }
  const token = header.slice(7).trim();
  const coach = verifyCoachToken(token);
  if (!coach) {
    res.status(401).json({ error: 'Session expired or invalid token.' });
    return;
  }
  req.coach = coach;
  next();
}
