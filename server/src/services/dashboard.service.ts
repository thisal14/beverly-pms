import { db } from '../db/connection';
import { sql } from 'kysely';

export class DashboardService {
  /**
   * Calculates group-wide metrics across all properties.
   */
  static async getGlobalKPIs() {
    const totalRevenue = await db.selectFrom('payments')
      .select(sql<string | number>`SUM(amount)`.as('total'))
      .executeTakeFirst();

    const totalRooms = await db.selectFrom('rooms')
      .select(sql<number>`COUNT(*)`.as('total'))
      .where('is_active', '=', 1)
      .executeTakeFirst();

    const occupiedRooms = await db.selectFrom('rooms')
      .select(sql<number>`COUNT(*)`.as('total'))
      .where('status', '=', 'occupied')
      .where('is_active', '=', 1)
      .executeTakeFirst();

    const totalHotels = await db.selectFrom('hotels')
      .select(sql<number>`COUNT(*)`.as('total'))
      .executeTakeFirst();

    const upcomingCheckinsToday = await db.selectFrom('reservations')
      .select(sql<number>`COUNT(*)`.as('total'))
      .where('status', '=', 'reserved')
      .where(sql`DATE(scheduled_checkin)`, '=', sql`CURDATE()`)
      .executeTakeFirst();

    const occupancyRate = totalRooms?.total ? (Number(occupiedRooms?.total || 0) / Number(totalRooms.total) * 100).toFixed(2) : "0.00";

    return {
      totalRevenue: totalRevenue?.total || 0,
      totalHotels: totalHotels?.total || 0,
      totalRooms: totalRooms?.total || 0,
      occupancyRate: `${occupancyRate}%`,
      upcomingCheckinsToday: upcomingCheckinsToday?.total || 0
    };
  }

  /**
   * Compares revenue across all hotel properties.
   */
  static async getRevenueByProperty() {
    return await db.selectFrom('hotels')
      .leftJoin('reservations', 'hotels.id', 'reservations.hotel_id')
      .leftJoin('payments', 'reservations.id', 'payments.reservation_id')
      .select([
        'hotels.id',
        'hotels.name',
        sql<string | number>`IFNULL(SUM(payments.amount), 0)`.as('revenue')
      ])
      .groupBy(['hotels.id', 'hotels.name'])
      .orderBy('revenue', 'desc')
      .execute();
  }

  /**
   * Gets the latest critical system activity.
   */
  static async getRecentActivity(limit = 10) {
    return await db.selectFrom('audit_log')
      .leftJoin('users', 'audit_log.user_id', 'users.id')
      .leftJoin('hotels', 'users.hotel_id', 'hotels.id')
      .select([
        'audit_log.id',
        'audit_log.action',
        'audit_log.entity_type',
        'audit_log.created_at',
        'users.name as user_name',
        'hotels.name as hotel_name'
      ])
      .orderBy('audit_log.created_at', 'desc')
      .limit(limit)
      .execute();
  }
}
