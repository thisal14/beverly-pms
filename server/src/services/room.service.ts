import { db } from '../db/connection';
import { AppError } from '../utils/app-error';

export interface GetAvailableRoomsDTO {
  hotelId: number;
  checkin: string;
  checkout: string;
  packageTypeId: number;
  packageQty: number;
}

export class RoomService {
  static async getAvailableRooms({ hotelId, checkin, checkout, packageTypeId, packageQty }: GetAvailableRoomsDTO) {
    const pkg = await db
      .selectFrom('package_types')
      .selectAll()
      .where('id', '=', packageTypeId)
      .where('hotel_id', '=', hotelId)
      .executeTakeFirst();

    if (!pkg) throw new AppError('Package not found', 404);

    const rooms = await db
      .selectFrom('rooms as r')
      .innerJoin('room_categories as c', 'r.room_category_id', 'c.id')
      .select([
        'r.id',
        'r.room_number',
        'r.floor',
        'r.capacity',
        'r.extra_person_charge',
        'r.room_category_id',
        'c.name as category_name',
        'c.base_price'
      ])
      .where('r.hotel_id', '=', hotelId)
      .where('r.is_active', '=', 1)
      .where('c.is_active', '=', 1)
      .where(({ not, exists, selectFrom }) => 
        not(exists(
          selectFrom('reservation_rooms as rr')
            .innerJoin('reservations as res', 'rr.reservation_id', 'res.id')
            .whereRef('rr.room_id', '=', 'r.id')
            .where('res.hotel_id', '=', hotelId)
            .where('res.status', 'not in', ['cancelled', 'no_show', 'checked_out'])
            .where('res.scheduled_checkin', '<', checkout)
            .where('res.scheduled_checkout', '>', checkin)
        ))
      )
      .orderBy('c.sort_order', 'asc')
      .orderBy('r.room_number', 'asc')
      .execute();

    const grouped = rooms.reduce((acc, room) => {
      if (!acc[room.room_category_id]) {
        let baseAmount = 0;
        if (pkg.flat_price) {
          baseAmount = parseFloat(pkg.flat_price as string) * packageQty;
        } else {
          baseAmount = parseFloat(room.base_price as string) * parseFloat(pkg.price_multiplier as string) * packageQty;
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
    }, {} as Record<number, any>);

    return Object.values(grouped);
  }
}
