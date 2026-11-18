# ⚡ TechForge - Telegram Mini App E-Commerce Store

**TechForge** is a fast, responsive, modern computer hardware store designed specifically to run seamlessly as a **Telegram Mini App (TMA)** or standalone web application. Built purely with **HTML5, Bootstrap 5, Custom CSS, and Vanilla JavaScript**, it requires no build steps or heavy dependencies and is ready for 1-click hosting on **Vercel**.

---

## 🌟 Key Features

- 🖥️ **Computer Components Catalog**: 10 products across Peripherals, Components, Displays, and Accessories (RTX 4070 Ti Super, Mechanical Keyboard, Wireless Mouse, 4K Gaming Monitor, NVMe SSD, DDR5 RAM, Ergonomic Stand, etc.).
- 🔍 **Search & Category Filters**: Real-time instant filtering by category and keywords.
- 📦 **View Product Details**: High-resolution modal with complete technical specifications, verified ratings, and stock status.
- 🔢 **Custom Quantities (Any Amount)**: Increase, decrease, or manually type in any positive integer quantity for bulk purchases.
- ⚡ **Instant Auto-Purchase (Assignment Test Mode)**:
  - No real payment or credit card required.
  - One-click auto-purchase generates an immediate order receipt with a simulated order ID (`#TF-XXXXXX`), timestamp, item breakdown, and total.
  - Automatically clears the cart and triggers Telegram Haptic Feedback.
- ✈️ **Native Telegram Mini App Integration**:
  - Embedded `telegram-web-app.js` SDK.
  - Automatic `expand()` to full screen upon loading.
  - Dynamic `MainButton` integration that displays the total cart price and allows checking out directly from the Telegram UI.
  - Detects the user's Telegram username / display name.
  - Native Telegram popups (`showPopup`) and haptic feedback (`HapticFeedback`).

---

## 📂 Project Structure

```text
├── index.html          # Main HTML structure with Bootstrap 5 & modals
├── css/
│   └── style.css       # Custom styles & Telegram WebApp color variables
├── js/
│   ├── products.js     # Data store containing the 10 PC hardware items
│   └── app.js          # Cart logic, search/filters, auto-buy & Telegram SDK glue
├── vercel.json         # Vercel configuration with iframe headers for Telegram Web
└── README.md           # Documentation & step-by-step setup guide
```

---

## 🚀 How to Test Locally

You can test the store in any browser immediately:

### Option 1: Python HTTP Server
Open your terminal in this directory and run:
```bash
python -m http.server 3000
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Option 2: VS Code Live Server
Right-click `index.html` and click **"Open with Live Server"**.

---

## ☁️ How to Deploy on Vercel

1. **Push to GitHub**:
   - Initialize a git repository and push these files to a GitHub repo:
     ```bash
     git init
     git add .
     git commit -m "Initial commit of TechForge Mini App"
     git branch -M main
     # Add your remote and push
     git remote add origin https://github.com/<your-username>/<your-repo-name>.git
     git push -u origin main
     ```
2. **Deploy on Vercel**:
   - Go to [vercel.com](https://vercel.com) and log in.
   - Click **"Add New..."** -> **"Project"**.
   - Select your GitHub repository.
   - Leave the Framework Preset as **Other** (it's pure static HTML/CSS/JS).
   - Click **Deploy**.
3. **Copy your HTTPS URL**:
   - Once deployed, Vercel will give you a live HTTPS URL (e.g., `https://techforge-store.vercel.app`).
   - *(Note: Telegram requires an **HTTPS** URL for Mini Apps, which Vercel provides automatically!)*

---

## 🤖 How to Put It as a Mini App in Telegram

Follow these steps using Telegram's official `@BotFather`:

### Step 1: Create a Telegram Bot
1. Open Telegram and search for [`@BotFather`](https://t.me/BotFather).
2. Send `/newbot`.
3. Give your bot a display name (e.g., `TechForge Store Bot`).
4. Give your bot a unique username ending in `bot` (e.g., `TechForgeStoreTestBot`).
5. Save the Bot Token provided by BotFather.

### Step 2: Create the Mini App Link
1. In `@BotFather`, send `/newapp`.
2. Choose your newly created bot from the list.
3. Enter a title for the Mini App (e.g., `TechForge PC Store`).
4. Enter a short description (e.g., `Buy computer hardware and test auto-purchase`).
5. Upload an image/photo for the app icon when asked (640x360 px or any square/photo).
6. When prompted for the **Web App URL**, paste your **Vercel deployment URL**:
   ```text
   https://your-project-name.vercel.app
   ```
7. Enter a short name for the app (e.g., `store`).
8. BotFather will generate your direct Mini App link:
   `https://t.me/TechForgeStoreTestBot/store`

### Step 3: (Optional) Set as the Bot's Menu Button
To make the Mini App launch from the permanent bottom-left menu button in your bot:
1. In `@BotFather`, send `/setmenubutton`.
2. Select your bot.
3. Click or send the URL of your deployed Vercel app (`https://your-project-name.vercel.app`).
4. Set the button text (e.g., `Open Store` or `🛒 Shop Now`).

Now open your bot, tap the Menu Button or the direct link, and enjoy your Telegram Mini App with 1-click test checkout!
