import jwt from 'jsonwebtoken';
import type { JWTPayload } from './types';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '1h';
const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET ?? 'dev-refresh-secret-change-in-production';
const REFRESH_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN ?? '30d';

export function signAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
}

export function signRefreshToken(userId: string): string {
  return jwt.sign({ userId }, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES_IN } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): { userId: string } | null {
  try {
    return jwt.verify(token, REFRESH_SECRET) as { userId: string };
  } catch {
    return null;
  }
}
