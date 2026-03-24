import { db } from '../db/connection';
import { sql } from 'kysely';
import { AppError } from '../utils/app-error';

export interface AddPaymentDTO {
  amount: number;
  method: 'cash' | 'card' | 'bank_transfer' | 'online' | 'other';
  stage: 'reservation' | 'checkin' | 'checkout' | 'adjustment';
  reference?: string;
}

export class PaymentService {
  static async addPayment(reservationId: number, data: AddPaymentDTO, userId: number) {
    return await db.transaction().execute(async (trx) => {
      const reservation = await trx
        .selectFrom('reservations')
        .select(['id', 'paid_amount'])
        .where('id', '=', reservationId)
        .forUpdate()
        .executeTakeFirst();

      if (!reservation) throw new AppError('Reservation not found', 404);

      const result = await trx.insertInto('payments').values({
        reservation_id:   reservationId,
        amount:           data.amount,
        payment_method:   data.method,
        payment_stage:    data.stage,
        reference_number: data.reference || null,
        created_by:       userId,
      }).executeTakeFirst();

      await trx
        .updateTable('reservations')
        .set({ paid_amount: sql`paid_amount + ${data.amount}` } as any)
        .where('id', '=', reservationId)
        .execute();
        
      return Number(result.insertId);
    });
  }
}
