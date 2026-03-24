import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { logAudit } from '../utils/audit.utils';
import { CheckinService } from '../services/checkin.service';

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
  try {
    const id = parseInt(req.params.id);
    const data = checkinSchema.parse(req.body);

    await CheckinService.processCheckin(id, data, req.user!.id);

    await logAudit(req, 'CHECKIN', 'reservations', id, null, { 
      status: 'checked_in',
      actual_checkin: data.actual_checkin
    });

    res.status(200).json({ success: true, message: 'Checked in successfully' });
  } catch (error) {
    next(error);
  }
};
