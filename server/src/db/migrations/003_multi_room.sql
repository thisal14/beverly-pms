-- Migration: Multi-Room Reservations
-- Transitions the system from 1-to-1 to 1-to-Many Reservation-to-Room relationship

-- 1. Create the junction table
CREATE TABLE IF NOT EXISTS reservation_rooms (
    id INT PRIMARY KEY AUTO_INCREMENT,
    reservation_id INT NOT NULL,
    room_id INT NOT NULL,
    package_type_id INT NOT NULL,
    package_quantity INT NOT NULL DEFAULT 1,
    num_adults INT NOT NULL DEFAULT 2,
    num_children INT NOT NULL DEFAULT 0,
    base_amount DECIMAL(10,2) NOT NULL,
    extra_person_charge DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reservation_id) REFERENCES reservations(id) ON DELETE CASCADE,
    FOREIGN KEY (room_id) REFERENCES rooms(id),
    FOREIGN KEY (package_type_id) REFERENCES package_types(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Migrate existing data (if any) from reservations to reservation_rooms
-- We use a subquery to handle the transfer of existing records
INSERT INTO reservation_rooms (
    reservation_id, 
    room_id, 
    package_type_id, 
    package_quantity, 
    num_adults, 
    num_children, 
    base_amount, 
    extra_person_charge
)
SELECT 
    id, 
    room_id, 
    package_type_id, 
    package_quantity, 
    IFNULL(num_people, 2), 
    0, 
    base_amount, 
    extra_person_charge
FROM reservations;

-- 3. Remove old columns from reservations table
-- Note: We keep total_amount, paid_amount, and balance as they are per-reservation totals
ALTER TABLE reservations 
DROP FOREIGN KEY reservations_ibfk_2, -- room_id
DROP FOREIGN KEY reservations_ibfk_3; -- package_type_id

ALTER TABLE reservations
DROP COLUMN room_id,
DROP COLUMN package_type_id,
DROP COLUMN package_quantity,
DROP COLUMN num_people,
DROP COLUMN base_amount,
DROP COLUMN extra_person_charge;

-- 4. Update reservation_guests to link to specific rooms (optional but recommended)
ALTER TABLE reservation_guests
ADD COLUMN reservation_room_id INT NULL AFTER reservation_id,
ADD FOREIGN KEY (reservation_room_id) REFERENCES reservation_rooms(id) ON DELETE SET NULL;
