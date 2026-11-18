/**
 * TechForge Admin Portal Logic
 * Handles Admin authentication, customer overview, and order history inspection.
 */

const API_BASE = '/api';

// Admin State
let adminToken = localStorage.getItem('techforge_admin_token') || localStorage.getItem('techforge_token') || null;
let adminUser = null;

// DOM Elements
const adminLoginSection = document.getElementById('adminLoginSection');
const adminDashboardSection = document.getElementById('adminDashboardSection');
const adminLoginForm = document.getElementById('adminLoginForm');
const adminLoginAlert = document.getElementById('adminLoginAlert');
const adminUserBadge = document.getElementById('adminUserBadge');
const adminName = document.getElementById('adminName');
const adminLogoutBtn = document.getElementById('adminLogoutBtn');

// Dashboard Elements
const statTotalRevenue = document.getElementById('statTotalRevenue');
const statTotalOrders = document.getElementById('statTotalOrders');
const statTotalCustomers = document.getElementById('statTotalCustomers');
const customerCountBadge = document.getElementById('customerCountBadge');
const ordersCountBadge = document.getElementById('ordersCountBadge');
const customersTableBody = document.getElementById('customersTableBody');
const ordersTableBody = document.getElementById('ordersTableBody');
const refreshCustomersBtn = document.getElementById('refreshCustomersBtn');
const refreshOrdersBtn = document.getElementById('refreshOrdersBtn');

// Modals
const customerDetailModal = new bootstrap.Modal(document.getElementById('customerDetailModal'));
const adminOrderReceiptModal = new bootstrap.Modal(document.getElementById('adminOrderReceiptModal'));

// Customer Detail Elements
const custDetailName = document.getElementById('custDetailName');
const custDetailUsername = document.getElementById('custDetailUsername');
const custDetailEmail = document.getElementById('custDetailEmail');
const custDetailPhone = document.getElementById('custDetailPhone');
const custDetailAddress = document.getElementById('custDetailAddress');
const customerOrdersContainer = document.getElementById('customerOrdersContainer');

// Receipt Modal Elements
const adminReceiptCode = document.getElementById('adminReceiptCode');
const adminReceiptCustomer = document.getElementById('adminReceiptCustomer');
const adminReceiptDate = document.getElementById('adminReceiptDate');
const adminReceiptAddress = document.getElementById('adminReceiptAddress');
const adminReceiptItems = document.getElementById('adminReceiptItems');
const adminReceiptTotal = document.getElementById('adminReceiptTotal');

// ==========================================
// 1. Admin Authentication
// ==========================================
async function checkAdminAuth() {
  if (!adminToken) {
    showLoginView();
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    if (res.ok) {
      const data = await res.json();
      if (data.user && data.user.role === 'admin') {
        adminUser = data.user;
        showDashboardView();
        loadDashboardData();
        return;
      }
    }
  } catch (err) {
    console.warn('Auth check error:', err);
  }

  // If invalid or not admin
  adminToken = null;
  localStorage.removeItem('techforge_admin_token');
  showLoginView();
}

function showLoginView() {
  adminLoginSection.classList.remove('d-none');
  adminDashboardSection.classList.add('d-none');
  adminUserBadge.classList.remove('d-flex');
  adminUserBadge.classList.add('d-none');
}

function showDashboardView() {
  adminLoginSection.classList.add('d-none');
  adminDashboardSection.classList.remove('d-none');
  adminUserBadge.classList.remove('d-none');
  adminUserBadge.classList.add('d-flex');
  adminName.innerHTML = `<i class="bi bi-person-badge me-1"></i> ${adminUser?.username || 'admin1'}`;
}

adminLoginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  adminLoginAlert.classList.add('d-none');

  const username = document.getElementById('adminUsername').value.trim();
  const password = document.getElementById('adminPassword').value.trim();

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Authentication failed');
    }

    if (data.user.role !== 'admin') {
      throw new Error('Access denied. Account does not have administrator privileges.');
    }

    adminToken = data.token;
    adminUser = data.user;
    localStorage.setItem('techforge_admin_token', adminToken);
    localStorage.setItem('techforge_token', adminToken);

    showDashboardView();
    loadDashboardData();
  } catch (err) {
    adminLoginAlert.textContent = err.message;
    adminLoginAlert.classList.remove('d-none');
  }
});

