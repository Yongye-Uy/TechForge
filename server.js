/**
 * TechForge Express Server
 * Handles Authentication, Orders, Admin Management & Telegram Notifications.
 * Serves static assets and provides REST API.
 */

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config();

const db = require('./db');
const telegram = require('./telegram');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'techforge-super-secret-key-2026';

// Middlewares
app.use(cors());
app.use(express.json());

let dbInitialized = false;

// Middleware: Ensure PostgreSQL tables exist before processing API requests
app.use(async (req, res, next) => {
  if (req.path.startsWith('/api') && !dbInitialized) {
    if (process.env.DATABASE_URL) {
      try {
        await db.initDB();
        dbInitialized = true;
      } catch (err) {
        console.error('Database connection / init error:', err.message);
      }
    }
  }
  next();
});

// Serve static frontend files
app.use(express.static(path.join(__dirname)));

// ==========================================
// Authentication Middlewares
// ==========================================
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Session expired or invalid. Please log in again.' });
    }
    req.user = decoded;
    next();
  });
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
  }
  next();
}

// ==========================================
// Auth Routes
// ==========================================

// Sign Up
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { username, password, fullName, email, phone, address } = req.body;

    if (!username || !password || !fullName) {
      return res.status(400).json({ error: 'Username, password, and full name are required.' });
    }

    if (password.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters long.' });
    }

    const existing = await db.findUserByUsername(username);
    if (existing) {
      return res.status(409).json({ error: 'Username already taken. Please choose another.' });
    }

    const newUser = await db.createUser({
      username,
      password,
      fullName,
      email,
      phone,
      address
    });

    const token = jwt.sign(
      { id: newUser.id, username: newUser.username, role: newUser.role, fullName: newUser.full_name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      token,
      user: newUser
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: err.message || 'Database error during registration.' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const user = await db.findUserByUsername(username);
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, fullName: user.full_name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const { password_hash, ...safeUser } = user;

    res.json({
      success: true,
      token,
      user: safeUser
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message || 'Database error during login.' });
  }
});

// Get Current User Profile
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await db.findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve user profile.' });
  }
});

// Update Profile
app.put('/api/auth/profile', authenticateToken, async (req, res) => {
  try {
    const { fullName, phone, address } = req.body;
    const updated = await db.updateUserProfile(req.user.id, { fullName, phone, address });
    res.json({ success: true, user: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile.' });
  }
});

// ==========================================
// Order Routes
// ==========================================

// Place a new order (requires authentication and shipping address)
app.post('/api/orders', authenticateToken, async (req, res) => {
  try {
    const { shippingAddress, phone, recipientName, items, totalAmount } = req.body;

    if (!shippingAddress || !shippingAddress.trim()) {
      return res.status(400).json({ error: 'Please enter a delivery address.' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Order must contain at least one product.' });
    }

    // Retrieve user details
    const user = await db.findUserById(req.user.id);
    const customerName = (recipientName && recipientName.trim()) || (user ? user.full_name : req.user.fullName || req.user.username);
    const customerEmail = user ? user.email : '';
    const customerPhone = phone || (user ? user.phone : '');

    const newOrder = await db.createOrder({
      userId: req.user.id,
      customerName,
      customerEmail,
      customerPhone,
      shippingAddress: shippingAddress.trim(),
      totalAmount: Number(totalAmount),
      items
    });

    // Notify Telegram Admin Bot (Awaited so Vercel serverless context doesn't freeze early)
    try {
      await telegram.sendOrderNotificationToAdmin({
        ...newOrder,
        customer_username: req.user.username
      });
    } catch (tgErr) {
      console.warn('Telegram alert skipped or failed:', tgErr.message);
    }

    res.status(201).json({
      success: true,
      order: newOrder
    });
  } catch (err) {
    console.error('Order creation error:', err);
    res.status(500).json({ error: 'Failed to process purchase order.' });
  }
});

// Get logged-in customer's order history
app.get('/api/orders/my-orders', authenticateToken, async (req, res) => {
  try {
    const orders = await db.getOrdersByUserId(req.user.id);
    res.json({ orders });
  } catch (err) {
    console.error('Error fetching my orders:', err);
    res.status(500).json({ error: 'Failed to load purchase history.' });
  }
});

// Public endpoint: Get store product catalog
app.get('/api/products', async (req, res) => {
  try {
    const products = await db.getAllProducts();
    res.json({ products });
  } catch (err) {
    console.error('Error fetching products:', err);
    res.json({ products: require('./js/products') });
  }
});

// ==========================================
// Admin Routes (Role: admin / seller only)
// ==========================================

// Get all products (Admin view)
app.get('/api/admin/products', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const products = await db.getAllProducts();
    res.json({ products });
  } catch (err) {
    console.error('Admin products fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch products.' });
  }
});

// Create / Publish a new product (Admin / Seller)
app.post('/api/admin/products', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, category, categoryLabel, price, stock, image, description, specs } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Product name is required.' });
    }
    if (!price || isNaN(Number(price)) || Number(price) <= 0) {
      return res.status(400).json({ error: 'A valid product price is required.' });
    }
    if (!description || !description.trim()) {
      return res.status(400).json({ error: 'Product description is required.' });
    }

    const product = await db.createProduct({
      name,
      category,
      categoryLabel,
      price,
      stock,
      image,
      description,
      specs,
      sellerName: `${req.user.fullName || 'TechForge Official'} (Seller)`
    });

    res.status(201).json({ success: true, product });
  } catch (err) {
    console.error('Admin create product error:', err);
    res.status(500).json({ error: 'Failed to create product: ' + err.message });
  }
});

