import { Router } from 'express';
import { getHotels, createHotel, updateHotel } from '../controllers/hotel.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import { UserRole } from '@beverly-pms/shared';

const router = Router();

router.use(authenticateToken);

// Only Super Admin can manage hotels directly
router.get('/', getHotels);
router.post('/', requireRole(UserRole.SUPER_ADMIN), createHotel);
router.put('/:id', requireRole(UserRole.SUPER_ADMIN), updateHotel);

export default router;
