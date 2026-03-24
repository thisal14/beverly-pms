import { Request, Response, NextFunction } from 'express';
import { db } from '../db/connection';
import { logAudit } from '../utils/audit.utils';
import { can, Action } from '../utils/authorization';
import { AppError } from '../utils/app-error';
import bcrypt from 'bcrypt';
import { UserRole } from '@beverly-pms/shared';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Helper: resolve the acting hotel ID from user context or query param
// ---------------------------------------------------------------------------
const getHotelId = (req: Request): number => {
  const fromQuery = req.user?.role === UserRole.SUPER_ADMIN && req.query.hotel_id
    ? parseInt(req.query.hotel_id as string)
    : null;
  return fromQuery ?? req.user!.hotel_id!;
};

// ---------------------------------------------------------------------------
// Zod Schemas
// ---------------------------------------------------------------------------
const createCategorySchema = z.object({
  name:        z.string().min(1),
  description: z.string().optional(),
  base_price:  z.number().min(0),
  sort_order:  z.number().int().optional(),
});

const createRoomSchema = z.object({
  room_category_id:    z.number().int(),
  room_number:         z.string().min(1),
  floor:               z.number().int().optional(),
  capacity:            z.number().int().min(1),
  status:              z.enum(['available', 'occupied', 'dirty', 'maintenance', 'out_of_order']).optional(),
  extra_person_charge: z.number().min(0).optional(),
  early_checkin_fee:   z.number().min(0).optional(),
  late_checkout_fee:   z.number().min(0).optional(),
});

const updateRoomSchema = createRoomSchema.partial();

const createPackageSchema = z.object({
  name:             z.string().min(1),
  description:      z.string().optional(),
  min_hours:        z.number().positive().optional(),
  max_hours:        z.number().positive().optional(),
  price_multiplier: z.number().positive(),
  flat_price:       z.number().min(0).optional(),
});

const createUserSchema = z.object({
  name:     z.string().min(1),
  email:    z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role:     z.nativeEnum(UserRole),
  hotel_id: z.number().int().optional(),
});

const updateUserSchema = createUserSchema.omit({ password: true }).partial().extend({
  password:  z.string().min(8).optional(),
  is_active: z.boolean().optional(),
});

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------
export const getCategories = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await db
      .selectFrom('room_categories')
      .selectAll()
      .where('hotel_id', '=', getHotelId(req))
      .execute();
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

export const createCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = createCategorySchema.parse(req.body);
    const hotelId = getHotelId(req);
    const result = await db.insertInto('room_categories').values({
      hotel_id:    hotelId,
      name:        body.name,
      description: body.description ?? null,
      base_price:  body.base_price,
      sort_order:  body.sort_order ?? 0,
    }).executeTakeFirst();

    await logAudit(req, 'CREATE_CATEGORY', 'room_categories', Number(result.insertId), null, body);
    res.status(201).json({ success: true, message: 'Category created', data: { id: Number(result.insertId) } });
  } catch (error) { next(error); }
};

// ---------------------------------------------------------------------------
// Rooms
// ---------------------------------------------------------------------------
export const getRooms = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await db
      .selectFrom('rooms')
      .selectAll()
      .where('hotel_id', '=', getHotelId(req))
      .execute();
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

export const createRoom = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = createRoomSchema.parse(req.body);
    const result = await db.insertInto('rooms').values({
      hotel_id:            getHotelId(req),
      room_category_id:    body.room_category_id,
      room_number:         body.room_number,
      floor:               body.floor ?? null,
      capacity:            body.capacity,
      status:              body.status ?? 'available',
      extra_person_charge: body.extra_person_charge ?? 0,
      early_checkin_fee:   body.early_checkin_fee ?? null,
      late_checkout_fee:   body.late_checkout_fee ?? null,
    }).executeTakeFirst();

    await logAudit(req, 'CREATE_ROOM', 'rooms', Number(result.insertId), null, body);
    res.status(201).json({ success: true, message: 'Room created', data: { id: Number(result.insertId) } });
  } catch (error) { next(error); }
};

export const updateRoom = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const hotelId = getHotelId(req);
    const body = updateRoomSchema.parse(req.body);

    const current = await db
      .selectFrom('rooms')
      .selectAll()
      .where('id', '=', parseInt(id))
      .where('hotel_id', '=', hotelId)
      .executeTakeFirst();

    if (!current) throw new AppError('Room not found', 404);

    await db.updateTable('rooms')
      .set({
        ...(body.room_category_id !== undefined && { room_category_id: body.room_category_id }),
        ...(body.room_number      !== undefined && { room_number:       body.room_number }),
        ...(body.floor            !== undefined && { floor:             body.floor }),
        ...(body.capacity         !== undefined && { capacity:          body.capacity }),
        ...(body.status           !== undefined && { status:            body.status }),
        ...(body.extra_person_charge !== undefined && { extra_person_charge: body.extra_person_charge }),
        ...(body.early_checkin_fee   !== undefined && { early_checkin_fee:   body.early_checkin_fee }),
        ...(body.late_checkout_fee   !== undefined && { late_checkout_fee:   body.late_checkout_fee }),
      })
      .where('id', '=', parseInt(id))
      .where('hotel_id', '=', hotelId)
      .execute();

    await logAudit(req, 'UPDATE_ROOM', 'rooms', parseInt(id), current, body);
    res.json({ success: true, message: 'Room updated' });
  } catch (error) { next(error); }
};

