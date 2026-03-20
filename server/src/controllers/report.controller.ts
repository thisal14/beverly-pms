import { Request, Response, NextFunction } from 'express';
import { query } from '../db/connection';
import { UserRole } from '@beverly-pms/shared';

const getReportContext = (req: Request) => {
  const hotelId = req.user?.role === UserRole.SUPER_ADMIN && req.query.hotel_id 
    ? parseInt(req.query.hotel_id as string) 
    : req.user!.hotel_id;
  return { 
    hotelId, 
    from: (req.query.date_from as string) || '2000-01-01', 
    to: (req.query.date_to as string) || '2099-12-31' 
  };
};

export const getSalesSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { hotelId, from, to } = getReportContext(req);
    const sql = `
      SELECT DATE(actual_checkout) as period, SUM(total_amount) as revenue
      FROM reservations 
      WHERE hotel_id = ? AND status = 'checked_out' AND actual_checkout BETWEEN ? AND ?
      GROUP BY DATE(actual_checkout)
      ORDER BY period ASC
    `;
    const data = await query(sql, [hotelId, from + ' 00:00:00', to + ' 23:59:59']);
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

export const getOccupancy = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { hotelId, from, to } = getReportContext(req);
    // Calculate days in the range to compute occupancy rate
    const daysDiff = Math.max(1, (new Date(to).getTime() - new Date(from).getTime()) / (1000 * 3600 * 24) + 1);
    
    const sql = `
      SELECT r.room_number, COUNT(rr.id) as bookings,
             (COUNT(rr.id) / ? * 100) as occupancy_rate
      FROM rooms r
      LEFT JOIN reservation_rooms rr ON r.id = rr.room_id
      LEFT JOIN reservations res ON rr.reservation_id = res.id 
         AND res.status IN ('checked_in', 'checked_out')
         AND res.scheduled_checkin BETWEEN ? AND ?
      WHERE r.hotel_id = ?
      GROUP BY r.id
      ORDER BY r.room_number ASC
    `;
    const data = await query(sql, [daysDiff, from + ' 00:00:00', to + ' 23:59:59', hotelId]);
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

export const getPayments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { hotelId, from, to } = getReportContext(req);
    const sql = `
      SELECT p.payment_method, SUM(p.amount) as total
      FROM payments p
      JOIN reservations r ON p.reservation_id = r.id
      WHERE r.hotel_id = ? AND p.created_at BETWEEN ? AND ?
      GROUP BY p.payment_method
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
      SELECT r.room_number, COUNT(rr.id) as booking_count
      FROM rooms r
      JOIN reservation_rooms rr ON r.id = rr.room_id
      JOIN reservations res ON rr.reservation_id = res.id
      WHERE r.hotel_id = ? AND res.created_at BETWEEN ? AND ?
      GROUP BY r.id
      ORDER BY booking_count DESC LIMIT 10
    `;
    const data = await query(sql, [hotelId, from + ' 00:00:00', to + ' 23:59:59']);
    res.json({ success: true, data });
  } catch (error) { next(error); }
};
