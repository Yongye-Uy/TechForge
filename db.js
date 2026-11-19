/**
 * TechForge - Pure PostgreSQL Database Module (Supabase Compatible)
 * Uses standard 'pg' Pool with SSL for PostgreSQL hosting.
 */

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const DATABASE_URL = process.env.DATABASE_URL;

let pool = null;

function getPool() {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      console.error('\n❌ ERROR: DATABASE_URL is not defined in your environment or .env file!');
      console.error('👉 Please configure your Supabase connection string:');
      console.error('DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres\n');
      throw new Error('DATABASE_URL is not set. Please add your Supabase connection string to .env');
    }

    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      },
      connectionTimeoutMillis: 7000
    });

    pool.on('error', (err) => {
      console.error('⚠️ Unexpected PostgreSQL pool error:', err.message);
    });
  }
  return pool;
}

// Initialize tables & seed admin in PostgreSQL
async function initDB() {
  if (!process.env.DATABASE_URL) {
    console.warn('\n⚠️ DATABASE_URL is missing. Please set your Supabase database URL in .env');
    console.warn('Example: DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres\n');
    return false;
  }

  try {
    const client = getPool();
    await client.query('SELECT 1');
    console.log('✅ Connected to PostgreSQL database (Supabase).');

    // Auto-create PostgreSQL tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(100) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          role VARCHAR(20) NOT NULL DEFAULT 'customer',
          full_name VARCHAR(150) NOT NULL,
          email VARCHAR(150),
          phone VARCHAR(50),
          address TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

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

      CREATE TABLE IF NOT EXISTS order_items (
          id SERIAL PRIMARY KEY,
          order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
          product_id INTEGER NOT NULL,
          product_name VARCHAR(255) NOT NULL,
          price NUMERIC(10, 2) NOT NULL,
          quantity INTEGER NOT NULL,
          subtotal NUMERIC(10, 2) NOT NULL
      );

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

      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
      CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
      CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
    `);

    // Ensure default admin (admin1 / admin-1) exists
    const adminCheck = await client.query('SELECT id FROM users WHERE username = $1', ['admin1']);
    if (adminCheck.rows.length === 0) {
      const hashedPassword = await bcrypt.hash('admin-1', 10);
      await client.query(
        `INSERT INTO users (username, password_hash, role, full_name, email, phone, address)
         VALUES ($1, $2, 'admin', 'System Administrator', 'admin@techforge.local', '000-000-0000', 'TechForge HQ')`,
        ['admin1', hashedPassword]
      );
      console.log('👑 Default Admin created in PostgreSQL: (admin1 / admin-1)');
    }

    // Auto-seed initial 10 catalog products if table is empty
    const prodCountRes = await client.query('SELECT COUNT(*)::int as count FROM products');
    if (prodCountRes.rows[0].count === 0) {
      console.log('📦 Seeding initial products catalog into PostgreSQL...');
      const defaultProducts = require('./js/products');
      for (const p of defaultProducts) {
        await client.query(
          `INSERT INTO products (id, name, category, category_label, price, rating, review_count, stock, image, description, specs, seller_name)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'TechForge Official (Admin)')
           ON CONFLICT (id) DO NOTHING`,
          [p.id, p.name, p.category, p.categoryLabel, p.price, p.rating, p.reviewCount, p.stock, p.image, p.description, JSON.stringify(p.specs || [])]
        );
      }
      await client.query(`SELECT setval(pg_get_serial_sequence('products', 'id'), coalesce(max(id), 1)) FROM products`);
      console.log('✅ Initial products catalog seeded successfully.');
    }

    return true;
  } catch (err) {
    console.error('❌ PostgreSQL connection error:', err.message);
    console.error('💡 Tip: Verify your Supabase database host, port (5432 or 6543), and password in DATABASE_URL.');
    return false;
  }
}

// ==========================================
// User Operations (PostgreSQL)
// ==========================================
async function findUserByUsername(username) {
  const client = getPool();
  const res = await client.query(
    'SELECT * FROM users WHERE LOWER(username) = LOWER($1)',
    [username.trim()]
  );
  return res.rows[0] || null;
}

async function findUserById(id) {
  const client = getPool();
  const res = await client.query(
    'SELECT id, username, role, full_name, email, phone, address, created_at FROM users WHERE id = $1',
    [id]
  );
  return res.rows[0] || null;
}

async function createUser({ username, password, fullName, email, phone, address }) {
  const client = getPool();
  const passwordHash = await bcrypt.hash(password, 10);
  const res = await client.query(
    `INSERT INTO users (username, password_hash, role, full_name, email, phone, address)
     VALUES ($1, $2, 'customer', $3, $4, $5, $6)
     RETURNING id, username, role, full_name, email, phone, address, created_at`,
    [
      username.trim(),
      passwordHash,
      fullName.trim(),
      email ? email.trim() : '',
      phone ? phone.trim() : '',
      address ? address.trim() : ''
    ]
  );
  return res.rows[0];
}

async function updateUserProfile(id, { fullName, phone, address }) {
  const client = getPool();
  const res = await client.query(
    `UPDATE users SET full_name = $1, phone = $2, address = $3 WHERE id = $4
     RETURNING id, username, role, full_name, email, phone, address, created_at`,
    [fullName, phone, address, id]
  );
  return res.rows[0];
}

// ==========================================
// Order Operations (PostgreSQL Transactions)
// ==========================================
async function createOrder({ userId, customerName, customerEmail, customerPhone, shippingAddress, totalAmount, items }) {
  const poolClient = getPool();
  const client = await poolClient.connect();
  const orderCode = 'TF-' + Math.floor(100000 + Math.random() * 900000);

  try {
    await client.query('BEGIN');

    // Update customer address & phone if logged in
    if (userId) {
      await client.query(
        'UPDATE users SET address = $1, phone = COALESCE(NULLIF($2, \'\'), phone) WHERE id = $3',
        [shippingAddress, customerPhone, userId]
      );
    }

    // Insert Order
    const orderRes = await client.query(
      `INSERT INTO orders (order_code, user_id, customer_name, customer_email, customer_phone, shipping_address, total_amount, payment_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'PAID (Simulated)')
       RETURNING *`,
      [orderCode, userId || null, customerName, customerEmail || '', customerPhone || '', shippingAddress, totalAmount]
    );
    const newOrder = orderRes.rows[0];

    // Insert Order Items
    for (const item of items) {
      const subtotal = Number(item.price) * Number(item.quantity);
      await client.query(
        `INSERT INTO order_items (order_id, product_id, product_name, price, quantity, subtotal)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [newOrder.id, item.id, item.name || item.product_name, item.price, item.quantity, subtotal]
      );
    }

    await client.query('COMMIT');
    newOrder.items = items;
    return newOrder;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Get customer purchase history
