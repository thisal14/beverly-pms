import { Request, Response, NextFunction } from 'express';
import { logAudit } from '../utils/audit.utils';
import { HotelService } from '../services/hotel.service';
import { z } from 'zod';

const createHotelSchema = z.object({
  name: z.string().min(1),
  slug: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  timezone: z.string().optional()
});

const updateHotelSchema = createHotelSchema.partial();

export const getHotels = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const hotels = await HotelService.getAllHotels();
    res.json({ success: true, data: hotels });
  } catch (error) { next(error); }
};

export const createHotel = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = createHotelSchema.parse(req.body);
    const insertId = await HotelService.createHotel(body);
    await logAudit(req, 'CREATE_HOTEL', 'hotels', insertId, null, body);
    res.status(201).json({ success: true, message: 'Hotel created', data: { id: insertId } });
  } catch (error) { next(error); }
};

export const updateHotel = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    const body = updateHotelSchema.parse(req.body);
    const current = await HotelService.updateHotel(id, body);
    await logAudit(req, 'UPDATE_HOTEL', 'hotels', id, current, body);
    res.json({ success: true, message: 'Hotel updated' });
  } catch (error) { next(error); }
};

