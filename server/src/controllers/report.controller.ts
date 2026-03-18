import { Request, Response, NextFunction } from 'express';
import { query } from '../db/connection';
import { UserRole } from '@beverly-pms/shared';

const getReportContext = (req: Request) => {
  const hotelId = req.user?.role === UserRole.SUPER_ADMIN && req.query.hotel_id 
    ? parseInt(req.query.hotel_id as string) 
    : req.user!.hotel_id;
  return { hotelId, from: req.query.date_from || '2000-01-01', to: req.query.date_to || '2099-12-31' };
};

export const getSalesSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { hotelId, from, to } = getReportContext(req);
    const sql = `
      SELECT DATE(actual_checkout) as date, SUM(total_amount) as revenue
      FROM reservations 
      WHERE hotel_id = ? AND status = 'checked_out' AND actual_checkout BETWEEN ? AND ?
      GROUP BY DATE(actual_checkout)
      ORDER BY date ASC
    `;
    const data = await query(sql, [hotelId, from + ' 00:00:00', to + ' 23:59:59']);
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

export const getOccupancy = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { hotelId, from, to } = getReportContext(req);
    const sql = `
      SELECT r.room_number, COUNT(res.id) as bookings
      FROM rooms r
      LEFT JOIN reservations res ON r.id = res.room_id AND res.status IN ('checked_in', 'checked_out')
         AND res.scheduled_checkin BETWEEN ? AND ?
      WHERE r.hotel_id = ?
      GROUP BY r.id
      ORDER BY bookings DESC
    `;
    const data = await query(sql, [from + ' 00:00:00', to + ' 23:59:59', hotelId]);
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

export const getPayments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { hotelId, from, to } = getReportContext(req);
    const sql = `
      SELECT payment_method, SUM(amount) as total
      FROM payments p
      JOIN reservations r ON p.reservation_id = r.id
      WHERE r.hotel_id = ? AND p.created_at BETWEEN ? AND ?
      GROUP BY payment_method
    `;
    const data = await query(sql, [hotelId, from + ' 00:00:00', to + ' 23:59:59']);
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

export const getReservationSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { hotelId, from, to } = getReportContext(req);
    const sql = `
      SELECT status, COUNT(*) as count
      FROM reservations
      WHERE hotel_id = ? AND created_at BETWEEN ? AND ?
      GROUP BY status
    `;
    const data = await query(sql, [hotelId, from + ' 00:00:00', to + ' 23:59:59']);
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

export const getTopRooms = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { hotelId, from, to } = getReportContext(req);
    const sql = `
      SELECT r.room_number, COUNT(res.id) as bookings
      FROM rooms r
      JOIN reservations res ON r.id = res.room_id
      WHERE r.hotel_id = ? AND res.created_at BETWEEN ? AND ?
      GROUP BY r.id
      ORDER BY bookings DESC LIMIT 10
    `;
    const data = await query(sql, [hotelId, from + ' 00:00:00', to + ' 23:59:59']);
    res.json({ success: true, data });
  } catch (error) { next(error); }
};
