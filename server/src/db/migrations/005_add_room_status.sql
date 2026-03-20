-- Migration: Add status column to rooms
ALTER TABLE rooms ADD COLUMN status ENUM('available', 'maintenance') DEFAULT 'available' AFTER capacity;
