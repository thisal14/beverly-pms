import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { logAudit } from '../utils/audit.utils';
import { PaymentService } from '../services/payment.service';

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

    const paymentId = await PaymentService.addPayment(id, data, req.user!.id);

    await logAudit(req, 'ADD_PAYMENT', 'payments', paymentId, null, { reservation_id: id, amount: data.amount });

    res.status(201).json({ success: true, message: 'Payment added' });
  } catch (error) {
    next(error);
  }
};

