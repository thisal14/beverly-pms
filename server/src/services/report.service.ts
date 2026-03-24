import { db } from '../db/connection';
import { sql } from 'kysely';

export interface ReportContextDTO {
  hotelId: number;
  from: string;
  to: string;
}

export class ReportService {
  static async getSalesSummary({ hotelId, from, to }: ReportContextDTO) {
    return await db
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
  }

  static async getOccupancy({ hotelId, from, to }: ReportContextDTO) {
    const daysDiff = Math.max(1, (new Date(to).getTime() - new Date(from).getTime()) / (1000 * 3600 * 24) + 1);
    
    return await db
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
  }

  static async getPayments({ hotelId, from, to }: ReportContextDTO) {
    return await db
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
  }

  static async getReservationSummary({ hotelId, from, to }: ReportContextDTO) {
    return await db
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
  }

  static async getTopRooms({ hotelId, from, to }: ReportContextDTO) {
    return await db
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
  }
}
