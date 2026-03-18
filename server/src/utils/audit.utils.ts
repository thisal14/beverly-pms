import { query } from '../db/connection';
import { Request } from 'express';

export async function logAudit(
  req: Request | null,
  action: string,
  entityType: string,
  entityId: number | null = null,
  oldData: any = null,
  newData: any = null
) {
  try {
    const userId = req?.user?.id || null;
    const hotelId = req?.user?.hotel_id || null;
    const ipAddress = req?.ip || null;

    const sql = `
      INSERT INTO audit_log 
      (hotel_id, user_id, action, entity_type, entity_id, old_data, new_data, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    await query(sql, [
      hotelId,
      userId,
      action,
      entityType,
      entityId,
      oldData ? JSON.stringify(oldData) : null,
      newData ? JSON.stringify(newData) : null,
      ipAddress
    ]);
  } catch (error) {
    console.error('Audit log failed:', error);
  }
}
