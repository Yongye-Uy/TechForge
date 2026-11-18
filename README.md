# ⚡ TechForge - PostgreSQL (Supabase) & Telegram Mini App Store

**TechForge** is a full-stack e-commerce store with a **Node.js/Express & pure PostgreSQL (Supabase)** backend, responsive **Bootstrap 5 & Vanilla JS** frontend, and native **Telegram Mini App** integration.

---

## 🗄️ Database Setup with Supabase (PostgreSQL)

You can connect your Supabase database in 3 simple steps:

### Step 1: Get your Supabase Connection String
1. Log in to [Supabase](https://supabase.com) and create or open your project.
2. In the left sidebar, click **Project Settings** (gear icon) -> **Database**.
3. Scroll down to **Connection string** and click the **URI** tab.
4. Copy the connection string. It will look like this:
   ```text
   postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
   ```
   *(Or direct: `postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres`)*
5. Replace `[YOUR-PASSWORD]` with the database password you created when starting your Supabase project.

### Step 2: Set your `DATABASE_URL`
* **For Local Testing:**
  Create a `.env` file in the root folder (or copy `.env.example`):
  ```bash
  cp .env.example .env
  ```
  Paste your connection string into `.env`:
  ```env
  DATABASE_URL=postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
  ```

* **For Vercel Deployment:**
  In your Vercel project dashboard, go to **Settings** -> **Environment Variables**, and add `DATABASE_URL` with your Supabase URI string.

### Step 3: Run the Schema
You can initialize the tables in either of two ways:
* **Option A (Automatic):** Just start the server (`npm start`). It will automatically connect to Supabase, run `CREATE TABLE IF NOT EXISTS`, and seed the default admin account (`admin1` / `admin-1`).
* **Option B (Supabase SQL Editor):** In your Supabase dashboard, click **SQL Editor** -> **New query** -> paste the entire contents of [schema.sql](file:///c:/Year4/CS%20491%20-%20Introduction%20to%20Enterprise%20Applications%20Development/schema.sql) -> click **Run**.

---

## 🚀 How to Run Locally

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Start the Application:**
   ```bash
   npm start
   ```
   The application will start on [http://localhost:3000](http://localhost:3000).

---

## 👤 User Roles & Workflows

### 🛒 Customer Workflow:
1. Open the storefront at [http://localhost:3000](http://localhost:3000).
2. Click **Sign In** -> **Create Account** to register (Full Name, Username, Email, Phone, Delivery Address, Password).
3. Browse products, open product details (with high-contrast specifications), choose any quantity, and click **Instant Buy** or **Add to Cart**.
4. Confirm your delivery address in the address prompt modal to complete the simulated purchase.
5. In the top navbar, open the user dropdown and click **My Buy History** to review your past orders recorded in Supabase.

### 👑 Admin Workflow:
1. Go to [http://localhost:3000/admin.html](http://localhost:3000/admin.html).
2. Sign in with the default admin account:
   - **Username:** `admin1`
   - **Password:** `admin-1`
3. In the **Customer List**, click **Details** next to any customer to inspect their profile and every product they have ever purchased.
4. In the **Orders History** tab, inspect all customer purchase orders and shipping addresses.
5. Click **Logout** to cleanly end the session.

---

## 🤖 Real-Time Telegram Admin Alerts (Optional)

Whenever a customer buys products, your Telegram bot will instantly notify the admin:

1. Create a bot with [@BotFather](https://t.me/BotFather) and copy your **Bot Token**.
2. Message [@userinfobot](https://t.me/userinfobot) to get your personal Telegram **Chat ID**.
3. Add them to your `.env` or Vercel Environment Variables:
   ```env
   TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrSTUvwxYZ
   TELEGRAM_ADMIN_CHAT_ID=123456789
   ```

---

## ☁️ Deploying to Vercel

1. Push your changes to GitHub:
   ```bash
   git add .
   git commit -m "Pure PostgreSQL with Supabase integration"
   git push origin main
   ```
2. In your [Vercel](https://vercel.com) Project Settings -> **Environment Variables**, add:
   - `DATABASE_URL`: Your Supabase connection URI.
   - `JWT_SECRET`: Any secret string (e.g., `techforge_jwt_2026`).
   - `TELEGRAM_BOT_TOKEN` *(optional)*.
   - `TELEGRAM_ADMIN_CHAT_ID` *(optional)*.
3. Click **Redeploy**. Vercel will host your static frontend and Node.js PostgreSQL API routes.