// Delete a product (Admin / Seller)
app.delete('/api/admin/products/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const productId = parseInt(req.params.id, 10);
    if (isNaN(productId)) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }
    await db.deleteProduct(productId);
    res.json({ success: true, message: 'Product successfully deleted.' });
  } catch (err) {
    console.error('Admin delete product error:', err);
    res.status(500).json({ error: 'Failed to delete product.' });
  }
});

// Get all customers with their total purchase statistics
app.get('/api/admin/customers', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const customers = await db.getAllCustomers();
    res.json({ customers });
  } catch (err) {
    console.error('Admin customers error:', err);
    res.status(500).json({ error: 'Failed to fetch customer list.' });
  }
});

// Get specific customer details and their full purchase history
app.get('/api/admin/customers/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const details = await db.getCustomerDetails(req.params.id);
    if (!details) {
      return res.status(404).json({ error: 'Customer not found.' });
    }
    res.json(details);
  } catch (err) {
    console.error('Admin customer detail error:', err);
    res.status(500).json({ error: 'Failed to fetch customer details.' });
  }
});

// Get all orders across all customers
app.get('/api/admin/orders', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const orders = await db.getAllOrders();
    res.json({ orders });
  } catch (err) {
    console.error('Admin orders error:', err);
    res.status(500).json({ error: 'Failed to fetch orders.' });
  }
});

// Health check endpoint (Live connection diagnostics)
app.get('/api/health', async (req, res) => {
  if (!process.env.DATABASE_URL) {
    return res.status(500).json({
      status: 'error',
      message: 'DATABASE_URL is not set in Vercel Environment Variables.'
    });
  }

  try {
    const client = db.getPool();
    await client.query('SELECT 1');
    res.json({
      status: 'ok',
      database: 'Connected to PostgreSQL (Supabase)',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      message: `Database connection failed: ${err.message}`
    });
  }
});

// Telegram Notification Test Endpoint
app.get('/api/test-telegram', async (req, res) => {
  const result = await telegram.testTelegramConnection();
  if (result.success) {
    res.json(result);
  } else {
    res.status(400).json(result);
  }
});

// Start Server locally
if (process.env.VERCEL !== '1') {
  db.initDB().then(() => {
    dbInitialized = true;
  }).catch((e) => {
    console.warn('Initial local DB connection note:', e.message);
  });

  app.listen(PORT, () => {
    console.log(`🚀 TechForge Store running at http://localhost:${PORT}`);
    console.log(`👑 Default Admin: admin1 / admin-1`);
  });
}

module.exports = app;
