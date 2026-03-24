import { Router } from 'express';
import { 
  getCategories, createCategory, 
  getRooms, createRoom, updateRoom, 
  getPackages, createPackage, 
  getUsers, createUser, updateUser, toggleUserStatus 
} from '../controllers/admin.controller';
import { authenticateToken, requireRole } from '../middleware/auth.middleware';
import { UserRole } from '@beverly-pms/shared';

const router = Router();

// Super admins and admins have access to CRUD setup tools.
router.use(authenticateToken);
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
router.put('/users/:id', updateUser);
router.patch('/users/:id/status', toggleUserStatus);

export default router;
