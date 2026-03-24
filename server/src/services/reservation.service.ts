// reservation.service.ts chunk replacement
import { pool, db, query } from '../db/connection';
import { logAudit } from '../utils/audit.utils';
import { sql } from 'kysely';

export class ReservationService {
  
  static async createReservation(data: any, userId: number, reqCtx: any) {
    return await db.transaction().execute(async (trx) => {
      let totalReservationAmount = 0;
      const roomDetails: any[] = [];

      // 1. Process and validate all rooms
      for (const requestedRoom of data.rooms) {
        // Validate room Existence & Price
        const room = await trx.selectFrom('rooms')
          .innerJoin('room_categories', 'rooms.room_category_id', 'room_categories.id')
          .selectAll('rooms')
          .select('room_categories.base_price as category_base_price')
          .where('rooms.id', '=', requestedRoom.room_id)
          .where('rooms.hotel_id', '=', data.hotel_id)
          .executeTakeFirst();

        if (!room) throw new Error(`Room ID ${requestedRoom.room_id} not found or not in this hotel`);

        // Validate Availability
        const overlaps = await trx.selectFrom('reservations')
          .innerJoin('reservation_rooms', 'reservations.id', 'reservation_rooms.reservation_id')
          .select('reservations.id')
          .where('reservation_rooms.room_id', '=', requestedRoom.room_id)
          .where('reservations.status', 'not in', ['cancelled', 'no_show', 'checked_out'])
          .where('reservations.scheduled_checkin', '<', data.scheduled_checkout)
          .where('reservations.scheduled_checkout', '>', data.scheduled_checkin)
          .execute();

        if (overlaps.length) throw new Error(`Room ${room.room_number} is no longer available for these dates`);

        // Validate Package
        const pkg = await trx.selectFrom('package_types')
          .selectAll()
          .where('id', '=', requestedRoom.package_type_id)
          .where('hotel_id', '=', data.hotel_id)
          .executeTakeFirst();

        if (!pkg) throw new Error(`Package ID ${requestedRoom.package_type_id} not found`);

        // Calculate Amount per Room
        let roomBaseAmount = 0;
        if (pkg.flat_price !== null) {
          roomBaseAmount = parseFloat(pkg.flat_price as string) * requestedRoom.package_quantity;
        } else {
          roomBaseAmount = parseFloat(room.category_base_price as string) * parseFloat(pkg.price_multiplier as string) * requestedRoom.package_quantity;
        }

        // Calculate Extra Person Charge
        let extraCharge = 0;
        const totalPeople = requestedRoom.num_adults + requestedRoom.num_children;
        if (totalPeople > room.capacity) {
          extraCharge = parseFloat(room.extra_person_charge as string) * (totalPeople - room.capacity);
        }

        const roomTotal = roomBaseAmount + extraCharge;
        totalReservationAmount += roomTotal;

        roomDetails.push({
          ...requestedRoom,
          base_amount: roomBaseAmount,
          extra_person_charge: extraCharge
        });
      }

      const paidAmount = data.initial_payment ? data.initial_payment.amount : 0;

      // 2. Generate Reservation Number (Atomic Sequence)
      const hotel = await trx.selectFrom('hotels')
        .select('name')
        .where('id', '=', data.hotel_id)
        .executeTakeFirst();
      
      if (!hotel) throw new Error('Hotel not found');
      
      const initials = hotel.name.split(' ').map((n: string) => n[0]).join('').toUpperCase();
      const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
      
      // INSERT ... ON DUPLICATE KEY UPDATE atomic sequence
      await trx.executeQuery(
        sql`INSERT INTO hotel_sequences (hotel_id, sequence_date, seq)
            VALUES (${data.hotel_id}, CURDATE(), 1)
            ON DUPLICATE KEY UPDATE seq = seq + 1`.compile(trx)
      );
      
      const seqResult = await trx.selectFrom('hotel_sequences')
        .select('seq')
        .where('hotel_id', '=', data.hotel_id)
        .where('sequence_date', '=', sql`CURDATE()` as any)
        .executeTakeFirstOrThrow();

      const resNumber = `${initials}-${dateStr}-${seqResult.seq.toString().padStart(4, '0')}`;

      // Totals for the entire reservation
      const totalBaseAmount = roomDetails.reduce((sum, r) => sum + r.base_amount, 0);
      const totalExtraChargeSum = roomDetails.reduce((sum, r) => sum + r.extra_person_charge, 0);

      // 3. Insert Main Reservation
      const resResult = await trx.insertInto('reservations')
        .values({
          hotel_id: data.hotel_id,
          reservation_number: resNumber,
          customer_name: data.customer_name,
          customer_phone: data.customer_phone,
          customer_nic_passport: data.customer_nic_passport,
          scheduled_checkin: data.scheduled_checkin,
          scheduled_checkout: data.scheduled_checkout,
          base_amount: totalBaseAmount,
          extra_person_charge: totalExtraChargeSum,
          total_amount: totalReservationAmount,
          paid_amount: paidAmount,
          created_by: userId
        })
        .executeTakeFirst();

      const reservationId = Number(resResult.insertId);

      // 4. Insert Reservation Rooms
      for (const roomItem of roomDetails) {
        await trx.insertInto('reservation_rooms')
          .values({
            reservation_id: reservationId,
            room_id: roomItem.room_id,
            package_type_id: roomItem.package_type_id,
            package_quantity: roomItem.package_quantity,
            num_adults: roomItem.num_adults,
            num_children: roomItem.num_children,
            base_amount: roomItem.base_amount,
            extra_person_charge: roomItem.extra_person_charge
          })
          .execute();
      }

      // 5. Insert Initial Payment
      if (data.initial_payment && data.initial_payment.amount > 0) {
        await trx.insertInto('payments')
          .values({
            reservation_id: reservationId,
            amount: data.initial_payment.amount,
            payment_method: data.initial_payment.method,
            payment_stage: 'reservation',
            reference_number: data.initial_payment.reference || null,
            created_by: userId
          })
          .execute();
      }

      // Audit Log
      if (reqCtx) {
         await logAudit(reqCtx, 'CREATE_RESERVATION', 'reservations', reservationId, null, { resNumber, amount: totalReservationAmount });
      }

      return { id: reservationId, reservation_number: resNumber };
    });
  }

