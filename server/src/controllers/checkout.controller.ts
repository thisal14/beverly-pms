import { Request, Response, NextFunction } from 'express';
import { pool } from '../db/connection';
import { z } from 'zod';
import { logAudit } from '../utils/audit.utils';

const checkoutSchema = z.object({
  actual_checkout: z.string().datetime(),
  payments: z.array(z.object({
    amount: z.number().min(0.01),
    method: z.enum(['cash', 'card', 'bank_transfer', 'online', 'other']),
    reference: z.string().optional()
  })).optional()
});

export const checkout = async (req: Request, res: Response, next: NextFunction) => {
  const connection = await pool.getConnection();
  try {
    const id = parseInt(req.params.id);
    const data = checkoutSchema.parse(req.body);

    await connection.beginTransaction();

    const [reservations] = await connection.query<any[]>(
      `SELECT * FROM reservations WHERE id = ? FOR UPDATE`,
      [id]
    );

    if (!reservations.length) throw new Error('Reservation not found');
    const resv = reservations[0];

    const [rooms] = await connection.query<any[]>(
      `SELECT rr.*, r.late_checkout_fee, r.grace_period_checkout_minutes
       FROM reservation_rooms rr
       JOIN rooms r ON rr.room_id = r.id
       WHERE rr.reservation_id = ?`,
      [id]
    );

    if (resv.status !== 'checked_in') {
      throw new Error(`Cannot check out. Current status: ${resv.status}`);
    }

    const actualCheckout = new Date(data.actual_checkout);
    const scheduledCheckout = new Date(resv.scheduled_checkout);
    
    let totalLateFee = 0;
    for (const r of rooms) {
      const gracedCheckout = new Date(scheduledCheckout.getTime());
      gracedCheckout.setMinutes(gracedCheckout.getMinutes() + r.grace_period_checkout_minutes);
      
      if (actualCheckout > gracedCheckout) {
        totalLateFee += parseFloat(r.late_checkout_fee || 0);
      }
    }

    const newTotal = parseFloat(resv.base_amount) + parseFloat(resv.early_checkin_fee) + totalLateFee + parseFloat(resv.extra_person_charge);
    
    let sumOfNewPayments = 0;
    if (data.payments) {
      sumOfNewPayments = data.payments.reduce((acc, p) => acc + p.amount, 0);
    }
    const newPaid = parseFloat(resv.paid_amount) + sumOfNewPayments;

    // Tolerance for float issues
    if (newPaid < newTotal - 0.01) {
      throw new Error(`Balance must be zero at checkout. Remaining: ${newTotal - newPaid}`);
    }

    const updateSql = `
      UPDATE reservations SET 
        status = 'checked_out', 
        actual_checkout = ?, 
        late_checkout_fee = ?, 
        total_amount = ?, 
        paid_amount = ? 
      WHERE id = ?
    `;

    const formatDateTime = (iso: string) => new Date(iso).toISOString().slice(0, 19).replace('T', ' ');

    await connection.query(updateSql, [
      formatDateTime(data.actual_checkout), totalLateFee, newTotal, newPaid, id
    ]);

    if (data.payments && data.payments.length > 0) {
      for (const p of data.payments) {
        await connection.query(
          `INSERT INTO payments (reservation_id, amount, payment_method, payment_stage, reference_number, created_by)
           VALUES (?, ?, ?, 'checkout', ?, ?)`,
          [id, p.amount, p.method, p.reference || null, req.user!.id]
        );
      }
    }

    await connection.commit();
    await logAudit(req, 'CHECKOUT', 'reservations', id, { status: resv.status }, { status: 'checked_out', lateFee: totalLateFee });

    res.status(200).json({ success: true, message: 'Checked out successfully' });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
};
