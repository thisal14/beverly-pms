import jwt from 'jsonwebtoken';
import { User, UserRole } from '@beverly-pms/shared';
import dotenv from 'dotenv';

dotenv.config();

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'secret';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'refresh_secret';

export interface TokenPayload {
  id: number;
  role: UserRole;
  hotel_id: number | null;
}

export function signAccessToken(user: User): string {
  const payload: TokenPayload = { id: user.id, role: user.role as UserRole, hotel_id: user.hotel_id };
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: '15m' });
}

export function signRefreshToken(user: User): string {
  const payload: TokenPayload = { id: user.id, role: user.role as UserRole, hotel_id: user.hotel_id };
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: '7d' });
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, ACCESS_SECRET) as TokenPayload;
}

export function verifyRefreshToken(token: string): TokenPayload {
  return jwt.verify(token, REFRESH_SECRET) as TokenPayload;
}
