import { Request, Response, NextFunction } from 'express';
import { db } from '../db/connection';
import { sql } from 'kysely';
import { UserRole } from '@beverly-pms/shared';

const getReportContext = (req: Request) => {
  const hotelId = req.user?.role === UserRole.SUPER_ADMIN && req.query.hotel_id 
    ? parseInt(req.query.hotel_id as string) 
    : req.user!.hotel_id;
  return { 
    hotelId: hotelId as number, 
    from: (req.query.date_from as string) || '2000-01-01', 
    to: (req.query.date_to as string) || '2099-12-31' 
  };
};

export const getSalesSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { hotelId, from, to } = getReportContext(req);
    const data = await db
      .selectFrom('reservations')
      .select([
        sql<string>`DATE(actual_checkout)`.as('period'),
        sql<number>`SUM(total_amount)`.as('revenue')
      ])
      .where('hotel_id', '=', hotelId)
      .where('status', '=', 'checked_out')
      .where('actual_checkout', '>=', from + ' 00:00:00')
      .where('actual_checkout', '<=', to + ' 23:59:59')
      .groupBy(sql`DATE(actual_checkout)`)
      .orderBy('period', 'asc')
      .execute();

    res.json({ success: true, data });
  } catch (error) { next(error); }
};

export const getOccupancy = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { hotelId, from, to } = getReportContext(req);
    const daysDiff = Math.max(1, (new Date(to).getTime() - new Date(from).getTime()) / (1000 * 3600 * 24) + 1);
    
    const data = await db
      .selectFrom('rooms as r')
      .leftJoin('reservation_rooms as rr', 'r.id', 'rr.room_id')
      .leftJoin('reservations as res', (join) => join
        .onRef('rr.reservation_id', '=', 'res.id')
        .on('res.status', 'in', ['checked_in', 'checked_out'])
        .on('res.scheduled_checkin', '>=', from + ' 00:00:00')
        .on('res.scheduled_checkin', '<=', to + ' 23:59:59')
      )
      .select([
        'r.room_number',
        sql<number>`COUNT(rr.id)`.as('bookings'),
        sql<number>`COUNT(rr.id) / ${sql.val(daysDiff)} * 100`.as('occupancy_rate')
      ])
      .where('r.hotel_id', '=', hotelId)
      .groupBy('r.id')
      .orderBy('r.room_number', 'asc')
      .execute();

    res.json({ success: true, data });
  } catch (error) { next(error); }
};

export const getPayments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { hotelId, from, to } = getReportContext(req);
    const data = await db
      .selectFrom('payments as p')
      .innerJoin('reservations as r', 'p.reservation_id', 'r.id')
      .select([
        'p.payment_method',
        sql<number>`SUM(p.amount)`.as('total')
      ])
      .where('r.hotel_id', '=', hotelId)
      .where('p.created_at', '>=', from + ' 00:00:00')
      .where('p.created_at', '<=', to + ' 23:59:59')
      .groupBy('p.payment_method')
      .execute();

    res.json({ success: true, data });
  } catch (error) { next(error); }
};

export const getReservationSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { hotelId, from, to } = getReportContext(req);
    const data = await db
      .selectFrom('reservations')
      .select([
        'status',
        sql<number>`COUNT(*)`.as('count')
      ])
      .where('hotel_id', '=', hotelId)
      .where('created_at', '>=', from + ' 00:00:00')
      .where('created_at', '<=', to + ' 23:59:59')
      .groupBy('status')
      .execute();

    res.json({ success: true, data });
  } catch (error) { next(error); }
};

export const getTopRooms = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { hotelId, from, to } = getReportContext(req);
    const data = await db
      .selectFrom('rooms as r')
      .innerJoin('reservation_rooms as rr', 'r.id', 'rr.room_id')
      .innerJoin('reservations as res', 'rr.reservation_id', 'res.id')
      .select([
        'r.room_number',
        sql<number>`COUNT(rr.id)`.as('booking_count')
      ])
      .where('r.hotel_id', '=', hotelId)
      .where('res.created_at', '>=', from + ' 00:00:00')
      .where('res.created_at', '<=', to + ' 23:59:59')
      .groupBy('r.id')
      .orderBy('booking_count', 'desc')
      .limit(10)
      .execute();

    res.json({ success: true, data });
  } catch (error) { next(error); }
};
