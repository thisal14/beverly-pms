import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { queryOne } from '../db/connection';
import { User, Hotel } from '@beverly-pms/shared';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.utils';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await queryOne<User>(`SELECT * FROM users WHERE email = ? AND is_active = TRUE`, [email]);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Spec uses password_hash in DB
    const dbUser = user as any; 
    const match = await bcrypt.compare(password, dbUser.password_hash);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    let hotel: Hotel | null = null;
    if (user.hotel_id) {
      hotel = await queryOne<Hotel>(`SELECT id, name, slug FROM hotels WHERE id = ?`, [user.hotel_id]);
    }

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    const isProd = process.env.NODE_ENV === 'production';
    
    // Set HttpOnly cookie for refresh token
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // Set HttpOnly cookie for access token
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000 // 15 minutes
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
    
    // Fetch latest user to ensure they are still active
    const user = await queryOne<User>(`SELECT * FROM users WHERE id = ? AND is_active = TRUE`, [payload.id]);
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found or inactive' });
    }

    const newAccessToken = signAccessToken(user);
    
    // Set new HttpOnly cookie for access token
    res.cookie('accessToken', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000 // 15 minutes
    });

    let hotel: Hotel | null = null;
    if (user.hotel_id) {
      hotel = await queryOne<Hotel>(`SELECT id, name, slug FROM hotels WHERE id = ?`, [user.hotel_id]) || null;
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
