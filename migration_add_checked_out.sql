-- Migration: Add checked_out column to receipts table
-- Run this in your Supabase SQL Editor

-- Add the checked_out column with default value false
ALTER TABLE receipts 
ADD COLUMN IF NOT EXISTS checked_out BOOLEAN DEFAULT false;

-- Update all existing receipts to have checked_out = false (for existing data)
UPDATE receipts 
SET checked_out = false 
WHERE checked_out IS NULL;

-- Create an index for better query performance when filtering by checked_out
CREATE INDEX IF NOT EXISTS idx_receipts_checked_out ON receipts(checked_out);

-- Optional: Create a composite index for common queries (location + checked_out)
CREATE INDEX IF NOT EXISTS idx_receipts_location_checked_out ON receipts(location, checked_out);

