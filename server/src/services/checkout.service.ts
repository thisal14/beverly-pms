import { db } from '../db/connection';
import { sql } from 'kysely';
import { AppError } from '../utils/app-error';

export interface CheckoutData {
  actual_checkout: string;
  payments?: {
    amount: number;
    method: 'cash' | 'card' | 'bank_transfer' | 'online' | 'other';
    reference?: string;
  }[];
}

export class CheckoutService {
  /**
   * Process a reservation check-out.
   */
  static async processCheckout(reservationId: number, data: CheckoutData, userId: number): Promise<void> {
    await db.transaction().execute(async (trx) => {
      // 1. Fetch reservation with lock
      const resv = await trx
        .selectFrom('reservations')
        .selectAll()
        .where('id', '=', reservationId)
        .forUpdate()
        .executeTakeFirst();

      if (!resv) throw new AppError('Reservation not found', 404);
      if (resv.status !== 'checked_in') {
        throw new AppError(`Cannot check out. Current status: ${resv.status}`, 422);
      }

      // 2. Fetch rooms and their configs
      const rooms = await trx
        .selectFrom('reservation_rooms as rr')
        .innerJoin('rooms as r', 'r.id', 'rr.room_id')
        .selectAll('rr')
        .select(['r.late_checkout_fee', 'r.grace_period_checkout_minutes'])
        .where('rr.reservation_id', '=', reservationId)
        .execute();

      const actualCheckout = new Date(data.actual_checkout);
      const scheduledCheckout = new Date(resv.scheduled_checkout as string);

      let totalLateFee = 0;
      for (const r of rooms) {
        const gracedCheckout = new Date(scheduledCheckout.getTime());
        gracedCheckout.setMinutes(gracedCheckout.getMinutes() + (r.grace_period_checkout_minutes || 0));

        if (actualCheckout > gracedCheckout) {
          totalLateFee += parseFloat((r.late_checkout_fee as string) || '0');
        }
      }

      const newTotal =
        parseFloat((resv.base_amount as string) || '0') +
        parseFloat((resv.early_checkin_fee as string) || '0') +
        totalLateFee +
        parseFloat((resv.extra_person_charge as string) || '0');

      let sumOfNewPayments = 0;
      if (data.payments) {
        sumOfNewPayments = data.payments.reduce((acc, p) => acc + p.amount, 0);
      }
      const newPaid = parseFloat((resv.paid_amount as string) || '0') + sumOfNewPayments;

      // 3. Balance Validation
      if (newPaid < newTotal - 0.01) {
        throw new AppError(
          `Balance must be zero at checkout. Remaining: ${(newTotal - newPaid).toFixed(2)}`,
          422
        );
      }

      const formatDateTime = (date: Date) =>
        date.toISOString().slice(0, 19).replace('T', ' ');

      // 4. Update reservation
      await trx
        .updateTable('reservations')
        .set({
          status:            'checked_out',
          actual_checkout:   formatDateTime(actualCheckout),
          late_checkout_fee: totalLateFee,
          total_amount:      newTotal,
          paid_amount:       newPaid,
        })
        .where('id', '=', reservationId)
        .execute();

      // 5. Insert final payments
      if (data.payments && data.payments.length > 0) {
        for (const p of data.payments) {
          if (p.amount > 0) {
            await trx.insertInto('payments').values({
              reservation_id:  reservationId,
              amount:          p.amount,
              payment_method:  p.method,
              payment_stage:   'checkout',
              reference_number: p.reference || null,
              created_by:      userId,
            }).execute();
          }
        }
      }
    });
  }
}
