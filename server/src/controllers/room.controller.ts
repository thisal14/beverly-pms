import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { RoomService } from '../services/room.service';

const getAvailableRoomsSchema = z.object({
  checkin: z.string().min(1),
  checkout: z.string().min(1),
  packageTypeId: z.coerce.number().int().positive(),
  packageQty: z.coerce.number().int().min(1).optional().default(1)
});

export const getAvailableRooms = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const hotelId = parseInt(req.params.hotelId);
    
    const query = getAvailableRoomsSchema.parse(req.query);

    const data = await RoomService.getAvailableRooms({
      hotelId,
      checkin: query.checkin,
      checkout: query.checkout,
      packageTypeId: query.packageTypeId,
      packageQty: query.packageQty
    });

    return res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

