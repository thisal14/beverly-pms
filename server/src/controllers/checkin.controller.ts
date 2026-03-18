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
      `SELECT res.*, r.capacity, r.extra_person_charge, r.early_checkin_fee, r.grace_period_checkin_minutes
       FROM reservations res
       JOIN rooms r ON res.room_id = r.id
       WHERE res.id = ? FOR UPDATE`,
      [id]
    );

    if (!reservations.length) throw new Error('Reservation not found');
    const resv = reservations[0];

    if (resv.status !== 'reserved') {
      throw new Error(`Cannot check in. Current status: ${resv.status}`);
    }

    const actualCheckin = new Date(data.actual_checkin);
    const scheduledCheckin = new Date(resv.scheduled_checkin);
    const gracedCheckin = new Date(scheduledCheckin.getTime());
    gracedCheckin.setMinutes(gracedCheckin.getMinutes() - resv.grace_period_checkin_minutes);

    let earlyFee = 0;
    if (actualCheckin < gracedCheckin) {
      earlyFee = parseFloat(resv.early_checkin_fee);
    }

    let extraPersonCharge = 0;
    const finalNumPeople = data.num_people || resv.num_people || 1;
    if (finalNumPeople > resv.capacity) {
      extraPersonCharge = (finalNumPeople - resv.capacity) * parseFloat(resv.extra_person_charge);
    }

    // Since total_amount = base_amount + early_fee + late_fee + extra_person_charge
    const newTotal = parseFloat(resv.base_amount) + earlyFee + parseFloat(resv.late_checkout_fee) + extraPersonCharge;
    const paymentAmount = data.payment ? data.payment.amount : 0;
    const newPaid = parseFloat(resv.paid_amount) + paymentAmount;

    // Update reservation
    const updateSql = `
      UPDATE reservations SET 
        status = 'checked_in', 
        actual_checkin = ?, 
        num_people = ?, 
        early_checkin_fee = ?, 
        extra_person_charge = ?, 
        total_amount = ?, 
        paid_amount = ? 
      WHERE id = ?
    `;
    
    // YYYY-MM-DD HH:MM:SS format
    const formatDateTime = (iso: string) => new Date(iso).toISOString().slice(0, 19).replace('T', ' ');

    await connection.query(updateSql, [
      formatDateTime(data.actual_checkin), finalNumPeople, earlyFee, extraPersonCharge, newTotal, newPaid, id
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
    await logAudit(req, 'CHECKIN', 'reservations', id, { status: resv.status }, { status: 'checked_in', earlyFee, extraPersonCharge });

    res.status(200).json({ success: true, message: 'Checked in successfully' });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
};
