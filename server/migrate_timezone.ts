import { pool } from './src/db/connection.js';

async function migrate() {
  try {
    await pool.query("ALTER TABLE hotels ADD COLUMN timezone VARCHAR(50) DEFAULT 'Asia/Colombo'");
    console.log("Migration successful");
  } catch (err: any) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log("Column already exists");
    } else {
      console.error(err);
    }
  } finally {
    process.exit(0);
  }
}

migrate();
