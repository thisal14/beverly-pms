import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const config = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  multipleStatements: true
};

const DB_NAME = process.env.DB_NAME || 'beverly_pms';

async function migrate() {
  let connection;
  try {
    console.log('Connecting to MySQL...');
    connection = await mysql.createConnection(config);

    console.log(`Ensuring database "${DB_NAME}" exists...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\``);
    await connection.query(`USE \`${DB_NAME}\``);

    console.log('Generating seed password hash...');
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('Admin@1234', salt);

    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

    for (const file of files) {
      console.log(`Running migration: ${file}...`);
      let sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      
      // Replace placeholder with real hash
      sql = sql.replace(/\$\$BCRYPT_HASH\$\$/g, hash);
      
      await connection.query(sql);
      console.log(`Successfully applied ${file}`);
    }

    console.log('All migrations completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

migrate();
