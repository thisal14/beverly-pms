import { Request, Response, NextFunction } from 'express';
import { query } from '../db/connection';
import { logAudit } from '../utils/audit.utils';

export const getHotels = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const hotels = await query(`SELECT * FROM hotels`);
    res.json({ success: true, data: hotels });
  } catch (error) { next(error); }
};

export const createHotel = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, slug, address, phone, timezone } = req.body;
    const result = await query<any>(
      `INSERT INTO hotels (name, slug, address, phone, timezone) VALUES (?, ?, ?, ?, ?)`,
      [name, slug, address, phone, timezone || 'Asia/Colombo']
    );
    await logAudit(req, 'CREATE_HOTEL', 'hotels', result.insertId, null, req.body);
    res.json({ success: true, message: 'Hotel created', data: { id: result.insertId } });
  } catch (error) { next(error); }
};

export const updateHotel = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const { name, slug, address, phone, timezone } = req.body;
    await query(
      `UPDATE hotels SET name = ?, slug = ?, address = ?, phone = ?, timezone = ? WHERE id = ?`,
      [name, slug, address, phone, timezone || 'Asia/Colombo', id]
    );
    await logAudit(req, 'UPDATE_HOTEL', 'hotels', id, null, req.body);
    res.json({ success: true, message: 'Hotel updated' });
  } catch (error) { next(error); }
};
