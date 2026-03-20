import { query, pool } from '../db/connection';
import { logAudit } from '../utils/audit.utils';

export class ReservationService {
  
  static async createReservation(data: any, userId: number, reqCtx: any) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      let totalReservationAmount = 0;
      const roomDetails: any[] = [];

      // 1. Process and validate all rooms
      for (const requestedRoom of data.rooms) {
        // Validate room Existence & Price
        const [rooms] = await connection.query<any[]>(
          `SELECT r.*, c.base_price FROM rooms r JOIN room_categories c ON r.room_category_id = c.id WHERE r.id = ? AND r.hotel_id = ?`,
          [requestedRoom.room_id, data.hotel_id]
        );
        if (!rooms.length) throw new Error(`Room ID ${requestedRoom.room_id} not found or not in this hotel`);
        const room = rooms[0];

        // Validate Availability
        const [overlaps] = await connection.query<any[]>(
          `SELECT res.id FROM reservations res 
           JOIN reservation_rooms rr ON res.id = rr.reservation_id
           WHERE rr.room_id = ? AND res.status NOT IN ('cancelled', 'no_show', 'checked_out') 
           AND res.scheduled_checkin < ? AND res.scheduled_checkout > ?`,
          [requestedRoom.room_id, data.scheduled_checkout, data.scheduled_checkin]
        );
        if (overlaps.length) throw new Error(`Room ${room.room_number} is no longer available for these dates`);

        // Validate Package
        const [pkgs] = await connection.query<any[]>(
          `SELECT * FROM package_types WHERE id = ? AND hotel_id = ?`,
          [requestedRoom.package_type_id, data.hotel_id]
        );
        if (!pkgs.length) throw new Error(`Package ID ${requestedRoom.package_type_id} not found`);
        const pkg = pkgs[0];

        // Calculate Amount per Room
        let roomBaseAmount = 0;
        if (pkg.flat_price !== null) {
          roomBaseAmount = parseFloat(pkg.flat_price) * requestedRoom.package_quantity;
        } else {
          roomBaseAmount = parseFloat(room.base_price) * parseFloat(pkg.price_multiplier) * requestedRoom.package_quantity;
        }

        // Calculate Extra Person Charge
        let extraCharge = 0;
        const totalPeople = requestedRoom.num_adults + requestedRoom.num_children;
        if (totalPeople > room.capacity) {
          extraCharge = parseFloat(room.extra_person_charge) * (totalPeople - room.capacity);
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

      // 2. Generate Reservation Number
      const [hotel] = await connection.query<any[]>(`SELECT name FROM hotels WHERE id = ?`, [data.hotel_id]);
      const initials = hotel[0].name.split(' ').map((n: string) => n[0]).join('').toUpperCase();
      const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
      
      const [counts] = await connection.query<any[]>(
        `SELECT COUNT(*) as count FROM reservations WHERE hotel_id = ? AND DATE(created_at) = CURDATE()`,
        [data.hotel_id]
      );
      const count = counts[0].count + 1;
      const resNumber = `${initials}-${dateStr}-${count.toString().padStart(4, '0')}`;

      // Totals for the entire reservation
      const totalBaseAmount = roomDetails.reduce((sum, r) => sum + r.base_amount, 0);
      const totalExtraChargeSum = roomDetails.reduce((sum, r) => sum + r.extra_person_charge, 0);

      // 3. Insert Main Reservation
      const insertResSql = `
        INSERT INTO reservations (
          hotel_id, reservation_number, customer_name, customer_phone, customer_nic_passport,
          scheduled_checkin, scheduled_checkout, base_amount, extra_person_charge, total_amount, paid_amount, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const formatDateTime = (iso: string) => new Date(iso).toISOString().slice(0, 19).replace('T', ' ');

      const [resResult] = await connection.query<any>(insertResSql, [
        data.hotel_id, resNumber, data.customer_name, data.customer_phone, data.customer_nic_passport,
        formatDateTime(data.scheduled_checkin), formatDateTime(data.scheduled_checkout),
        totalBaseAmount, totalExtraChargeSum, totalReservationAmount, paidAmount, userId
      ]);

      const reservationId = resResult.insertId;

      // 4. Insert Reservation Rooms
      const insertRoomSql = `
        INSERT INTO reservation_rooms (
          reservation_id, room_id, package_type_id, package_quantity, 
          num_adults, num_children, base_amount, extra_person_charge
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;

      for (const roomItem of roomDetails) {
        await connection.query(insertRoomSql, [
          reservationId, roomItem.room_id, roomItem.package_type_id, roomItem.package_quantity,
          roomItem.num_adults, roomItem.num_children, roomItem.base_amount, roomItem.extra_person_charge
        ]);
      }

      // 5. Insert Initial Payment
      if (data.initial_payment && data.initial_payment.amount > 0) {
        const paySql = `
          INSERT INTO payments (reservation_id, amount, payment_method, payment_stage, reference_number, created_by)
          VALUES (?, ?, ?, 'reservation', ?, ?)
        `;
        await connection.query(paySql, [
          reservationId, data.initial_payment.amount, data.initial_payment.method, 
          data.initial_payment.reference || null, userId
        ]);
      }

      await connection.commit();
      
      // Need req object for IP mapping in logAudit, pass it somehow or abstract audit log
      if (reqCtx) {
         await logAudit(reqCtx, 'CREATE_RESERVATION', 'reservations', reservationId, null, { resNumber, amount: totalReservationAmount });
      }

      return { id: reservationId, reservation_number: resNumber };

    } catch (error: any) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async getReservations(filters: any, pagination: { limit: number, page: number }) {
    const { hotel_id, status, date_from, date_to, room_id } = filters;
    const { limit, page } = pagination;

    let sql = `
      SELECT res.*, h.name as hotel_name,
             (SELECT GROUP_CONCAT(r.room_number SEPARATOR ', ') 
              FROM reservation_rooms rr 
              JOIN rooms r ON rr.room_id = r.id 
              WHERE rr.reservation_id = res.id) as room_sum
      FROM reservations res
      JOIN hotels h ON res.hotel_id = h.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (hotel_id && !isNaN(Number(hotel_id))) { sql += ` AND res.hotel_id = ?`; params.push(Number(hotel_id)); }
    if (status && status !== 'undefined') { sql += ` AND res.status = ?`; params.push(status); }
    if (room_id && !isNaN(Number(room_id))) { 
      sql += ` AND EXISTS (SELECT 1 FROM reservation_rooms rr WHERE rr.reservation_id = res.id AND rr.room_id = ?)`; 
      params.push(Number(room_id)); 
    }
    if (date_from && date_from !== 'undefined') { sql += ` AND res.scheduled_checkin >= ?`; params.push(date_from); }
    if (date_to && date_to !== 'undefined') { sql += ` AND res.scheduled_checkin <= ?`; params.push(date_to); }

    sql += ` ORDER BY res.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, (page - 1) * limit);

    const results = await query<any[]>(sql, params);

    // Get total count for pagination
    let countSql = `SELECT COUNT(*) as total FROM reservations res WHERE 1=1`;
    const countParams: any[] = [];
    if (hotel_id && !isNaN(Number(hotel_id))) { countSql += ` AND res.hotel_id = ?`; countParams.push(Number(hotel_id)); }
    if (status && status !== 'undefined') { countSql += ` AND res.status = ?`; countParams.push(status); }
    if (room_id && !isNaN(Number(room_id))) { 
      countSql += ` AND EXISTS (SELECT 1 FROM reservation_rooms rr WHERE rr.reservation_id = res.id AND rr.room_id = ?)`; 
      countParams.push(Number(room_id)); 
    }
    if (date_from && date_from !== 'undefined') { countSql += ` AND res.scheduled_checkin >= ?`; countParams.push(date_from); }
    if (date_to && date_to !== 'undefined') { countSql += ` AND res.scheduled_checkin <= ?`; countParams.push(date_to); }

    const [totalResult] = await query<any[]>(countSql, countParams);

    return {
      data: results,
      pagination: {
        total: totalResult.total || 0,
        page,
        limit
      }
    };
  }

  static async getReservationById(id: number) {
    const sql = `
      SELECT res.*, h.name as hotel_name
      FROM reservations res
      JOIN hotels h ON res.hotel_id = h.id
      WHERE res.id = ?
    `;
    const reservations = await query<any[]>(sql, [id]);
    if (!reservations.length) throw new Error('Reservation not found');
    
    const reservation = reservations[0];

    const resRoomsSql = `
      SELECT rr.*, r.room_number, r.capacity, c.name as category_name, pt.name as package_name
      FROM reservation_rooms rr
      JOIN rooms r ON rr.room_id = r.id
      JOIN room_categories c ON r.room_category_id = c.id
      JOIN package_types pt ON rr.package_type_id = pt.id
      WHERE rr.reservation_id = ?
    `;
    const rooms = await query<any[]>(resRoomsSql, [id]);
    const payments = await query<any[]>(`SELECT * FROM payments WHERE reservation_id = ? ORDER BY created_at ASC`, [id]);
    const guests = await query<any[]>(`SELECT * FROM reservation_guests WHERE reservation_id = ?`, [id]);

    reservation.reservation_rooms = rooms;
    reservation.payments = payments;
    reservation.guests = guests;

    return reservation;
  }

  static async getReservationTimeline(hotelId: number, fromDate: string, toDate: string) {
    // 1. Fetch all rooms for the hotel
    const roomsSql = `
      SELECT r.id, r.room_number, r.floor, r.capacity, r.status as room_status, c.name as category_name
      FROM rooms r
      JOIN room_categories c ON r.room_category_id = c.id
      WHERE r.hotel_id = ? AND r.is_active = TRUE
      ORDER BY r.room_number ASC
    `;
    const rooms = await query<any[]>(roomsSql, [hotelId]);

    // 2. Fetch reservations overlapping the date range
    const resSql = `
      SELECT 
        res.id as reservation_id,
        res.reservation_number,
        res.customer_name,
        res.status as reservation_status,
        res.scheduled_checkin,
        res.scheduled_checkout,
        rr.room_id
      FROM reservations res
      JOIN reservation_rooms rr ON res.id = rr.reservation_id
      WHERE res.hotel_id = ? 
        AND res.status != 'cancelled'
        AND (
          (res.scheduled_checkin <= ? AND res.scheduled_checkout >= ?) OR
          (res.scheduled_checkin BETWEEN ? AND ?) OR
          (res.scheduled_checkout BETWEEN ? AND ?)
        )
    `;
    
    // The dates need time components for accurate overlap checking
    const fromTime = fromDate + ' 00:00:00';
    const toTime = toDate + ' 23:59:59';
    
    const reservations = await query<any[]>(resSql, [
      hotelId, 
      toTime, fromTime, // overlapping
      fromTime, toTime, // starts inside
      fromTime, toTime  // ends inside
    ]);

    return { rooms, reservations };
  }
}
