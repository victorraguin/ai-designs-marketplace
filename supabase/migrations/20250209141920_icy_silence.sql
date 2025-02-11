/*
  # Add shipping addresses table

  1. New Tables
    - `shipping_addresses`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references user_profiles)
      - `is_default` (boolean)
      - `first_name` (text)
      - `last_name` (text)
      - `company_name` (text, nullable)
      - `address_line1` (text)
      - `address_line2` (text, nullable)
      - `city` (text)
      - `state` (text, nullable)
      - `post_code` (text)
      - `country` (text)
      - `email` (text)
      - `phone` (text, nullable)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS
    - Add policies for user access
*/

-- Create shipping addresses table
CREATE TABLE IF NOT EXISTS shipping_addresses (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  is_default boolean DEFAULT false,
  first_name text NOT NULL,
  last_name text NOT NULL,
  company_name text,
  address_line1 text NOT NULL,
  address_line2 text,
  city text NOT NULL,
  state text,
  post_code text NOT NULL,
  country text NOT NULL,
  email text NOT NULL,
  phone text,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE shipping_addresses ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own addresses"
  ON shipping_addresses
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own addresses"
  ON shipping_addresses
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own addresses"
  ON shipping_addresses
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own addresses"
  ON shipping_addresses
  FOR DELETE
  USING (auth.uid() = user_id);

-- Function to ensure only one default address per user
CREATE OR REPLACE FUNCTION update_default_address()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default THEN
    UPDATE shipping_addresses
    SET is_default = false
    WHERE user_id = NEW.user_id
    AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to maintain single default address
CREATE TRIGGER ensure_single_default_address
  BEFORE INSERT OR UPDATE ON shipping_addresses
  FOR EACH ROW
  EXECUTE FUNCTION update_default_address();