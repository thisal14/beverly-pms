-- Seed Data for Beverly Hotels PMS

-- Hotels
INSERT IGNORE INTO hotels (id, name, slug, address, phone) VALUES 
(1, 'Beverly Hills', 'beverly-hills', '123 Hills Ave, City', '+1234567890'),
(2, 'Beverly Beach', 'beverly-beach', '456 Ocean Dr, Coast', '+1234567891'),
(3, 'Beverly Suites', 'beverly-suites', '789 Downtown, Metro', '+1234567892');

-- Users
-- Password for all seed users is 'Admin@1234'. The hash will be injected via node script.
INSERT INTO users (id, hotel_id, role, name, email, password_hash) VALUES
(1, NULL, 'super_admin', 'Super Admin', 'superadmin@beverly.com', '$$BCRYPT_HASH$$'),

(2, 1, 'admin', 'BH Admin', 'admin@beverly-hills.com', '$$BCRYPT_HASH$$'),
(3, 1, 'front_office', 'BH Front Office', 'fo@beverly-hills.com', '$$BCRYPT_HASH$$'),
(4, 1, 'purchasing_manager', 'BH Accounts', 'accounts@beverly-hills.com', '$$BCRYPT_HASH$$'),

(5, 2, 'admin', 'BB Admin', 'admin@beverly-beach.com', '$$BCRYPT_HASH$$'),
(6, 2, 'front_office', 'BB Front Office', 'fo@beverly-beach.com', '$$BCRYPT_HASH$$'),
(7, 2, 'purchasing_manager', 'BB Accounts', 'accounts@beverly-beach.com', '$$BCRYPT_HASH$$'),

(8, 3, 'admin', 'BS Admin', 'admin@beverly-suites.com', '$$BCRYPT_HASH$$'),
(9, 3, 'front_office', 'BS Front Office', 'fo@beverly-suites.com', '$$BCRYPT_HASH$$'),
(10, 3, 'purchasing_manager', 'BS Accounts', 'accounts@beverly-suites.com', '$$BCRYPT_HASH$$')
ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash);

-- Categories
INSERT IGNORE INTO room_categories (id, hotel_id, name, description, base_price, sort_order) VALUES
(1, 1, 'Standard', 'Cozy standard room', 10000.00, 1),
(2, 1, 'Deluxe', 'Spacious deluxe room', 15000.00, 2),
(3, 1, 'Entertainment', 'Room with entertainment system', 20000.00, 3),
(4, 1, 'Fish Therapy', 'Room with private fish therapy spa', 25000.00, 4),

(5, 2, 'Standard', 'Cozy standard room', 10000.00, 1),
(6, 2, 'Deluxe', 'Spacious deluxe room', 15000.00, 2),
(7, 2, 'Entertainment', 'Room with entertainment system', 20000.00, 3),
(8, 2, 'Fish Therapy', 'Room with private fish therapy spa', 25000.00, 4),

(9, 3, 'Standard', 'Cozy standard room', 10000.00, 1),
(10, 3, 'Deluxe', 'Spacious deluxe room', 15000.00, 2),
(11, 3, 'Entertainment', 'Room with entertainment system', 20000.00, 3),
(12, 3, 'Fish Therapy', 'Room with private fish therapy spa', 25000.00, 4);

-- Rooms
INSERT IGNORE INTO rooms (hotel_id, room_category_id, room_number, floor, capacity, extra_person_charge) VALUES
(1, 1, '101', 1, 2, 2000), (1, 1, '102', 1, 2, 2000), (1, 2, '201', 2, 2, 3000), (1, 2, '202', 2, 3, 3000), (1, 3, '301', 3, 4, 4000),
(1, 3, '302', 3, 4, 4000), (1, 4, '401', 4, 2, 5000), (1, 4, '402', 4, 2, 5000), (1, 1, '103', 1, 2, 2000), (1, 2, '203', 2, 3, 3000),

(2, 5, '101', 1, 2, 2000), (2, 5, '102', 1, 2, 2000), (2, 6, '201', 2, 2, 3000), (2, 6, '202', 2, 3, 3000), (2, 7, '301', 3, 4, 4000),
(2, 7, '302', 3, 4, 4000), (2, 8, '401', 4, 2, 5000), (2, 8, '402', 4, 2, 5000), (2, 5, '103', 1, 2, 2000), (2, 6, '203', 2, 3, 3000),

(3, 9, '101', 1, 2, 2000), (3, 9, '102', 1, 2, 2000), (3, 10, '201', 2, 2, 3000), (3, 10, '202', 2, 3, 3000), (3, 11, '301', 3, 4, 4000),
(3, 11, '302', 3, 4, 4000), (3, 12, '401', 4, 2, 5000), (3, 12, '402', 4, 2, 5000), (3, 9, '103', 1, 2, 2000), (3, 10, '203', 2, 3, 3000);

-- Packages
INSERT IGNORE INTO package_types (hotel_id, name, min_hours, max_hours, price_multiplier) VALUES
(1, 'Short Time', NULL, 4.00, 1.00), (1, 'Half Day', 4.01, 12.00, 1.50), (1, 'Full Day', 12.01, NULL, 2.00),
(2, 'Short Time', NULL, 4.00, 1.00), (2, 'Half Day', 4.01, 12.00, 1.50), (2, 'Full Day', 12.01, NULL, 2.00),
(3, 'Short Time', NULL, 4.00, 1.00), (3, 'Half Day', 4.01, 12.00, 1.50), (3, 'Full Day', 12.01, NULL, 2.00);
