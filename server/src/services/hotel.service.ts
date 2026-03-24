import { db } from '../db/connection';
import { AppError } from '../utils/app-error';

export interface CreateHotelDTO {
  name: string;
  slug?: string;
  address?: string;
  phone?: string;
  timezone?: string;
}

export interface UpdateHotelDTO extends Partial<CreateHotelDTO> {}

export class HotelService {
  static async getAllHotels() {
    return await db.selectFrom('hotels').selectAll().execute();
  }

  static async createHotel(data: CreateHotelDTO) {
    const result = await db.insertInto('hotels')
      .values({
        name: data.name,
        slug: data.slug || data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        address: data.address || '',
        phone: data.phone || '',
        timezone: data.timezone || 'Asia/Colombo'
      })
      .executeTakeFirst();
      
    return Number(result.insertId);
  }

  static async updateHotel(id: number, data: UpdateHotelDTO) {
    const current = await db
      .selectFrom('hotels')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();

    if (!current) throw new AppError('Hotel not found', 404);

    await db.updateTable('hotels')
      .set({
        name: data.name ?? current.name,
        slug: data.slug ?? current.slug,
        address: data.address ?? current.address,
        phone: data.phone ?? current.phone,
        timezone: data.timezone ?? current.timezone
      })
      .where('id', '=', id)
      .execute();
      
    return current;
  }
}