  private static applyFilters(qb: any, filters: any) {
    const { hotel_id, status, date_from, date_to, room_id } = filters;
    let query = qb;
    
    if (hotel_id && !isNaN(Number(hotel_id))) {
      query = query.where('reservations.hotel_id', '=', Number(hotel_id));
    }
    if (status && status !== 'undefined') {
      query = query.where('reservations.status', '=', status);
    }
    if (room_id && !isNaN(Number(room_id))) {
      query = query.where(({ exists, selectFrom }: any) => 
        exists(
          selectFrom('reservation_rooms')
            .whereRef('reservation_rooms.reservation_id', '=', 'reservations.id')
            .where('reservation_rooms.room_id', '=', Number(room_id))
        )
      );
    }
    if (date_from && date_from !== 'undefined') {
      query = query.where('reservations.scheduled_checkin', '>=', date_from);
    }
    if (date_to && date_to !== 'undefined') {
      query = query.where('reservations.scheduled_checkin', '<=', date_to);
    }
    return query;
  }

  static async getReservations(filters: any, pagination: { limit: number, page: number }) {
    const { limit, page } = pagination;

    let baseDataQuery = db.selectFrom('reservations')
      .innerJoin('hotels', 'reservations.hotel_id', 'hotels.id')
      .selectAll('reservations')
      .select('hotels.name as hotel_name')
      .select((eb) => [
        eb.selectFrom('reservation_rooms')
          .innerJoin('rooms', 'reservation_rooms.room_id', 'rooms.id')
          .select(sql<string>`group_concat(rooms.room_number separator ', ')`.as('room_sum'))
          .whereRef('reservation_rooms.reservation_id', '=', 'reservations.id')
          .as('room_sum')
      ]);

    const dataQuery = this.applyFilters(baseDataQuery, filters)
      .orderBy('reservations.created_at', 'desc')
      .limit(limit)
      .offset((page - 1) * limit);

    const results = await dataQuery.execute();

    let baseCountQuery = db.selectFrom('reservations')
      .select(sql<number>`count(*)`.as('total'));

    // Count query uses the exact same filters helper
    const countQuery = this.applyFilters(baseCountQuery, filters);
    const { total } = await countQuery.executeTakeFirstOrThrow();

    return {
      data: results,
      pagination: {
        total: Number(total) || 0,
        page,
        limit
      }
    };
  }

