import { Request, Response, NextFunction } from 'express';
import { pool } from '../db/connection';
import { z } from 'zod';
import { logAudit } from '../utils/audit.utils';

const paymentSchema = z.object({
  amount: z.number().min(0.01),
  method: z.enum(['cash', 'card', 'bank_transfer', 'online', 'other']),
  stage: z.enum(['reservation', 'checkin', 'checkout', 'adjustment']),
  reference: z.string().optional()
});

export const addPayment = async (req: Request, res: Response, next: NextFunction) => {
  const connection = await pool.getConnection();
  try {
    const id = parseInt(req.params.id);
    const data = paymentSchema.parse(req.body);

    await connection.beginTransaction();

    const [reservations] = await connection.query<any[]>(`SELECT * FROM reservations WHERE id = ? FOR UPDATE`, [id]);
    if (!reservations.length) throw new Error('Reservation not found');

    await connection.query(
      `INSERT INTO payments (reservation_id, amount, payment_method, payment_stage, reference_number, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, data.amount, data.method, data.stage, data.reference || null, req.user!.id]
    );

    await connection.query(`UPDATE reservations SET paid_amount = paid_amount + ? WHERE id = ?`, [data.amount, id]);

    await connection.commit();
    await logAudit(req, 'ADD_PAYMENT', 'payments', null, null, { reservation_id: id, amount: data.amount });

    res.status(200).json({ success: true, message: 'Payment added' });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
};
