import { Router } from 'express';
import { getSalesSummary, getOccupancy, getPayments, getReservationSummary, getTopRooms } from '../controllers/report.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import { UserRole } from '@beverly-pms/shared';

const router = Router();

router.use(authenticateToken);
router.use(requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.PURCHASING_MANAGER));

router.get('/sales', getSalesSummary);
router.get('/occupancy', getOccupancy);
router.get('/payments', getPayments);
router.get('/reservations-summary', getReservationSummary);
router.get('/status', getReservationSummary);
router.get('/top-rooms', getTopRooms);

export default router;
