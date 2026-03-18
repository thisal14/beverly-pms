# Beverly Hotels PMS

A full-stack Property Management System for the Beverly Hotel chain.

## Prerequisites
- Node.js 18+
- MySQL 8+

## Setup Instructions

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Database Setup**
   - Ensure MySQL is running locally.
   - Create a database: `CREATE DATABASE beverly_pms;`
   - Import the schema: `mysql -u root -p beverly_pms < server/src/db/migrations/001_schema.sql`
   - Import the seed data: `mysql -u root -p beverly_pms < server/src/db/migrations/002_seed.sql`

3. **Environment Variables**
   - Copy `.env.example` to `server/.env` and update your database credentials.
   - Copy `client/.env.example` to `client/.env`.

4. **Run the Application**
   - Terminal 1 (Backend): `npm run dev:server`
   - Terminal 2 (Frontend): `npm run dev:client`
   - Note: make sure to build the shared package first if needed: `npm run build:shared`

## Accounts (Seed Data)
- Super Admin: `superadmin@beverly.com` / `Admin@1234`
- Hotel Admin (Beverly Hills): `admin@beverly-hills.com` / `Admin@1234`