  static async getReservationById(id: number) {
    const reservation = await db.selectFrom('reservations')
      .innerJoin('hotels', 'reservations.hotel_id', 'hotels.id')
      .selectAll('reservations')
      .select('hotels.name as hotel_name')
      .where('reservations.id', '=', id)
      .executeTakeFirst();

    if (!reservation) throw new Error('Reservation not found');
    
    const rooms = await db.selectFrom('reservation_rooms')
      .innerJoin('rooms', 'reservation_rooms.room_id', 'rooms.id')
      .innerJoin('room_categories', 'rooms.room_category_id', 'room_categories.id')
      .innerJoin('package_types', 'reservation_rooms.package_type_id', 'package_types.id')
      .selectAll('reservation_rooms')
      .select([
        'rooms.room_number',
        'rooms.capacity',
        'room_categories.name as category_name',
        'package_types.name as package_name'
      ])
      .where('reservation_rooms.reservation_id', '=', id)
      .execute();

    const payments = await db.selectFrom('payments')
      .selectAll()
      .where('reservation_id', '=', id)
      .orderBy('created_at', 'asc')
      .execute();

    const guests = await db.selectFrom('reservation_guests')
      .selectAll()
      .where('reservation_id', '=', id)
      .execute();

    return {
      ...reservation,
      reservation_rooms: rooms,
      payments,
      guests
    };
  }

  static async getReservationTimeline(hotelId: number, fromDate: string, toDate: string) {
    // 1. Fetch all rooms for the hotel
    const rooms = await db.selectFrom('rooms')
      .innerJoin('room_categories', 'rooms.room_category_id', 'room_categories.id')
      .select([
        'rooms.id',
        'rooms.room_number',
        'rooms.floor',
        'rooms.capacity',
        'rooms.status as room_status',
        'room_categories.name as category_name'
      ])
      .where('rooms.hotel_id', '=', hotelId)
      .where('rooms.is_active', '=', 1)
      .orderBy('rooms.room_number', 'asc')
      .execute();

    // 2. Fetch reservations overlapping the date range
    const fromTime = fromDate + ' 00:00:00';
    const toTime = toDate + ' 23:59:59';

    const reservations = await db.selectFrom('reservations')
      .innerJoin('reservation_rooms', 'reservations.id', 'reservation_rooms.reservation_id')
      .select([
        'reservations.id as reservation_id',
        'reservations.reservation_number',
        'reservations.customer_name',
        'reservations.status as reservation_status',
        'reservations.scheduled_checkin',
        'reservations.scheduled_checkout',
        'reservation_rooms.room_id'
      ])
      .where('reservations.hotel_id', '=', hotelId)
      .where('reservations.status', '!=', 'cancelled')
      .where((eb) => eb.or([
        eb.and([
          eb('reservations.scheduled_checkin', '<=', toTime),
          eb('reservations.scheduled_checkout', '>=', fromTime)
        ]),
        eb.and([
          eb('reservations.scheduled_checkin', '>=', fromTime),
          eb('reservations.scheduled_checkin', '<=', toTime)
        ]),
        eb.and([
          eb('reservations.scheduled_checkout', '>=', fromTime),
          eb('reservations.scheduled_checkout', '<=', toTime)
        ])
      ]))
      .execute();

    return { rooms, reservations };
  }
}
