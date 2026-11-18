/**
 * TechForge Database Connection & Model Layer
 * Supports PostgreSQL with auto-initialization and default admin seeding.
 * Includes local JSON-based fallback when DATABASE_URL is not yet configured.
 */

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

require('dotenv').config();

const DATABASE_URL = process.env.DATABASE_URL;
let pool = null;
let isPostgres = false;

// Local fallback database file
const DATA_DIR = path.join(__dirname, 'data');
const FALLBACK_DB_FILE = path.join(DATA_DIR, 'local_db.json');

// In-memory / JSON fallback store
let localStore = {
  users: [],
  orders: [],
  order_items: []
};

// Immediately load fallback store on module require
initLocalStore();

// Initialize fallback file
function initLocalStore() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (fs.existsSync(FALLBACK_DB_FILE)) {
    try {
      const data = fs.readFileSync(FALLBACK_DB_FILE, 'utf8');
      localStore = JSON.parse(data);
    } catch (e) {
      console.warn('Could not read local DB file, initializing new store.');
    }
  } else {
    saveLocalStore();
  }
}

function saveLocalStore() {
  try {
    fs.writeFileSync(FALLBACK_DB_FILE, JSON.stringify(localStore, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving local fallback store:', err);
  }
}

// Check and initialize DB
async function initDB() {
  if (DATABASE_URL) {
    try {
      pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: !DATABASE_URL.includes('localhost') ? { rejectUnauthorized: false } : false
      });

      // Test connection
      await pool.query('SELECT 1');
      isPostgres = true;
      console.log('✅ Connected to PostgreSQL database.');

      // Auto-create tables
      await pool.query(`
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
      `);

      // Seed default admin account (name: admin1, password: admin-1)
      const adminCheck = await pool.query('SELECT * FROM users WHERE username = $1', ['admin1']);
      if (adminCheck.rows.length === 0) {
        const hashedPassword = await bcrypt.hash('admin-1', 10);
        await pool.query(
          `INSERT INTO users (username, password_hash, role, full_name, email, phone, address)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          ['admin1', hashedPassword, 'admin', 'Administrator', 'admin@techforge.local', '000-000-0000', 'TechForge HQ']
        );
        console.log('👑 Default Admin created in PostgreSQL: (admin1 / admin-1)');
      }
      return;
    } catch (err) {
      console.warn('⚠️ PostgreSQL connection failed:', err.message);
      console.warn('Falling back to local persistent JSON store for local testing.');
      isPostgres = false;
    }
  } else {
    console.log('ℹ️ No DATABASE_URL found. Running with local persistent database.');
  }

  // Fallback setup
  initLocalStore();
  // Ensure default admin exists in local fallback
  const adminExists = localStore.users.find(u => u.username === 'admin1');
  if (!adminExists) {
    const hashedPassword = await bcrypt.hash('admin-1', 10);
    localStore.users.push({
      id: 1,
      username: 'admin1',
      password_hash: hashedPassword,
      role: 'admin',
      full_name: 'Administrator',
      email: 'admin@techforge.local',
      phone: '000-000-0000',
      address: 'TechForge HQ',
      created_at: new Date().toISOString()
    });
    saveLocalStore();
    console.log('👑 Default Admin created in Local DB: (admin1 / admin-1)');
  }
}

// ==========================================
// User Operations
// ==========================================
async function findUserByUsername(username) {
  if (isPostgres) {
    const res = await pool.query('SELECT * FROM users WHERE LOWER(username) = LOWER($1)', [username.trim()]);
    return res.rows[0] || null;
  } else {
    return localStore.users.find(u => u.username.toLowerCase() === username.trim().toLowerCase()) || null;
  }
}

async function findUserById(id) {
  if (isPostgres) {
    const res = await pool.query('SELECT id, username, role, full_name, email, phone, address, created_at FROM users WHERE id = $1', [id]);
    return res.rows[0] || null;
  } else {
    const user = localStore.users.find(u => u.id === parseInt(id));
    if (!user) return null;
    const { password_hash, ...safeUser } = user;
    return safeUser;
  }
}

async function createUser({ username, password, fullName, email, phone, address }) {
  const passwordHash = await bcrypt.hash(password, 10);
  if (isPostgres) {
    const res = await pool.query(
      `INSERT INTO users (username, password_hash, role, full_name, email, phone, address)
       VALUES ($1, $2, 'customer', $3, $4, $5, $6)
       RETURNING id, username, role, full_name, email, phone, address, created_at`,
      [username.trim(), passwordHash, fullName.trim(), email ? email.trim() : '', phone ? phone.trim() : '', address ? address.trim() : '']
    );
    return res.rows[0];
  } else {
    const newId = localStore.users.length > 0 ? Math.max(...localStore.users.map(u => u.id)) + 1 : 1;
    const newUser = {
      id: newId,
      username: username.trim(),
      password_hash: passwordHash,
      role: 'customer',
      full_name: fullName.trim(),
      email: email ? email.trim() : '',
      phone: phone ? phone.trim() : '',
      address: address ? address.trim() : '',
      created_at: new Date().toISOString()
    };
    localStore.users.push(newUser);
    saveLocalStore();
    const { password_hash, ...safeUser } = newUser;
    return safeUser;
  }
}

async function updateUserProfile(id, { fullName, phone, address }) {
  if (isPostgres) {
    const res = await pool.query(
      `UPDATE users SET full_name = $1, phone = $2, address = $3 WHERE id = $4
       RETURNING id, username, role, full_name, email, phone, address, created_at`,
      [fullName, phone, address, id]
    );
    return res.rows[0];
  } else {
    const user = localStore.users.find(u => u.id === parseInt(id));
    if (user) {
      if (fullName) user.full_name = fullName;
      if (phone) user.phone = phone;
      if (address) user.address = address;
      saveLocalStore();
    }
    return user;
  }
}

// ==========================================
// Order Operations
// ==========================================
async function createOrder({ userId, customerName, customerEmail, customerPhone, shippingAddress, totalAmount, items }) {
  const orderCode = 'TF-' + Math.floor(100000 + Math.random() * 900000);
  
  if (isPostgres) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update user's latest address and phone if available
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
          [newOrder.id, item.id, item.name, item.price, item.quantity, subtotal]
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
  } else {
    const newOrderId = localStore.orders.length > 0 ? Math.max(...localStore.orders.map(o => o.id)) + 1 : 1;
    
    // Update customer address in fallback store
    if (userId) {
      const user = localStore.users.find(u => u.id === parseInt(userId));
      if (user) {
        user.address = shippingAddress;
        if (customerPhone) user.phone = customerPhone;
      }
    }

    const newOrder = {
      id: newOrderId,
      order_code: orderCode,
      user_id: userId ? parseInt(userId) : null,
      customer_name: customerName,
      customer_email: customerEmail || '',
      customer_phone: customerPhone || '',
      shipping_address: shippingAddress,
      total_amount: Number(totalAmount),
      payment_status: 'PAID (Simulated)',
      created_at: new Date().toISOString()
    };
    localStore.orders.unshift(newOrder);

    // Save items
    const savedItems = items.map(item => {
      const subtotal = Number(item.price) * Number(item.quantity);
      const itemRecord = {
        id: localStore.order_items.length + 1,
        order_id: newOrderId,
        product_id: item.id,
        product_name: item.name,
        price: Number(item.price),
        quantity: Number(item.quantity),
        subtotal: subtotal
      };
      localStore.order_items.push(itemRecord);
      return itemRecord;
    });

    saveLocalStore();
    newOrder.items = savedItems;
    return newOrder;
  }
}

// Get customer's orders history
async function getOrdersByUserId(userId) {
  if (isPostgres) {
    const ordersRes = await pool.query(
      `SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );
    const orders = ordersRes.rows;

    for (const order of orders) {
      const itemsRes = await pool.query(
        `SELECT * FROM order_items WHERE order_id = $1`,
        [order.id]
      );
      order.items = itemsRes.rows;
    }
    return orders;
  } else {
    const orders = localStore.orders.filter(o => o.user_id === parseInt(userId));
    return orders.map(order => {
      const items = localStore.order_items.filter(i => i.order_id === order.id);
      return { ...order, items };
    });
  }
}

// ==========================================
// Admin Operations
// ==========================================
async function getAllCustomers() {
  if (isPostgres) {
    const res = await pool.query(`
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
  } else {
    return localStore.users
      .filter(u => u.role === 'customer')
      .map(u => {
        const userOrders = localStore.orders.filter(o => o.user_id === u.id);
        const total_spent = userOrders.reduce((sum, o) => sum + Number(o.total_amount), 0);
        return {
          id: u.id,
          username: u.username,
          full_name: u.full_name,
          email: u.email,
          phone: u.phone,
          address: u.address,
          created_at: u.created_at,
          total_orders: userOrders.length,
          total_spent: total_spent.toFixed(2)
        };
      });
  }
}

async function getCustomerDetails(customerId) {
  const user = await findUserById(customerId);
  if (!user) return null;
  const orders = await getOrdersByUserId(customerId);
  return { customer: user, orders };
}

async function getAllOrders() {
  if (isPostgres) {
    const ordersRes = await pool.query(`
      SELECT 
        o.*,
        u.username as customer_username
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC
    `);
    const orders = ordersRes.rows;

    for (const order of orders) {
      const itemsRes = await pool.query(
        `SELECT * FROM order_items WHERE order_id = $1`,
        [order.id]
      );
      order.items = itemsRes.rows;
    }
    return orders;
  } else {
    return localStore.orders.map(order => {
      const items = localStore.order_items.filter(i => i.order_id === order.id);
      const user = localStore.users.find(u => u.id === order.user_id);
      return {
        ...order,
        customer_username: user ? user.username : 'Guest',
        items
      };
    });
  }
}

module.exports = {
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
  isPostgres: () => isPostgres
};
