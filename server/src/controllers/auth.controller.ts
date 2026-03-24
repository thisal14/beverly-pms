import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { db } from '../db/connection';
import { User, Hotel } from '@beverly-pms/shared';
import { signAccessToken, signRefreshToken, verifyRefreshToken, ACCESS_TOKEN_TTL_MS, REFRESH_TOKEN_TTL_MS } from '../utils/jwt.utils';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await db
      .selectFrom('users')
      .selectAll()
      .where('email', '=', email)
      .where('is_active', '=', 1)
      .executeTakeFirst();

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    let hotel: { id: number; name: string; slug: string } | null = null;
    if (user.hotel_id) {
      hotel = await db
        .selectFrom('hotels')
        .select(['id', 'name', 'slug'])
        .where('id', '=', user.hotel_id)
        .executeTakeFirst() ?? null;
    }

    const userAsShared = user as unknown as User;
    const accessToken = signAccessToken(userAsShared);
    const refreshToken = signRefreshToken(userAsShared);

    const isProd = process.env.NODE_ENV === 'production';

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: REFRESH_TOKEN_TTL_MS
    });

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: ACCESS_TOKEN_TTL_MS
    });

    const userResponse = {
      id: user.id,
      name: user.name,
      role: user.role,
      hotel_id: user.hotel_id,
      hotel: hotel || undefined
    };

    return res.status(200).json({ success: true, user: userResponse });
  } catch (error) {
    next(error);
  }
};

export const refresh = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies.refreshToken;
    if (!token) {
      return res.status(401).json({ success: false, message: 'Refresh token missing' });
    }

    const payload = verifyRefreshToken(token);

    const user = await db
      .selectFrom('users')
      .selectAll()
      .where('id', '=', payload.id)
      .where('is_active', '=', 1)
      .executeTakeFirst();

    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found or inactive' });
    }

    const userAsShared = user as unknown as User;
    const newAccessToken = signAccessToken(userAsShared);

    res.cookie('accessToken', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: ACCESS_TOKEN_TTL_MS
    });

    let hotel: { id: number; name: string; slug: string } | null = null;
    if (user.hotel_id) {
      hotel = await db
        .selectFrom('hotels')
        .select(['id', 'name', 'slug'])
        .where('id', '=', user.hotel_id)
        .executeTakeFirst() ?? null;
    }

    const userResponse = {
      id: user.id,
      name: user.name,
      role: user.role,
      hotel_id: user.hotel_id,
      hotel: hotel || undefined
    };

    return res.status(200).json({ success: true, user: userResponse });
  } catch (error) {
    res.clearCookie('refreshToken');
    res.clearCookie('accessToken');
    return res.status(401).json({ success: false, message: 'Invalid refresh token' });
  }
};

export const logout = async (req: Request, res: Response) => {
  res.clearCookie('refreshToken');
  res.clearCookie('accessToken');
  return res.status(200).json({ success: true, message: 'Logged out successfully' });
};
