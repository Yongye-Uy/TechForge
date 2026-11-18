# ⚡ TechForge - Full-Stack E-Commerce & Telegram Mini App

**TechForge** is an enterprise-grade computer hardware store built with a **Node.js/Express & PostgreSQL** backend, responsive **Bootstrap 5 & Vanilla JS** frontend, and native **Telegram Mini App (TMA)** integration.

---

## 🌟 Full-Stack Features

1. **Database (PostgreSQL / pgsql)**:
   - Relational PostgreSQL database using `pg` driver with auto-initializing schema ([schema.sql](file:///c:/Year4/CS%20491%20-%20Introduction%20to%20Enterprise%20Applications%20Development/schema.sql)).
   - Tables: `users`, `orders`, and `order_items`.
   - Built-in local fallback store for seamless offline/local grading before a remote PostgreSQL database is configured.

2. **Authentication (Sign Up / Log In / Log Out)**:
   - Secure password hashing with `bcryptjs` and session management via JWT.
   - Customers must have an account to purchase products.
   - Profile management with persistent login state.

3. **Admin Dashboard & Default Admin Account**:
   - Access URL: `/admin.html`
   - **Default Admin Credentials:**
     - **Username:** `admin1`
     - **Password:** `admin-1`
   - **Admin Capabilities:**
     - **Overview KPIs:** Real-time revenue, total orders, customer count, and database status.
     - **Customer List:** View all registered customers, email, phone, registered address, total orders, and total spent.
     - **Customer Details:** Click any customer to inspect their full profile and every product they have ever purchased.
     - **All Orders:** Inspect every order receipt and breakdown (no delivery processing required).

4. **Address Verification & Purchase Flow**:
   - Customers must verify or enter their shipping address and phone number before placing an order.
   - Buy any custom quantity (unlimited stock).
   - Generates simulated order receipts with random Order Codes (`#TF-XXXXXX`).

5. **Customer Buy History**:
   - Customers can view their past orders, items purchased, and delivery addresses directly from the "My Buy History" menu.

6. **Telegram Admin Bot Notifications**:
   - When any customer places an order, the backend automatically dispatches a real-time Telegram alert to the store administrator via Telegram Bot API with the customer's name, phone, shipping address, item breakdown, and total.

7. **Telegram Mini App Contrast Fix**:
   - Solved the Telegram dark mode bug where specification bullet points appeared as white text on a light background.
   - High-contrast typography and fluid scrolling across mobile and desktop.

---

## 📂 Project Structure

```text
├── server.js           # Express API server & static asset host
├── db.js               # PostgreSQL connection, auto-migrations & models
├── telegram.js         # Telegram Bot notification dispatcher
├── schema.sql          # PostgreSQL DDL script
├── .env.example        # Environment variable template
├── api/
│   └── index.js        # Vercel serverless function entrypoint
├── index.html          # Storefront, customer auth, cart & checkout modals
├── admin.html          # Administrator portal for customers and orders
├── css/
│   └── style.css       # Custom styling & Telegram dark/light contrast rules
├── js/
│   ├── products.js     # Catalog of 10 computer hardware components
│   ├── app.js          # Storefront logic, auth glue & checkout handlers
│   └── admin.js        # Admin dashboard analytics & order inspectors
├── vercel.json         # Vercel routing and Telegram iframe security headers
└── README.md           # Documentation
```

---

## 🚀 How to Run Locally

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Start the Application**:
   ```bash
   npm start
   ```
   The application will start on [http://localhost:3000](http://localhost:3000).

3. **Log In to Test**:
   - **Storefront:** [http://localhost:3000](http://localhost:3000)
     - Click **Sign In** -> **Create Account** to register a customer account.
     - Select a computer component, choose any quantity, and click **Buy Now**.
     - Enter your shipping address and confirm your purchase.
   - **Admin Portal:** [http://localhost:3000/admin.html](http://localhost:3000/admin.html)
     - Username: `admin1`
     - Password: `admin-1`
     - View the customer you registered, their address, and what they bought!

---

## 🐘 Configuring PostgreSQL (`DATABASE_URL`)

To connect your own PostgreSQL database (e.g. from [Neon.tech](https://neon.tech), [Supabase](https://supabase.com), [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres), or local PostgreSQL):

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Set your PostgreSQL connection string:
   ```env
   DATABASE_URL=postgresql://username:password@ep-example.neon.tech/neondb?sslmode=require
   ```
3. When you run `npm start`, the app automatically connects to PostgreSQL and creates the `users`, `orders`, and `order_items` tables with the default admin `admin1` / `admin-1`!

---

## 🤖 Configuring Telegram Admin Notifications

To receive real-time Telegram messages when an order is made:

1. Open Telegram and search for [@BotFather](https://t.me/BotFather).
2. Create a bot using `/newbot` and copy your **Bot Token**.
3. Find your personal Telegram Chat ID:
   - Message [@userinfobot](https://t.me/userinfobot) or [@raw_data_bot](https://t.me/raw_data_bot) and copy the `Id` number (e.g. `123456789`).
4. Add these into your `.env` or Vercel Environment Variables:
   ```env
   TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrSTUvwxYZ
   TELEGRAM_ADMIN_CHAT_ID=123456789
   ```
Whenever any customer places an order, your Telegram bot will instantly message you:
```text
🛍️ NEW ORDER RECEIVED!
📦 Order Code: #TF-492465
👤 Customer: Jane Customer (@janecust)
📞 Phone: 123-456-7890
📍 Shipping Address: 742 Evergreen Terrace
🛒 Items Bought:
• 1x ApexPro RGB Mechanical Keyboard ($129.99)
• 1x ViperStrike Wireless Gaming Mouse ($69.99)
💰 Total Amount: $199.98
```

---

## ☁️ Deploying to Vercel

1. Commit and push your code to your GitHub repository:
   ```bash
   git add .
   git commit -m "Full-stack store with PostgreSQL, Admin portal, and Telegram notifications"
   git push origin main
   ```
2. In [Vercel](https://vercel.com):
   - Import your GitHub repo.
   - In **Settings** -> **Environment Variables**, you can optionally add:
     - `DATABASE_URL`: Your PostgreSQL connection string.
     - `JWT_SECRET`: Any random string (e.g., `my_secret_key_123`).
     - `TELEGRAM_BOT_TOKEN`: Your Telegram Bot Token.
     - `TELEGRAM_ADMIN_CHAT_ID`: Your Telegram Admin User Chat ID.
3. Click **Deploy**. Vercel will host both your frontend and your Node.js serverless API routes on your HTTPS URL!
