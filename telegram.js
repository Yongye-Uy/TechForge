/**
 * Telegram Notification Service for Admin Bot
 * Sends real-time purchase alerts to the store administrator via Telegram Bot API.
 */

require('dotenv').config();

function getCredentials() {
  const token = process.env.TELEGRAM_BOT_TOKEN ? process.env.TELEGRAM_BOT_TOKEN.trim() : null;
  const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID ? process.env.TELEGRAM_ADMIN_CHAT_ID.trim() : null;
  return { token, adminChatId };
}

async function sendOrderNotificationToAdmin(order) {
  const { token, adminChatId } = getCredentials();

  if (!token || !adminChatId) {
    console.log('ℹ️ Telegram Admin notification skipped: TELEGRAM_BOT_TOKEN or TELEGRAM_ADMIN_CHAT_ID is missing.');
    return { success: false, reason: 'Credentials not configured' };
  }

  try {
    const items = order.items || [];
    const itemsList = items.map(item => 
      `• <b>${item.quantity}x</b> ${escapeHtml(item.name || item.product_name)} ($${(Number(item.price) * Number(item.quantity)).toFixed(2)})`
    ).join('\n') || '• 1x Order Package';

    const message = `
🛍️ <b>NEW ORDER RECEIVED!</b>

📦 <b>Order Code:</b> <code>${order.order_code}</code>
👤 <b>Customer:</b> ${escapeHtml(order.customer_name)} ${order.customer_username ? `(@${escapeHtml(order.customer_username)})` : ''}
📧 <b>Email:</b> ${escapeHtml(order.customer_email || 'N/A')}
📞 <b>Phone:</b> ${escapeHtml(order.customer_phone || 'N/A')}
📍 <b>Shipping Address:</b>
${escapeHtml(order.shipping_address)}

🛒 <b>Items Bought:</b>
${itemsList}

💰 <b>Total Amount:</b> <b>$${Number(order.total_amount).toFixed(2)}</b>
💳 <b>Status:</b> ${order.payment_status || 'PAID (Simulated)'}
⏰ <b>Time:</b> ${new Date(order.created_at || Date.now()).toLocaleString()}
    `.trim();

    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: adminChatId,
        text: message,
        parse_mode: 'HTML'
      })
    });

    const data = await res.json();
    if (!data.ok) {
      console.warn('⚠️ Telegram Bot API error:', data.description);
      return { success: false, error: data.description };
    }

    console.log(`✅ Order notification sent to Admin Telegram (Chat ID: ${adminChatId})`);
    return { success: true };
  } catch (err) {
    console.warn('⚠️ Failed to send Telegram admin notification:', err.message);
    return { success: false, error: err.message };
  }
}

// Test / Diagnostic helper to test the bot directly from browser
async function testTelegramConnection() {
  const { token, adminChatId } = getCredentials();

  if (!token) {
    return {
      success: false,
      error: 'TELEGRAM_BOT_TOKEN is missing in Vercel Environment Variables.'
    };
  }

  if (!adminChatId) {
    return {
      success: false,
      error: 'TELEGRAM_ADMIN_CHAT_ID is missing in Vercel Environment Variables.'
    };
  }

  try {
    // 1. Verify Bot Token with getMe
    const meRes = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const meData = await meRes.json();

    if (!meData.ok) {
      return {
        success: false,
        step: 'Bot Token Validation',
        error: `Invalid TELEGRAM_BOT_TOKEN: ${meData.description}`
      };
    }

    const botUsername = meData.result.username;

    // 2. Try sending test message
    const sendRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: adminChatId,
        text: `🧪 <b>TechForge Test Message</b>\n\nHello Admin! Your Telegram order notifications are working correctly! ✅`,
        parse_mode: 'HTML'
      })
    });

    const sendData = await sendRes.json();

    if (!sendData.ok) {
      let advice = '';
      if (sendData.description.includes('chat not found') || sendData.description.includes("bot can't initiate conversation")) {
        advice = `👉 You MUST open Telegram, find your bot (@${botUsername}), and tap "START" (or send /start) once! Telegram blocks bots from messaging users who haven't started a chat first.`;
      }

      return {
        success: false,
        bot_username: `@${botUsername}`,
        chat_id: adminChatId,
        error: sendData.description,
        solution: advice
      };
    }

    return {
      success: true,
      bot_username: `@${botUsername}`,
      chat_id: adminChatId,
      message: 'Test message sent successfully! Check your Telegram app.'
    };
  } catch (err) {
    return {
      success: false,
      error: err.message
    };
  }
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

module.exports = {
  sendOrderNotificationToAdmin,
  testTelegramConnection
};
