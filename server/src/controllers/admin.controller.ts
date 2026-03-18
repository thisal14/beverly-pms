import { Request, Response, NextFunction } from 'express';
import { query } from '../db/connection';
import { logAudit } from '../utils/audit.utils';
import bcrypt from 'bcrypt';
import { UserRole } from '@beverly-pms/shared';

// Helper for hotel ID resolution
const getHotelId = (req: Request) => req.user?.role === UserRole.SUPER_ADMIN && req.query.hotel_id 
  ? parseInt(req.query.hotel_id as string) 
  : req.user!.hotel_id;

// --- Categories ---
export const getCategories = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await query(`SELECT * FROM room_categories WHERE hotel_id = ?`, [getHotelId(req)]);
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

export const createCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description, base_price, sort_order } = req.body;
    const result = await query<any>(
      `INSERT INTO room_categories (hotel_id, name, description, base_price, sort_order) VALUES (?, ?, ?, ?, ?)`,
      [getHotelId(req), name, description, base_price, sort_order || 0]
    );
    await logAudit(req, 'CREATE_CATEGORY', 'room_categories', result.insertId, null, req.body);
    res.json({ success: true, message: 'Category created', data: { id: result.insertId } });
  } catch (error) { next(error); }
};

// --- Rooms ---
export const getRooms = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await query(`SELECT * FROM rooms WHERE hotel_id = ?`, [getHotelId(req)]);
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

export const createRoom = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { room_category_id, room_number, floor, capacity, extra_person_charge, early_checkin_fee, late_checkout_fee } = req.body;
    const result = await query<any>(
      `INSERT INTO rooms (hotel_id, room_category_id, room_number, floor, capacity, extra_person_charge, early_checkin_fee, late_checkout_fee) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [getHotelId(req), room_category_id, room_number, floor, capacity, extra_person_charge, early_checkin_fee, late_checkout_fee]
    );
    await logAudit(req, 'CREATE_ROOM', 'rooms', result.insertId, null, req.body);
    res.json({ success: true, message: 'Room created', data: { id: result.insertId } });
  } catch (error) { next(error); }
};

// --- Packages ---
export const getPackages = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await query(`SELECT * FROM package_types WHERE hotel_id = ?`, [getHotelId(req)]);
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

export const createPackage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, min_hours, max_hours, price_multiplier, flat_price, description } = req.body;
    const result = await query<any>(
      `INSERT INTO package_types (hotel_id, name, min_hours, max_hours, price_multiplier, flat_price, description) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [getHotelId(req), name, min_hours || null, max_hours || null, price_multiplier, flat_price || null, description]
    );
    await logAudit(req, 'CREATE_PACKAGE', 'package_types', result.insertId, null, req.body);
    res.json({ success: true, message: 'Package created', data: { id: result.insertId } });
  } catch (error) { next(error); }
};

// --- Users ---
export const getUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await query(`SELECT id, hotel_id, role, name, email, is_active, created_at FROM users WHERE hotel_id = ? OR (? IS NULL AND hotel_id IS NULL)`, [getHotelId(req), getHotelId(req)]);
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

export const createUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { role, name, email, password } = req.body;
    if (role === UserRole.SUPER_ADMIN && req.user!.role !== UserRole.SUPER_ADMIN) {
      return res.status(403).json({ success: false, message: 'Cannot create super admin' });
    }
    const hash = await bcrypt.hash(password, 10);
    const result = await query<any>(
      `INSERT INTO users (hotel_id, role, name, email, password_hash) VALUES (?, ?, ?, ?, ?)`,
      [role === UserRole.SUPER_ADMIN ? null : getHotelId(req), role, name, email, hash]
    );
    await logAudit(req, 'CREATE_USER', 'users', result.insertId, null, { email, role });
    res.json({ success: true, message: 'User created', data: { id: result.insertId } });
  } catch (error) { next(error); }
};
