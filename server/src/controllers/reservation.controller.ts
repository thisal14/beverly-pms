import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ReservationService } from '../services/reservation.service';
import { UserRole } from '@beverly-pms/shared';

const createReservationSchema = z.object({
  hotel_id: z.number(),
  rooms: z.array(z.object({
    room_id: z.number(),
    package_type_id: z.number(),
    package_quantity: z.number().default(1),
    num_adults: z.number().default(1),
    num_children: z.number().default(0),
  })).min(1),
  customer_name: z.string().min(1),
  customer_phone: z.string().min(1),
  customer_nic_passport: z.string().min(1),
  scheduled_checkin: z.string().datetime(),
  scheduled_checkout: z.string().datetime(),
  initial_payment: z.object({
    amount: z.number().min(0),
    method: z.enum(['cash', 'card', 'bank_transfer', 'online', 'other']),
    reference: z.string().optional()
  }).optional()
});

export const createReservation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createReservationSchema.parse(req.body);
    const result = await ReservationService.createReservation(data, req.user!.id, req);
    res.status(201).json({ success: true, message: 'Reservation created', data: result });
  } catch (error: any) {
    if (error.message && error.message.includes('not found')) {
       return res.status(400).json({ success: false, message: error.message });
    }
    if (error.message && error.message.includes('no longer available')) {
       return res.status(409).json({ success: false, message: error.message });
    }
    next(error);
  }
};

export const getReservations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { hotel_id, status, date_from, date_to, room_id, page, limit } = req.query;

    const parsedLimit = parseInt(limit as string) || 10;
    const parsedPage = Math.max(1, parseInt(page as string) || 1);

    const result = await ReservationService.getReservations(
      { hotel_id, status, date_from, date_to, room_id },
      { limit: parsedLimit, page: parsedPage }
    );

    res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  } catch (error) {
    next(error);
  }
};

export const getReservationById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const data = await ReservationService.getReservationById(id);
    res.status(200).json({ success: true, data });
  } catch (error: any) {
    if (error.message === 'Reservation not found') {
       return res.status(404).json({ success: false, message: error.message });
    }
    next(error);
  }
};

export const getReservationTimeline = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const hotelId = req.user?.role === UserRole.SUPER_ADMIN && req.query.hotel_id 
      ? parseInt(req.query.hotel_id as string) 
      : req.user!.hotel_id;
      
    if (!hotelId) {
      return res.status(400).json({ success: false, message: 'Hotel ID is required' });
    }
      
    // Default to a 30-day window around today if not provided
    const today = new Date();
    const defaultStart = new Date(today);
    defaultStart.setDate(today.getDate() - 7);
    const defaultEnd = new Date(today);
    defaultEnd.setDate(today.getDate() + 23);

    const fromDate = (req.query.start_date as string) || defaultStart.toISOString().split('T')[0];
    const toDate = (req.query.end_date as string) || defaultEnd.toISOString().split('T')[0];

    const data = await ReservationService.getReservationTimeline(hotelId, fromDate, toDate);

    res.json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};
