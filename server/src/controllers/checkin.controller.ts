import { Request, Response, NextFunction } from 'express';
import { pool } from '../db/connection';
import { z } from 'zod';
import { logAudit } from '../utils/audit.utils';

const checkinSchema = z.object({
  actual_checkin: z.string().datetime(),
  num_people: z.number().optional(),
  guests: z.array(z.object({
    nic_passport: z.string().optional(),
    guest_name: z.string().optional()
  })).optional(),
  payment: z.object({
    amount: z.number().min(0),
    method: z.enum(['cash', 'card', 'bank_transfer', 'online', 'other']),
    reference: z.string().optional()
  }).optional()
});

export const checkin = async (req: Request, res: Response, next: NextFunction) => {
  const connection = await pool.getConnection();
  try {
    const id = parseInt(req.params.id);
    const data = checkinSchema.parse(req.body);

    await connection.beginTransaction();

    const [reservations] = await connection.query<any[]>(
      `SELECT * FROM reservations WHERE id = ? FOR UPDATE`,
      [id]
    );

    if (!reservations.length) throw new Error('Reservation not found');
    const resv = reservations[0];

    const [rooms] = await connection.query<any[]>(
      `SELECT rr.*, r.capacity, r.extra_person_charge, r.early_checkin_fee, r.grace_period_checkin_minutes
       FROM reservation_rooms rr
       JOIN rooms r ON rr.room_id = r.id
       WHERE rr.reservation_id = ?`,
      [id]
    );

    if (resv.status !== 'reserved') {
      throw new Error(`Cannot check in. Current status: ${resv.status}`);
    }

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
      gracedCheckin.setMinutes(gracedCheckin.getMinutes() - r.grace_period_checkin_minutes);
      
      if (actualCheckin < gracedCheckin) {
        totalEarlyFee += parseFloat(r.early_checkin_fee || 0);
      }
      totalExtraPersonBaseCharge += parseFloat(r.extra_person_charge || 0);
    }

    // Average extra person charge if mixed room types (simple approach) or more granular
    const avgExtraCharge = rooms.length > 0 ? (totalExtraPersonBaseCharge / rooms.length) : 0;

    let extraPersonCharge = 0;
    const finalNumPeople = data.num_people || totalOriginalPeople;
    if (finalNumPeople > totalCapacity) {
      extraPersonCharge = (finalNumPeople - totalCapacity) * avgExtraCharge;
    }

    // We use the existing total_amount as a base if it's already updated, 
    // but usually we recalculate additions here.
    const newTotal = parseFloat(resv.base_amount) + totalEarlyFee + parseFloat(resv.late_checkout_fee) + extraPersonCharge;
    const paymentAmount = data.payment ? data.payment.amount : 0;
    const newPaid = parseFloat(resv.paid_amount) + paymentAmount;

    // Update reservation
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
    
    const formatDateTime = (iso: string) => new Date(iso).toISOString().slice(0, 19).replace('T', ' ');

    await connection.query(updateSql, [
      formatDateTime(data.actual_checkin), totalEarlyFee, extraPersonCharge, newTotal, newPaid, id
    ]);

    // Insert guests
    if (data.guests && data.guests.length > 0) {
      for (const guest of data.guests) {
        await connection.query(
          `INSERT INTO reservation_guests (reservation_id, nic_passport, guest_name) VALUES (?, ?, ?)`,
          [id, guest.nic_passport || null, guest.guest_name || null]
        );
      }
    }

    // Insert payment
    if (data.payment && data.payment.amount > 0) {
      await connection.query(
        `INSERT INTO payments (reservation_id, amount, payment_method, payment_stage, reference_number, created_by)
         VALUES (?, ?, ?, 'checkin', ?, ?)`,
        [id, data.payment.amount, data.payment.method, data.payment.reference || null, req.user!.id]
      );
    }

    await connection.commit();
    await logAudit(req, 'CHECKIN', 'reservations', id, { status: resv.status }, { status: 'checked_in', earlyFee: totalEarlyFee, extraPersonCharge });

    res.status(200).json({ success: true, message: 'Checked in successfully' });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
};
