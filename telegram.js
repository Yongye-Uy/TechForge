/**
 * Telegram Notification Service for Admin Bot
 * Sends real-time purchase alerts to the store administrator via Telegram Bot API.
 */

require('dotenv').config();

async function sendOrderNotificationToAdmin(order) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;

  if (!token || !adminChatId) {
    console.log('ℹ️ Telegram Admin notification skipped (TELEGRAM_BOT_TOKEN or TELEGRAM_ADMIN_CHAT_ID not configured).');
    return false;
  }

  try {
    const itemsList = order.items.map(item => 
      `• <b>${item.quantity}x</b> ${escapeHtml(item.name || item.product_name)} ($${(item.price * item.quantity).toFixed(2)})`
    ).join('\n');

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
      console.warn('⚠️ Telegram Bot API returned error:', data.description);
      return false;
    }

    console.log(`✅ Order notification sent to Admin Telegram (Chat ID: ${adminChatId})`);
    return true;
  } catch (err) {
    console.warn('⚠️ Failed to send Telegram admin notification:', err.message);
    return false;
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
  sendOrderNotificationToAdmin
};
