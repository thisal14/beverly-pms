-- Migration: Add summary total columns back to reservations
-- These columns store the aggregated totals for easier reporting and UI display.

ALTER TABLE reservations
ADD COLUMN base_amount DECIMAL(10,2) DEFAULT 0.00 AFTER scheduled_checkout,
ADD COLUMN extra_person_charge DECIMAL(10,2) DEFAULT 0.00 AFTER early_checkin_fee;

-- Update existing data by summing up from reservation_rooms
UPDATE reservations res
SET 
    res.base_amount = (SELECT IFNULL(SUM(rr.base_amount), 0) FROM reservation_rooms rr WHERE rr.reservation_id = res.id),
    res.extra_person_charge = (SELECT IFNULL(SUM(rr.extra_person_charge), 0) FROM reservation_rooms rr WHERE rr.reservation_id = res.id);
