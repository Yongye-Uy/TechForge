-- ============================================================================
-- TechForge - PostgreSQL Schema for Supabase
-- Run this in your Supabase Project -> "SQL Editor" -> "New query" -> "Run"
-- ============================================================================

-- 1. Users Table (Customer & Admin Accounts)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'customer', -- 'customer' or 'admin'
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150),
    phone VARCHAR(50),
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Orders Table (Records purchase history & shipping address)
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    order_code VARCHAR(50) UNIQUE NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    customer_name VARCHAR(150) NOT NULL,
    customer_email VARCHAR(150),
    customer_phone VARCHAR(50),
    shipping_address TEXT NOT NULL,
    total_amount NUMERIC(10, 2) NOT NULL,
    payment_status VARCHAR(50) DEFAULT 'PAID (Simulated)',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Order Items Table (Detailed breakdown of purchased items)
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    quantity INTEGER NOT NULL,
    subtotal NUMERIC(10, 2) NOT NULL
);

-- 4. Products Table (Catalog & Seller Inventory)
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    category_label VARCHAR(100) NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    rating NUMERIC(3, 1) DEFAULT 4.9,
    review_count INTEGER DEFAULT 1,
    stock INTEGER DEFAULT 50,
    image TEXT NOT NULL,
    description TEXT NOT NULL,
    specs JSONB DEFAULT '[]'::jsonb,
    seller_name VARCHAR(150) DEFAULT 'TechForge Official (Admin)',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

-- 6. Seed Default Admin Account: admin1 / admin-1
-- Password hash generated with bcryptjs (password: admin-1)
INSERT INTO users (username, password_hash, role, full_name, email, phone, address)
VALUES (
    'admin1',
    '$2a$10$Am1jZ7e7zZxgb3CCHm2VxenZo/B7DE9QEs8SnGTcbSRKFk3OVd/36',
    'admin',
    'System Administrator',
    'admin@techforge.local',
    '000-000-0000',
    'TechForge HQ'
)
ON CONFLICT (username) DO NOTHING;
