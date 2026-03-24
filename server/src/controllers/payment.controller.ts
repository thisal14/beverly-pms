import { Request, Response, NextFunction } from 'express';
import { db } from '../db/connection';
import { sql } from 'kysely';
import { z } from 'zod';
import { logAudit } from '../utils/audit.utils';
import { AppError } from '../utils/app-error';

const paymentSchema = z.object({
  amount: z.number().min(0.01),
  method: z.enum(['cash', 'card', 'bank_transfer', 'online', 'other']),
  stage: z.enum(['reservation', 'checkin', 'checkout', 'adjustment']),
  reference: z.string().optional()
});

export const addPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const data = paymentSchema.parse(req.body);

    await db.transaction().execute(async (trx) => {
      const reservation = await trx
        .selectFrom('reservations')
        .select(['id', 'paid_amount'])
        .where('id', '=', id)
        .forUpdate()
        .executeTakeFirst();

      if (!reservation) throw new AppError('Reservation not found', 404);

      await trx.insertInto('payments').values({
        reservation_id:   id,
        amount:           data.amount,
        payment_method:   data.method,
        payment_stage:    data.stage,
        reference_number: data.reference || null,
        created_by:       req.user!.id,
      }).execute();

      await trx
        .updateTable('reservations')
        .set({ paid_amount: sql`paid_amount + ${data.amount}` } as any)
        .where('id', '=', id)
        .execute();
    });

    await logAudit(req, 'ADD_PAYMENT', 'payments', null, null, { reservation_id: id, amount: data.amount });

    res.status(201).json({ success: true, message: 'Payment added' });
  } catch (error) {
    next(error);
  }
};
