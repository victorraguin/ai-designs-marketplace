/*
  # Initial Schema for AI Design Marketplace

  1. Tables
    - designs: Stores generated AI designs
    - user_profiles: Extended user information
    - likes: Design likes/saves
    - orders: Purchase records
    - marketplace_sales: Sales tracking
    - styles: Design style templates
    - product_categories: Product categories
    - product_types: Available product types
    - subscriptions: User subscription plans
    - notifications: User notifications
    - admin_logs: System activity logs

  2. Security
    - RLS policies for all tables
    - Secure access patterns
    - Audit trails
*/

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User Profiles
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  email text UNIQUE NOT NULL,
  full_name text,
  subscription_id text,
  generations_used int DEFAULT 0,
  last_generation_reset timestamptz DEFAULT now(),
  address text,
  is_admin boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Styles (Design Templates)
CREATE TABLE IF NOT EXISTS styles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  prompt_template text NOT NULL,
  created_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true
);

-- Designs
CREATE TABLE IF NOT EXISTS designs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id uuid REFERENCES user_profiles(id),
  image_url text NOT NULL,
  prompt text NOT NULL,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'marketplace', 'private', 'deleted')),
  likes_count int DEFAULT 0,
  views_count int DEFAULT 0,
  impressions_count int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  canvas_json jsonb,
  style_id uuid REFERENCES styles(id),
  category text
);

-- Likes
CREATE TABLE IF NOT EXISTS likes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  design_id uuid REFERENCES designs(id) ON DELETE CASCADE,
  user_id uuid REFERENCES user_profiles(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(design_id, user_id)
);

-- Product Categories
CREATE TABLE IF NOT EXISTS product_categories (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Product Types
CREATE TABLE IF NOT EXISTS product_types (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id uuid REFERENCES product_categories(id),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  design_id uuid REFERENCES designs(id),
  buyer_id uuid REFERENCES user_profiles(id),
  product_type text NOT NULL,
  size text,
  total_amount numeric NOT NULL,
  order_status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
  created_at timestamptz DEFAULT now()
);

-- Marketplace Sales
CREATE TABLE IF NOT EXISTS marketplace_sales (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  design_id uuid REFERENCES designs(id),
  seller_id uuid REFERENCES user_profiles(id),
  buyer_id uuid REFERENCES user_profiles(id),
  sale_price numeric NOT NULL,
  commission_rate numeric NOT NULL,
  commission_amount numeric NOT NULL,
  net_amount numeric NOT NULL,
  sale_date timestamptz DEFAULT now()
);

-- Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id text PRIMARY KEY,
  name text NOT NULL,
  monthly_price numeric NOT NULL,
  generations_limit int NOT NULL,
  images_per_generation int NOT NULL,
  period text DEFAULT 'month',
  marketplace_access boolean DEFAULT false
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES user_profiles(id),
  type text NOT NULL,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Admin Logs
CREATE TABLE IF NOT EXISTS admin_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id uuid REFERENCES user_profiles(id),
  action text NOT NULL,
  target_id uuid,
  log_time timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE designs ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE styles ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- User Profiles
CREATE POLICY "Users can read their own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);

-- Designs
CREATE POLICY "Anyone can view marketplace designs"
  ON designs FOR SELECT
  USING (status = 'marketplace');

CREATE POLICY "Users can manage their own designs"
  ON designs FOR ALL
  USING (auth.uid() = creator_id);

-- Likes
CREATE POLICY "Users can manage their own likes"
  ON likes FOR ALL
  USING (auth.uid() = user_id);

-- Orders
CREATE POLICY "Users can view their own orders"
  ON orders FOR SELECT
  USING (auth.uid() = buyer_id);

-- Initial Data
INSERT INTO subscriptions (id, name, monthly_price, generations_limit, images_per_generation, marketplace_access)
VALUES
  ('free', 'Free', 0, 3, 2, false),
  ('pro', 'Pro', 9.99, 50, 4, true),
  ('unlimited', 'Unlimited', 29.99, 1000, 4, true);

INSERT INTO styles (name, description, prompt_template)
VALUES (
  'Dark Artistic',
  'Dark themed artistic designs with symbols and doodles',
  'A illustration, possibly a painting, with a black background. The artwork is filled with various symbols, text, and doodles. There are also handwritten notes and scribbles scattered throughout.'
);

-- Functions
CREATE OR REPLACE FUNCTION increment_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE designs
  SET likes_count = likes_count + 1
  WHERE id = NEW.design_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrement_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE designs
  SET likes_count = likes_count - 1
  WHERE id = OLD.design_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER after_like_inserted
  AFTER INSERT ON likes
  FOR EACH ROW
  EXECUTE FUNCTION increment_likes_count();

CREATE TRIGGER after_like_deleted
  AFTER DELETE ON likes
  FOR EACH ROW
  EXECUTE FUNCTION decrement_likes_count();