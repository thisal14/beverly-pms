import { PoolConnection } from 'mysql2/promise';
import { pool, db } from '../db/connection';
import { sql } from 'kysely';

export interface CheckinData {
  actual_checkin: string;
  num_people?: number;
  guests?: {
    nic_passport?: string;
    guest_name?: string;
  }[];
  payment?: {
    amount: number;
    method: 'cash' | 'card' | 'bank_transfer' | 'online' | 'other';
    reference?: string;
  };
}

export class CheckinService {
  /**
   * Process a reservation check-in
   */
  static async processCheckin(reservationId: number, data: CheckinData, userId: number): Promise<void> {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // 1. Fetch reservation with lock
      const [reservations] = await connection.query<any[]>(
        `SELECT * FROM reservations WHERE id = ? FOR UPDATE`,
        [reservationId]
      );

      if (!reservations.length) {
        throw new Error('Reservation not found');
      }
      const resv = reservations[0];

      if (resv.status !== 'confirmed' && resv.status !== 'pending') {
        // Handle case where status might be 'reserved' in legacy but 'confirmed/pending' in current
        // The controller check was: if (resv.status !== 'reserved')
        // Looking at our DB types, valid are 'pending', 'confirmed', 'checked_in', etc.
        // I'll be flexible but strict on 'checked_in' already
        if (resv.status === 'checked_in') {
          throw new Error('Reservation is already checked in');
        }
      }

      // 2. Fetch rooms and their configs
      const [rooms] = await connection.query<any[]>(
        `SELECT rr.*, r.capacity, r.extra_person_charge, r.early_checkin_fee, r.grace_period_checkin_minutes
         FROM reservation_rooms rr
         JOIN rooms r ON rr.room_id = r.id
         WHERE rr.reservation_id = ?`,
        [reservationId]
      );

      const actualCheckin = new Date(data.actual_checkin);
      const scheduledCheckin = new Date(resv.scheduled_checkin);
      
      let totalEarlyFee = 0;
      let totalCapacity = 0;
      let totalExtraPersonBaseCharge = 0;
      let totalOriginalPeople = 0;

      for (const r of rooms) {
        totalCapacity += r.capacity;
        totalOriginalPeople += (r.num_adults + r.num_children);
        
        const gracedCheckin = new Date(scheduledCheckin.getTime());
        gracedCheckin.setMinutes(gracedCheckin.getMinutes() - (r.grace_period_checkin_minutes || 0));
        
        if (actualCheckin < gracedCheckin) {
          totalEarlyFee += parseFloat(r.early_checkin_fee || 0);
        }
        totalExtraPersonBaseCharge += parseFloat(r.extra_person_charge || 0);
      }

      const avgExtraCharge = rooms.length > 0 ? (totalExtraPersonBaseCharge / rooms.length) : 0;

      let extraPersonCharge = 0;
      const finalNumPeople = data.num_people || totalOriginalPeople;
      if (finalNumPeople > totalCapacity) {
        extraPersonCharge = (finalNumPeople - totalCapacity) * avgExtraCharge;
      }

      const newTotal = parseFloat(resv.base_amount || 0) + totalEarlyFee + parseFloat(resv.late_checkout_fee || 0) + extraPersonCharge;
      const paymentAmount = data.payment ? data.payment.amount : 0;
      const newPaid = parseFloat(resv.paid_amount || 0) + paymentAmount;

      // 3. Update reservation
      const updateSql = `
        UPDATE reservations SET 
          status = 'checked_in', 
          actual_checkin = ?, 
          early_checkin_fee = ?, 
          extra_person_charge = ?, 
          total_amount = ?, 
          paid_amount = ? 
        WHERE id = ?
      `;
      
      const formatDateTime = (date: Date) => date.toISOString().slice(0, 19).replace('T', ' ');

      await connection.query(updateSql, [
        formatDateTime(actualCheckin), totalEarlyFee, extraPersonCharge, newTotal, newPaid, reservationId
      ]);

      // 4. Insert guests
      if (data.guests && data.guests.length > 0) {
        for (const guest of data.guests) {
          await connection.query(
            `INSERT INTO reservation_guests (reservation_id, nic_passport, guest_name) VALUES (?, ?, ?)`,
            [reservationId, guest.nic_passport || null, guest.guest_name || null]
          );
        }
      }

      // 5. Insert payment
      if (data.payment && data.payment.amount > 0) {
        await connection.query(
          `INSERT INTO payments (reservation_id, amount, payment_method, payment_stage, reference_number, created_by)
           VALUES (?, ?, ?, 'checkin', ?, ?)`,
          [reservationId, data.payment.amount, data.payment.method, data.payment.reference || null, userId]
        );
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}
