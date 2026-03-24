import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import { UserRole } from '@beverly-pms/shared';

const router = Router();

// All dashboard routes require authentication AND super_admin role
router.use(authenticateToken);
router.use(requireRole(UserRole.SUPER_ADMIN));

router.get('/summary', DashboardController.getSummary);
router.get('/metrics', DashboardController.getGlobalMetrics);
router.get('/revenue', DashboardController.getRevenueStats);

export default router;
