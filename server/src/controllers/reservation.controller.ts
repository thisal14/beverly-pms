import { Request, Response, NextFunction } from 'express';
import { query, pool } from '../db/connection';
import { z } from 'zod';
import { logAudit } from '../utils/audit.utils';
import { RoomCategory, PackageType, Room } from '@beverly-pms/shared';

const createReservationSchema = z.object({
  hotel_id: z.number(),
  room_id: z.number(),
  package_type_id: z.number(),
  package_quantity: z.number().default(1),
  customer_name: z.string().min(1),
  customer_phone: z.string().min(1),
  customer_nic_passport: z.string().min(1),
  num_people: z.number().nullable().optional(),
  scheduled_checkin: z.string().datetime(),
  scheduled_checkout: z.string().datetime(),
  initial_payment: z.object({
    amount: z.number().min(0),
    method: z.enum(['cash', 'card', 'bank_transfer', 'online', 'other']),
    reference: z.string().optional()
  }).optional()
});

export const createReservation = async (req: Request, res: Response, next: NextFunction) => {
  const connection = await pool.getConnection();
  try {
    const data = createReservationSchema.parse(req.body);
    await connection.beginTransaction();

    // 1. Validate room and package
    const [rooms] = await connection.query<any[]>(
      `SELECT r.*, c.base_price FROM rooms r JOIN room_categories c ON r.room_category_id = c.id WHERE r.id = ? AND r.hotel_id = ?`,
      [data.room_id, data.hotel_id]
    );
    if (!rooms.length) throw new Error('Room not found or not in this hotel');
    const room = rooms[0];

    // We should also validate overlap to be safe!
    const [overlaps] = await connection.query<any[]>(
      `SELECT id FROM reservations WHERE room_id = ? AND status NOT IN ('cancelled', 'no_show', 'checked_out') AND scheduled_checkin < ? AND scheduled_checkout > ?`,
      [data.room_id, data.scheduled_checkout, data.scheduled_checkin]
    );
    if (overlaps.length) throw new Error('Room is no longer available for these dates');

    const [pkgs] = await connection.query<any[]>(
      `SELECT * FROM package_types WHERE id = ? AND hotel_id = ?`,
      [data.package_type_id, data.hotel_id]
    );
    if (!pkgs.length) throw new Error('Package not found or not in this hotel');
    const pkg = pkgs[0];

    // 2. Calculate Base Amount
    let baseAmount = 0;
    if (pkg.flat_price !== null) {
      baseAmount = parseFloat(pkg.flat_price) * data.package_quantity;
    } else {
      baseAmount = parseFloat(room.base_price) * parseFloat(pkg.price_multiplier) * data.package_quantity;
    }

    const totalAmount = baseAmount; // Start with base amount. Additional fees calculated at check-in/out.
    const paidAmount = data.initial_payment ? data.initial_payment.amount : 0;

    // 3. Generate Reservation Number (BH-YYYYMMDD-0001)
    const [hotel] = await connection.query<any[]>(`SELECT name FROM hotels WHERE id = ?`, [data.hotel_id]);
    const initials = hotel[0].name.split(' ').map((n: string) => n[0]).join('').toUpperCase();
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    
    // Get count for today
    const [counts] = await connection.query<any[]>(
      `SELECT COUNT(*) as count FROM reservations WHERE hotel_id = ? AND DATE(created_at) = CURDATE()`,
      [data.hotel_id]
    );
    const count = counts[0].count + 1;
    const resNumber = `${initials}-${dateStr}-${count.toString().padStart(4, '0')}`;

    // 4. Insert Reservation
    const insertSql = `
      INSERT INTO reservations (
        hotel_id, reservation_number, room_id, package_type_id, package_quantity,
        customer_name, customer_phone, customer_nic_passport, num_people,
        scheduled_checkin, scheduled_checkout, base_amount, total_amount, paid_amount, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    // Explicitly format dates to MySQL datetime format 'YYYY-MM-DD HH:MM:SS'
    const formatDateTime = (iso: string) => new Date(iso).toISOString().slice(0, 19).replace('T', ' ');

    const [resResult] = await connection.query<any>(insertSql, [
      data.hotel_id, resNumber, data.room_id, data.package_type_id, data.package_quantity,
      data.customer_name, data.customer_phone, data.customer_nic_passport, data.num_people || null,
      formatDateTime(data.scheduled_checkin), formatDateTime(data.scheduled_checkout),
      baseAmount, totalAmount, paidAmount, req.user!.id
    ]);

    const reservationId = resResult.insertId;

    // 5. Insert Initial Payment if present
    if (data.initial_payment && data.initial_payment.amount > 0) {
      const paySql = `
        INSERT INTO payments (reservation_id, amount, payment_method, payment_stage, reference_number, created_by)
        VALUES (?, ?, ?, 'reservation', ?, ?)
      `;
      await connection.query(paySql, [
        reservationId, data.initial_payment.amount, data.initial_payment.method, 
        data.initial_payment.reference || null, req.user!.id
      ]);
    }

    await connection.commit();

    await logAudit(req, 'CREATE_RESERVATION', 'reservations', reservationId, null, { resNumber, amount: totalAmount });

    res.status(201).json({ success: true, message: 'Reservation created', data: { id: reservationId, reservation_number: resNumber } });

  } catch (error: any) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
};

export const getReservations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { hotel_id, status, date_from, date_to, room_id, page, limit } = req.query;

    const parsedLimit = parseInt(limit as string) || 10;
    const parsedPage = Math.max(1, parseInt(page as string) || 1);

    let sql = `
      SELECT res.*, r.room_number, pt.name as package_name, h.name as hotel_name
      FROM reservations res
      JOIN rooms r ON res.room_id = r.id
      JOIN package_types pt ON res.package_type_id = pt.id
      JOIN hotels h ON res.hotel_id = h.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (hotel_id && !isNaN(Number(hotel_id))) { sql += ` AND res.hotel_id = ?`; params.push(Number(hotel_id)); }
    if (status && status !== 'undefined') { sql += ` AND res.status = ?`; params.push(status); }
    if (room_id && !isNaN(Number(room_id))) { sql += ` AND res.room_id = ?`; params.push(Number(room_id)); }
    if (date_from && date_from !== 'undefined') { sql += ` AND res.scheduled_checkin >= ?`; params.push(date_from); }
    if (date_to && date_to !== 'undefined') { sql += ` AND res.scheduled_checkin <= ?`; params.push(date_to); }

    sql += ` ORDER BY res.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(parsedLimit as any, 10), parseInt(String((parsedPage - 1) * parsedLimit), 10));

    const results = await query<any[]>(sql, params);

    // Get total count for pagination
    let countSql = `SELECT COUNT(*) as total FROM reservations res WHERE 1=1`;
    const countParams: any[] = [];
    if (hotel_id && !isNaN(Number(hotel_id))) { countSql += ` AND res.hotel_id = ?`; countParams.push(Number(hotel_id)); }
    if (status && status !== 'undefined') { countSql += ` AND res.status = ?`; countParams.push(status); }
    if (room_id && !isNaN(Number(room_id))) { countSql += ` AND res.room_id = ?`; countParams.push(Number(room_id)); }
    if (date_from && date_from !== 'undefined') { countSql += ` AND res.scheduled_checkin >= ?`; countParams.push(date_from); }
    if (date_to && date_to !== 'undefined') { countSql += ` AND res.scheduled_checkin <= ?`; countParams.push(date_to); }

    const [totalResult] = await query<any[]>(countSql, countParams);

    res.status(200).json({
      success: true,
      data: results,
      pagination: {
        total: totalResult.total || 0,
        page: parsedPage,
        limit: parsedLimit
      }
    });

  } catch (error) {
    next(error);
  }
};

export const getReservationById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseInt(req.params.id);
    
    // Multi-query or separate queries
    const sql = `
      SELECT res.*, r.room_number, r.capacity, r.extra_person_charge, r.early_checkin_fee, r.late_checkout_fee,
             pt.name as package_name, c.name as category_name
      FROM reservations res
      JOIN rooms r ON res.room_id = r.id
      JOIN room_categories c ON r.room_category_id = c.id
      JOIN package_types pt ON res.package_type_id = pt.id
      WHERE res.id = ?
    `;
    const reservations = await query<any[]>(sql, [id]);
    if (!reservations.length) return res.status(404).json({ success: false, message: 'Reservation not found' });
    
    const reservation = reservations[0];

    const payments = await query<any[]>(`SELECT * FROM payments WHERE reservation_id = ? ORDER BY created_at ASC`, [id]);
    const guests = await query<any[]>(`SELECT * FROM reservation_guests WHERE reservation_id = ?`, [id]);

    reservation.payments = payments;
    reservation.guests = guests;

    res.status(200).json({ success: true, data: reservation });
  } catch (error) {
    next(error);
  }
};