// ---------------------------------------------------------------------------
// Packages
// ---------------------------------------------------------------------------
export const getPackages = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await db
      .selectFrom('package_types')
      .selectAll()
      .where('hotel_id', '=', getHotelId(req))
      .execute();
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

export const createPackage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = createPackageSchema.parse(req.body);
    const result = await db.insertInto('package_types').values({
      hotel_id:         getHotelId(req),
      name:             body.name,
      description:      body.description ?? null,
      min_hours:        body.min_hours ?? null,
      max_hours:        body.max_hours ?? null,
      price_multiplier: body.price_multiplier,
      flat_price:       body.flat_price ?? null,
    }).executeTakeFirst();

    await logAudit(req, 'CREATE_PACKAGE', 'package_types', Number(result.insertId), null, body);
    res.status(201).json({ success: true, message: 'Package created', data: { id: Number(result.insertId) } });
  } catch (error) { next(error); }
};

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------
export const getUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let query = db
      .selectFrom('users')
      .select(['id', 'hotel_id', 'role', 'name', 'email', 'is_active', 'created_at']);

    // Super admin with no hotel_id filter → all users across all hotels
    const isSuperAdmin = req.user?.role === UserRole.SUPER_ADMIN;
    if (!isSuperAdmin || req.query.hotel_id) {
      query = query.where('hotel_id', '=', getHotelId(req));
    }

    const data = await query.execute();
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

export const createUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = createUserSchema.parse(req.body);

    // Permission check: only super admins can create other super admins
    if (body.role === UserRole.SUPER_ADMIN && !can(req.user!, Action.USER_CREATE_ADMIN)) {
      throw new AppError('Cannot create super admin', 403);
    }

    const hash = await bcrypt.hash(body.password, 10);
    const targetHotelId = req.user?.role === UserRole.SUPER_ADMIN
      ? (body.hotel_id ?? null)
      : req.user!.hotel_id;

    const result = await db.insertInto('users').values({
      hotel_id:      body.role === UserRole.SUPER_ADMIN ? null : targetHotelId,
      role:          body.role as any,
      name:          body.name,
      email:         body.email,
      password_hash: hash,
    }).executeTakeFirst();

    await logAudit(req, 'CREATE_USER', 'users', Number(result.insertId), null, { email: body.email, role: body.role, hotel_id: targetHotelId });
    res.status(201).json({ success: true, message: 'User created', data: { id: Number(result.insertId) } });
  } catch (error) { next(error); }
};

export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const body = updateUserSchema.parse(req.body);

    const current = await db
      .selectFrom('users')
      .selectAll()
      .where('id', '=', parseInt(id))
      .executeTakeFirst();

    if (!current) throw new AppError('User not found', 404);

    // Permissions check: non-admins can only manage their own hotel's users
    if (req.user?.role !== UserRole.SUPER_ADMIN && current.hotel_id !== req.user?.hotel_id) {
      throw new AppError('Unauthorized', 403);
    }

    let passwordHash = current.password_hash;
    if (body.password) {
      passwordHash = await bcrypt.hash(body.password, 10);
    }

    const targetHotelId = req.user?.role === UserRole.SUPER_ADMIN
      ? (body.hotel_id === undefined ? current.hotel_id : body.hotel_id ?? null)
      : current.hotel_id;

    await db.updateTable('users').set({
      role:          (body.role ?? current.role) as any,
      name:          body.name          ?? current.name,
      email:         body.email         ?? current.email,
      password_hash: passwordHash,
      hotel_id:      targetHotelId,
      is_active:     body.is_active !== undefined ? (body.is_active ? 1 : 0) : current.is_active,
    }).where('id', '=', parseInt(id)).execute();

    await logAudit(req, 'UPDATE_USER', 'users', parseInt(id), current, body);
    res.json({ success: true, message: 'User updated' });
  } catch (error) { next(error); }
};

export const toggleUserStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { is_active } = z.object({ is_active: z.boolean() }).parse(req.body);

    const current = await db
      .selectFrom('users')
      .select(['id', 'hotel_id', 'is_active'])
      .where('id', '=', parseInt(id))
      .executeTakeFirst();

    if (!current) throw new AppError('User not found', 404);

    if (req.user?.role !== UserRole.SUPER_ADMIN && current.hotel_id !== req.user?.hotel_id) {
      throw new AppError('Unauthorized', 403);
    }

    await db.updateTable('users')
      .set({ is_active: is_active ? 1 : 0 })
      .where('id', '=', parseInt(id))
      .execute();

    await logAudit(req, 'TOGGLE_USER_STATUS', 'users', parseInt(id), { is_active: current.is_active }, { is_active });
    res.json({ success: true, message: `User ${is_active ? 'activated' : 'deactivated'}` });
  } catch (error) { next(error); }
};
