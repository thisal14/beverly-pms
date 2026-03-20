import { Router } from 'express';
import { getCategories, createCategory, getRooms, createRoom, updateRoom, getPackages, createPackage, getUsers, createUser } from '../controllers/admin.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import { UserRole } from '@beverly-pms/shared';

const router = Router();

router.use(authenticateToken);
// Super admins and admins have access to CRUD setup tools.
router.use(requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN));

router.get('/categories', getCategories);
router.post('/categories', createCategory);

router.get('/rooms', getRooms);
router.post('/rooms', createRoom);
router.put('/rooms/:id', updateRoom);

router.get('/packages', getPackages);
router.post('/packages', createPackage);

router.get('/users', getUsers);
router.post('/users', createUser);

export default router;
