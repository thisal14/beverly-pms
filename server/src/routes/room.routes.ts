import { Router } from 'express';
import { getAvailableRooms } from '../controllers/room.controller';
import { authenticateToken, requireHotel } from '../middleware/auth.middleware';

const router = Router();

// Used in reservation flow
router.get('/hotels/:hotelId/rooms/available', authenticateToken, requireHotel, getAvailableRooms);

// Admin routes will go through admin.routes.ts, so we might just keep this specifically for hotel endpoints.

export default router;
