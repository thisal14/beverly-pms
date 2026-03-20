import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt.utils';
import { UserRole } from '@beverly-pms/shared';

export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = (authHeader && authHeader.split(' ')[1]) || req.cookies?.accessToken;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access token missing' });
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired access token' });
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    
    // Super admin overrides role checks usually, but if an endpoint explicitly restricts SUPER_ADMIN
    // we should respect the roles array if we want. But spec says "super_admin bypasses" usually.
    if (req.user.role === UserRole.SUPER_ADMIN) {
      return next();
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Forbidden: Insufficient role' });
    }
    next();
  };
}

export function requireHotel(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Not authenticated' });
  }

  if (req.user.role === UserRole.SUPER_ADMIN) {
    return next();
  }

  // For routes with :hotelId
  const requestHotelId = req.params.hotelId;
  
  if (requestHotelId && parseInt(requestHotelId) !== req.user.hotel_id) {
    return res.status(403).json({ success: false, message: 'Forbidden: Wrong hotel context' });
  }

  next();
}
