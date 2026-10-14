-- Add ecosystem items columns to user_stats table
-- Run this in Supabase SQL Editor to add plant/elf tracking

-- Add new columns for tracking unlocked items
ALTER TABLE user_stats 
ADD COLUMN IF NOT EXISTS grass_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS tree_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS elf_count INTEGER DEFAULT 0;

-- Update the function to handle item count updates
CREATE OR REPLACE FUNCTION update_user_stats_items()
RETURNS TRIGGER AS $$
BEGIN
  -- This function is called when items are unlocked
  -- NEW.item_type: 'grass', 'tree', or 'elf'
  -- NEW.quantity: number to add
  
  IF NEW.item_type = 'grass' THEN
    UPDATE user_stats 
    SET grass_count = grass_count + NEW.quantity,
        updated_at = TIMEZONE('utc', NOW())
    WHERE user_id = NEW.user_id;
  ELSIF NEW.item_type = 'tree' THEN
    UPDATE user_stats 
    SET tree_count = tree_count + NEW.quantity,
        updated_at = TIMEZONE('utc', NOW())
    WHERE user_id = NEW.user_id;
  ELSIF NEW.item_type = 'elf' THEN
    UPDATE user_stats 
    SET elf_count = elf_count + NEW.quantity,
        updated_at = TIMEZONE('utc', NOW())
    WHERE user_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a table to track item unlocks
CREATE TABLE IF NOT EXISTS item_unlocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL, -- 'grass', 'tree', 'elf'
  quantity INTEGER NOT NULL DEFAULT 1,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create index for item unlocks
CREATE INDEX IF NOT EXISTS idx_item_unlocks_user_id ON item_unlocks(user_id);
CREATE INDEX IF NOT EXISTS idx_item_unlocks_item_type ON item_unlocks(item_type);

-- Enable RLS for item_unlocks
ALTER TABLE item_unlocks ENABLE ROW LEVEL SECURITY;

-- Policy for item_unlocks
CREATE POLICY "Users can view own item unlocks"
  ON item_unlocks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own item unlocks"
  ON item_unlocks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT, INSERT ON item_unlocks TO authenticated;

-- Comment: This schema extension provides:
-- 1. Tracking of grass, tree, and elf counts in user_stats
-- 2. Historical record of item unlocks in item_unlocks table
-- 3. Function to update item counts when items are unlocked