adminLogoutBtn.addEventListener('click', (e) => {
  e.preventDefault();
  adminToken = null;
  adminUser = null;
  localStorage.removeItem('techforge_admin_token');
  localStorage.removeItem('techforge_token');
  if (adminLoginForm) adminLoginForm.reset();
  showLoginView();
  // Ensure complete fresh state
  window.location.reload();
});

// ==========================================
// 2. Load Dashboard Statistics & Data
// ==========================================
async function loadDashboardData() {
  loadCustomers();
  loadOrders();
}

async function loadCustomers() {
  try {
    const res = await fetch(`${API_BASE}/admin/customers`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    if (!res.ok) throw new Error('Failed to load customers');
    const data = await res.json();
    const customers = data.customers || [];

    statTotalCustomers.textContent = customers.length;
    customerCountBadge.textContent = customers.length;

    if (customers.length === 0) {
      customersTableBody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center py-4 text-muted">
            <i class="bi bi-people fs-3 d-block mb-2"></i>
            No customers registered yet.
          </td>
        </tr>
      `;
      return;
    }

    customersTableBody.innerHTML = customers.map(c => `
      <tr>
        <td>
          <div class="fw-bold text-dark">${c.full_name}</div>
          <div class="small text-muted">@${c.username}</div>
        </td>
        <td class="small">${c.email || '<span class="text-muted">None</span>'}</td>
        <td class="small">${c.phone || '<span class="text-muted">None</span>'}</td>
        <td class="small text-truncate" style="max-width: 200px;" title="${c.address || ''}">
          ${c.address || '<span class="text-muted">No address</span>'}
        </td>
        <td>
          <span class="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill">
            ${c.total_orders} Orders
          </span>
        </td>
        <td class="fw-bold text-primary">$${Number(c.total_spent || 0).toFixed(2)}</td>
        <td>
          <button class="btn btn-outline-primary btn-sm rounded-pill px-3 view-customer-btn" data-id="${c.id}">
            <i class="bi bi-eye me-1"></i> Details
          </button>
        </td>
      </tr>
    `).join('');

    document.querySelectorAll('.view-customer-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        viewCustomerDetail(id);
      });
    });

  } catch (err) {
    console.error('Customers load error:', err);
  }
}

async function loadOrders() {
  try {
    const res = await fetch(`${API_BASE}/admin/orders`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    if (!res.ok) throw new Error('Failed to load orders');
    const data = await res.json();
    const orders = data.orders || [];

    statTotalOrders.textContent = orders.length;
    ordersCountBadge.textContent = orders.length;

    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total_amount), 0);
    statTotalRevenue.textContent = `$${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    if (orders.length === 0) {
      ordersTableBody.innerHTML = `
        <tr>
          <td colspan="8" class="text-center py-4 text-muted">
            <i class="bi bi-receipt fs-3 d-block mb-2"></i>
            No orders placed yet.
          </td>
        </tr>
      `;
      return;
    }

    ordersTableBody.innerHTML = orders.map(o => {
      const dateStr = new Date(o.created_at).toLocaleDateString() + ' ' + new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const itemsSummary = o.items ? o.items.map(i => `${i.quantity}x ${i.product_name}`).join(', ') : 'Details in receipt';

      return `
        <tr>
          <td><span class="badge bg-dark rounded-pill fw-bold">${o.order_code}</span></td>
          <td>
            <div class="fw-semibold">${o.customer_name}</div>
            <div class="small text-muted">${o.customer_username ? `@${o.customer_username}` : ''}</div>
          </td>
          <td class="small text-muted">${dateStr}</td>
          <td class="small text-truncate" style="max-width: 180px;" title="${o.shipping_address}">${o.shipping_address}</td>
          <td class="small text-truncate" style="max-width: 200px;" title="${itemsSummary}">${itemsSummary}</td>
          <td class="fw-bold text-primary">$${Number(o.total_amount).toFixed(2)}</td>
          <td>
            <span class="badge bg-success-subtle text-success border border-success-subtle rounded-pill">
              ${o.payment_status || 'PAID'}
            </span>
          </td>
          <td>
            <button class="btn btn-outline-secondary btn-sm rounded-pill px-3 view-order-btn" data-order='${JSON.stringify(o).replace(/'/g, "&apos;")}'>
              Receipt
            </button>
          </td>
        </tr>
      `;
    }).join('');

    document.querySelectorAll('.view-order-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const orderData = JSON.parse(btn.getAttribute('data-order'));
        openAdminReceipt(orderData);
      });
    });

  } catch (err) {
    console.error('Orders load error:', err);
  }
}

