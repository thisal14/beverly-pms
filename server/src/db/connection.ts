import mysql from 'mysql2/promise';
import mysqlCallback from 'mysql2';
import dotenv from 'dotenv';
import path from 'path';
import { Kysely, MysqlDialect } from 'kysely';
import { Database } from './db';

// Support running this file directly or from the app
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const config = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'beverly_pms',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

// Main promise-based pool used by the rest of the app
export const pool = mysql.createPool(config);

// Dedicated non-promise pool for Kysely compatibility
const kyselyPool = mysqlCallback.createPool(config);

/**
 * Kysely instance for type-safe queries
 */
export const db = new Kysely<Database>({
  dialect: new MysqlDialect({
    pool: kyselyPool
  })
});

/**
 * Execute a query with type casting.
 * @deprecated Use the Kysely `db` instance instead for new code.
 */
export async function query<T>(sql: string, params?: any[]): Promise<T> {
  const [results] = await pool.query(sql, params);
  return results as T;
}

/**
 * Get a single row.
 * @deprecated Use the Kysely `db` instance instead for new code.
 */
export async function queryOne<T>(sql: string, params?: any[]): Promise<T | null> {
  const [results] = await pool.query(sql, params);
  const rows = results as any[];
  return rows.length > 0 ? (rows[0] as T) : null;
}