async function getOrdersByUserId(userId) {
  const client = getPool();
  const ordersRes = await client.query(
    `SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  const orders = ordersRes.rows;

  for (const order of orders) {
    const itemsRes = await client.query(
      `SELECT * FROM order_items WHERE order_id = $1`,
      [order.id]
    );
    order.items = itemsRes.rows;
  }
  return orders;
}

// ==========================================
// Admin Operations (PostgreSQL Queries)
// ==========================================
async function getAllCustomers() {
  const client = getPool();
  const res = await client.query(`
    SELECT 
      u.id, 
      u.username, 
      u.full_name, 
      u.email, 
      u.phone, 
      u.address, 
      u.created_at,
      COUNT(o.id)::int as total_orders,
      COALESCE(SUM(o.total_amount), 0)::numeric(10,2) as total_spent
    FROM users u
    LEFT JOIN orders o ON u.id = o.user_id
    WHERE u.role = 'customer'
    GROUP BY u.id
    ORDER BY u.created_at DESC
  `);
  return res.rows;
}

async function getCustomerDetails(customerId) {
  const user = await findUserById(customerId);
  if (!user) return null;
  const orders = await getOrdersByUserId(customerId);
  return { customer: user, orders };
}

async function getAllOrders() {
  const client = getPool();
  const ordersRes = await client.query(`
    SELECT 
      o.*,
      u.username as customer_username
    FROM orders o
    LEFT JOIN users u ON o.user_id = u.id
    ORDER BY o.created_at DESC
  `);
  const orders = ordersRes.rows;

  for (const order of orders) {
    const itemsRes = await client.query(
      `SELECT * FROM order_items WHERE order_id = $1`,
      [order.id]
    );
    order.items = itemsRes.rows;
  }
  return orders;
}

// ==========================================
// Product Operations (Catalog & Seller)
// ==========================================
async function getAllProducts() {
  const client = getPool();
  try {
    const res = await client.query(`
      SELECT 
        id, 
        name, 
        category, 
        category_label as "categoryLabel", 
        price::float as price, 
        rating::float as rating, 
        review_count as "reviewCount", 
        stock, 
        image, 
        description, 
        specs, 
        seller_name as "sellerName", 
        created_at as "createdAt"
      FROM products
      ORDER BY id ASC
    `);
    if (res.rows && res.rows.length > 0) {
      return res.rows;
    }
  } catch (err) {
    console.warn('PostgreSQL products query note:', err.message);
  }
  return require('./js/products');
}

async function getProductById(id) {
  const client = getPool();
  const res = await client.query(`
    SELECT 
      id, 
      name, 
      category, 
      category_label as "categoryLabel", 
      price::float as price, 
      rating::float as rating, 
      review_count as "reviewCount", 
      stock, 
      image, 
      description, 
      specs, 
      seller_name as "sellerName", 
      created_at as "createdAt"
    FROM products WHERE id = $1
  `, [id]);
  return res.rows[0] || null;
}

async function createProduct({ name, category, categoryLabel, price, stock, image, description, specs, sellerName }) {
  const client = getPool();
  const cat = (category || 'components').trim().toLowerCase();
  const catLabel = categoryLabel || (cat.charAt(0).toUpperCase() + cat.slice(1));
  const res = await client.query(
    `INSERT INTO products (name, category, category_label, price, stock, image, description, specs, seller_name, rating, review_count)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 5.0, 1)
     RETURNING 
       id, 
       name, 
       category, 
       category_label as "categoryLabel", 
       price::float as price, 
       rating::float as rating, 
       review_count as "reviewCount", 
       stock, 
       image, 
       description, 
       specs, 
       seller_name as "sellerName", 
       created_at as "createdAt"`,
    [
      name.trim(),
      cat,
      catLabel,
      Number(price),
      Number(stock) || 50,
      image ? image.trim() : `https://placehold.co/600x400/1e293b/ffffff?text=${encodeURIComponent(name.trim())}`,
      description.trim(),
      JSON.stringify(Array.isArray(specs) ? specs : []),
      sellerName || 'TechForge Official (Admin)'
    ]
  );
  return res.rows[0];
}

async function deleteProduct(id) {
  const client = getPool();
  await client.query('DELETE FROM products WHERE id = $1', [id]);
  return true;
}

module.exports = {
  getPool,
  initDB,
  findUserByUsername,
  findUserById,
  createUser,
  updateUserProfile,
  createOrder,
  getOrdersByUserId,
  getAllCustomers,
  getCustomerDetails,
  getAllOrders,
  getAllProducts,
  getProductById,
  createProduct,
  deleteProduct
};