// ==========================================
// 3. Customer Detail & Purchase History Modal
// ==========================================
async function viewCustomerDetail(customerId) {
  try {
    const res = await fetch(`${API_BASE}/admin/customers/${customerId}`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    if (!res.ok) throw new Error('Could not fetch customer');
    const data = await res.json();
    const { customer, orders } = data;

    custDetailName.textContent = customer.full_name;
    custDetailUsername.textContent = `@${customer.username}`;
    custDetailEmail.textContent = customer.email || 'None';
    custDetailPhone.textContent = customer.phone || 'None';
    custDetailAddress.textContent = customer.address || 'No registered address';

    if (!orders || orders.length === 0) {
      customerOrdersContainer.innerHTML = `
        <div class="alert alert-light border text-center text-muted py-4 rounded-3">
          This customer has not placed any orders yet.
        </div>
      `;
    } else {
      customerOrdersContainer.innerHTML = orders.map(order => {
        const orderDate = new Date(order.created_at).toLocaleDateString() + ' ' + new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const itemsList = order.items.map(item => `
          <li class="d-flex justify-content-between align-items-center py-1 border-bottom small">
            <span><strong>${item.quantity}x</strong> ${item.product_name}</span>
            <span class="text-muted">$${Number(item.subtotal || (item.price * item.quantity)).toFixed(2)}</span>
          </li>
        `).join('');

        return `
          <div class="card border rounded-3 mb-3 shadow-none">
            <div class="card-header bg-white d-flex justify-content-between align-items-center py-2">
              <div>
                <span class="fw-bold text-dark">${order.order_code}</span>
                <span class="text-muted small ms-2">${orderDate}</span>
              </div>
              <span class="fs-6 fw-bold text-primary">$${Number(order.total_amount).toFixed(2)}</span>
            </div>
            <div class="card-body p-3">
              <div class="small text-muted mb-2">
                <strong>Delivery Address:</strong> ${order.shipping_address}
              </div>
              <ul class="list-unstyled mb-0">
                ${itemsList}
              </ul>
            </div>
          </div>
        `;
      }).join('');
    }

    customerDetailModal.show();
  } catch (err) {
    alert('Error loading customer details: ' + err.message);
  }
}

// Open Order Receipt Modal
function openAdminReceipt(order) {
  adminReceiptCode.textContent = order.order_code;
  adminReceiptCustomer.textContent = `${order.customer_name} (@${order.customer_username || 'Guest'})`;
  adminReceiptDate.textContent = new Date(order.created_at).toLocaleString();
  adminReceiptAddress.textContent = order.shipping_address;
  adminReceiptTotal.textContent = `$${Number(order.total_amount).toFixed(2)}`;

  if (order.items && order.items.length > 0) {
    adminReceiptItems.innerHTML = order.items.map(item => `
      <li class="d-flex justify-content-between align-items-center py-1">
        <span><strong>${item.quantity}x</strong> ${item.product_name}</span>
        <span>$${(Number(item.price) * Number(item.quantity)).toFixed(2)}</span>
      </li>
    `).join('');
  } else {
    adminReceiptItems.innerHTML = '<li class="text-muted">Item details unavailable</li>';
  }

  adminOrderReceiptModal.show();
}

// Refresh Handlers
refreshCustomersBtn.addEventListener('click', loadCustomers);
refreshOrdersBtn.addEventListener('click', loadOrders);

// Initialize Admin Portal
document.addEventListener('DOMContentLoaded', () => {
  checkAdminAuth();
});
