import { db } from '../db/connection';
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

    await db.insertInto('audit_log').values({
      hotel_id:    hotelId,
      user_id:     userId,
      action,
      entity_type: entityType,
      entity_id:   entityId,
      old_data:    oldData ? JSON.stringify(oldData) : null,
      new_data:    newData ? JSON.stringify(newData) : null,
      ip_address:  ipAddress,
    }).execute();
  } catch (error) {
    console.error('Audit log failed:', error);
  }
}
