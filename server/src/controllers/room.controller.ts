import { Request, Response, NextFunction } from 'express';
import { query } from '../db/connection';
import { PackageType } from '@beverly-pms/shared';

export const getAvailableRooms = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const hotelId = parseInt(req.params.hotelId);
    const { checkin, checkout, packageTypeId, packageQty } = req.query;

    if (!checkin || !checkout || !packageTypeId) {
      return res.status(400).json({ success: false, message: 'Missing required query parameters' });
    }

    const qty = parseInt(packageQty as string) || 1;

    // 1. Get the package
    const pkg = await query<PackageType[]>(`SELECT * FROM package_types WHERE id = ? AND hotel_id = ?`, [packageTypeId, hotelId]);
    if (!pkg.length) return res.status(404).json({ success: false, message: 'Package not found' });
    const selectedPackage = pkg[0];

    // 2. Get available rooms query
    // We consider rooms unavailable if there is an overlapping reservation where status is NOT cancelled, no_show, or checked_out.
    // Overlap math: reservation.checkin < requested.checkout AND reservation.checkout > requested.checkin
    const sql = `
      SELECT r.*, c.name as category_name, c.base_price 
      FROM rooms r
      JOIN room_categories c ON r.room_category_id = c.id
      WHERE r.hotel_id = ?
        AND r.is_active = TRUE
        AND c.is_active = TRUE
        AND r.id NOT IN (
          SELECT res.room_id FROM reservations res
          WHERE res.hotel_id = ?
            AND res.status NOT IN ('cancelled', 'no_show', 'checked_out')
            AND res.scheduled_checkin < ?
            AND res.scheduled_checkout > ?
        )
      ORDER BY c.sort_order, r.room_number
    `;

    const rooms = await query<any[]>(sql, [hotelId, hotelId, checkout, checkin]);

    // Group by category and calculate price
    const grouped = rooms.reduce((acc, room) => {
      if (!acc[room.room_category_id]) {
        let baseAmount = 0;
        if (selectedPackage.flat_price) {
          baseAmount = parseFloat(selectedPackage.flat_price) * qty;
        } else {
          baseAmount = parseFloat(room.base_price) * parseFloat(selectedPackage.price_multiplier) * qty;
        }

        acc[room.room_category_id] = {
          category_id: room.room_category_id,
          category_name: room.category_name,
          base_price: room.base_price,
          calculated_price: baseAmount,
          rooms: []
        };
      }
      
      acc[room.room_category_id].rooms.push({
        id: room.id,
        room_number: room.room_number,
        floor: room.floor,
        capacity: room.capacity,
        extra_person_charge: room.extra_person_charge
      });
      
      return acc;
    }, {} as Record<string, any>);

    return res.status(200).json({ success: true, data: Object.values(grouped) });
  } catch (error) {
    next(error);
  }
};
