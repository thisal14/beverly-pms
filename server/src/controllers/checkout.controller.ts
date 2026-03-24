import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { logAudit } from '../utils/audit.utils';
import { CheckoutService } from '../services/checkout.service';

const checkoutSchema = z.object({
  actual_checkout: z.string().datetime(),
  payments: z.array(z.object({
    amount: z.number().min(0.01),
    method: z.enum(['cash', 'card', 'bank_transfer', 'online', 'other']),
    reference: z.string().optional()
  })).optional()
});

export const checkout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const data = checkoutSchema.parse(req.body);

    await CheckoutService.processCheckout(id, data, req.user!.id);

    await logAudit(req, 'CHECKOUT', 'reservations', id, null, { 
      status: 'checked_out',
      actual_checkout: data.actual_checkout
    });

    res.status(200).json({ success: true, message: 'Checked out successfully' });
  } catch (error) {
    next(error);
  }
};
