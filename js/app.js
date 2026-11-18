/**
 * TechForge - Modern E-Commerce & Telegram Mini App Logic
 * Integrated with PostgreSQL Backend, Authentication, Custom Quantities,
 * Address Verification, and Real-time Telegram Admin Alerts.
 */

const API_BASE = '/api';

// Initialize Telegram WebApp API if available
const tg = window.Telegram?.WebApp;

// App State
let currentUser = null;
let authToken = localStorage.getItem('techforge_token') || null;
let currentCategory = 'all';
let searchQuery = '';
let selectedProduct = null;
let modalQuantity = 1;

// Stored items pending checkout when prompt address opens
let pendingCheckoutItems = [];
let pendingCheckoutTotal = 0;

// Shopping Cart (Persisted in localStorage)
let cart = JSON.parse(localStorage.getItem('techforge_cart') || '[]');

// DOM Elements: Navigation & Auth
const guestNavSection = document.getElementById('guestNavSection');
const userNavSection = document.getElementById('userNavSection');
const navUsername = document.getElementById('navUsername');
const navFullName = document.getElementById('navFullName');
const adminPortalLink = document.getElementById('adminPortalLink');
const logoutBtn = document.getElementById('logoutBtn');
const viewMyOrdersNavBtn = document.getElementById('viewMyOrdersNavBtn');

// DOM Elements: Catalog & Filters
const productGrid = document.getElementById('productGrid');
const productCountLabel = document.getElementById('productCountLabel');
const searchInput = document.getElementById('searchInput');
const clearSearchBtn = document.getElementById('clearSearchBtn');
const categoryFilters = document.getElementById('categoryFilters');
const noProductsFound = document.getElementById('noProductsFound');
const resetFiltersBtn = document.getElementById('resetFiltersBtn');

// Bootstrap Modal Instances
let authModal;
let productDetailModal;
let cartModal;
let checkoutAddressModal;
let myOrdersModal;
let receiptModal;
let liveToast;

// Detail Modal Elements
const modalImage = document.getElementById('modalImage');
const modalCategory = document.getElementById('modalCategory');
const modalTitle = document.getElementById('modalTitle');
const modalPrice = document.getElementById('modalPrice');
const modalDescription = document.getElementById('modalDescription');
const modalSpecsList = document.getElementById('modalSpecsList');
const modalRatingStars = document.getElementById('modalRatingStars');
const modalRatingText = document.getElementById('modalRatingText');
const modalQuantityInput = document.getElementById('modalQuantityInput');
const modalSubtotal = document.getElementById('modalSubtotal');
const modalQtyMinus = document.getElementById('modalQtyMinus');
const modalQtyPlus = document.getElementById('modalQtyPlus');
const modalAddToCartBtn = document.getElementById('modalAddToCartBtn');
const modalInstantBuyBtn = document.getElementById('modalInstantBuyBtn');

// Cart Elements
const cartItemsContainer = document.getElementById('cartItemsContainer');
const emptyCartView = document.getElementById('emptyCartView');
const cartFooter = document.getElementById('cartFooter');
const cartTotalAmount = document.getElementById('cartTotalAmount');
const cartCountBadge = document.getElementById('cart-count-badge');
const checkoutBtn = document.getElementById('checkoutBtn');
const clearCartBtn = document.getElementById('clearCartBtn');

// Auth Form Elements
const authAlert = document.getElementById('authAlert');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');

// Checkout Address Modal Elements
const checkoutAddressForm = document.getElementById('checkoutAddressForm');
const checkoutRecipientName = document.getElementById('checkoutRecipientName');
const checkoutRecipientPhone = document.getElementById('checkoutRecipientPhone');
const checkoutRecipientAddress = document.getElementById('checkoutRecipientAddress');
const checkoutAddressTotal = document.getElementById('checkoutAddressTotal');

// My Orders Modal Elements
const myOrdersListContainer = document.getElementById('myOrdersListContainer');

// Receipt Elements
const receiptOrderId = document.getElementById('receiptOrderId');
const receiptCustomerName = document.getElementById('receiptCustomerName');
const receiptTimestamp = document.getElementById('receiptTimestamp');
const receiptAddress = document.getElementById('receiptAddress');
const receiptItemsList = document.getElementById('receiptItemsList');
const receiptTotal = document.getElementById('receiptTotal');

// Toast Notification
const toastEl = document.getElementById('liveToast');
const toastMessage = document.getElementById('toastMessage');
const toastIcon = document.getElementById('toastIcon');

// ==========================================
// 1. Authentication & Session Management
// ==========================================
async function checkAuthSession() {
  if (!authToken) {
    updateAuthUI(null);
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    if (res.ok) {
      const data = await res.json();
      currentUser = data.user;
      updateAuthUI(currentUser);
      return;
    }
  } catch (err) {
    console.warn('Session verification error:', err);
  }

  // Token expired or invalid
  authToken = null;
  currentUser = null;
  localStorage.removeItem('techforge_token');
  updateAuthUI(null);
}

function updateAuthUI(user) {
  if (user) {
    guestNavSection.classList.add('d-none');
    guestNavSection.classList.remove('d-flex');
    userNavSection.classList.remove('d-none');
    userNavSection.classList.add('d-flex');

    navUsername.textContent = user.username;
    navFullName.textContent = user.full_name || user.username;

    // Show Admin Link if user is admin
    if (user.role === 'admin') {
      adminPortalLink.classList.remove('d-none');
    } else {
      adminPortalLink.classList.add('d-none');
    }
  } else {
    guestNavSection.classList.remove('d-none');
    guestNavSection.classList.add('d-flex');
    userNavSection.classList.add('d-none');
    userNavSection.classList.remove('d-flex');
    adminPortalLink.classList.add('d-none');
  }
}

// Login Handler
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  authAlert.classList.add('d-none');

  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value.trim();

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');

    authToken = data.token;
    currentUser = data.user;
    localStorage.setItem('techforge_token', authToken);

    if (currentUser.role === 'admin') {
      localStorage.setItem('techforge_admin_token', authToken);
    }

    updateAuthUI(currentUser);
    loginForm.reset();
    signupForm.reset();
    authModal.hide();
    showToast(`Welcome back, ${currentUser.full_name || currentUser.username}!`);
  } catch (err) {
    authAlert.textContent = err.message;
    authAlert.classList.remove('d-none');
  }
});

// Sign Up Handler
signupForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  authAlert.classList.add('d-none');

  const fullName = document.getElementById('signupFullName').value.trim();
  const username = document.getElementById('signupUsername').value.trim();
  const email = document.getElementById('signupEmail').value.trim();
  const phone = document.getElementById('signupPhone').value.trim();
  const address = document.getElementById('signupAddress').value.trim();
  const password = document.getElementById('signupPassword').value.trim();

  try {
    const res = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName, username, email, phone, address, password })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');

    authToken = data.token;
    currentUser = data.user;
    localStorage.setItem('techforge_token', authToken);

    updateAuthUI(currentUser);
    signupForm.reset();
    loginForm.reset();
    authModal.hide();
    showToast(`Account created! Welcome to TechForge, ${currentUser.full_name}!`);
  } catch (err) {
    authAlert.textContent = err.message;
    authAlert.classList.remove('d-none');
  }
});

// Logout Handler
logoutBtn.addEventListener('click', (e) => {
  e.preventDefault();
  authToken = null;
  currentUser = null;
  localStorage.removeItem('techforge_token');
  localStorage.removeItem('techforge_admin_token');
  updateAuthUI(null);
  showToast('You have been logged out.');
});

// Trigger Auth Required Check
function requireLogin(callbackAction) {
  if (currentUser) {
    callbackAction();
  } else {
    authAlert.textContent = 'Please sign in or create an account to purchase products.';
    authAlert.classList.remove('d-none');
    authModal.show();
  }
}

// ==========================================
// 2. Telegram WebApp Integration
// ==========================================
function initTelegramApp() {
  if (tg) {
    try {
      tg.ready();
      tg.expand();

      if (tg.setHeaderColor) tg.setHeaderColor('secondary_bg_color');
      if (tg.setBackgroundColor) tg.setBackgroundColor('bg_color');

      // Hook Telegram MainButton for quick checkout
      if (tg.MainButton) {
        tg.MainButton.onClick(() => {
          if (cart.length > 0) {
            cartModal.hide();
            setTimeout(() => {
              promptCheckoutAddress(cart, calculateCartTotal());
            }, 300);
          }
        });
      }
    } catch (err) {
      console.warn("Telegram WebApp initialization error:", err);
    }
  }
}

function triggerHaptic(type = 'impact', style = 'medium') {
  try {
    if (tg?.HapticFeedback) {
      if (type === 'impact') {
        tg.HapticFeedback.impactOccurred(style);
      } else if (type === 'notification') {
        tg.HapticFeedback.notificationOccurred(style);
      }
    }
  } catch (e) {}
}

function showToast(message, isSuccess = true) {
  if (!toastMessage || !toastIcon || !liveToast) return;
  toastMessage.textContent = message;
  toastIcon.className = isSuccess 
    ? "bi bi-check-circle-fill text-success fs-5" 
    : "bi bi-exclamation-circle-fill text-warning fs-5";
  liveToast.show();
}

// ==========================================
// 3. Render Product Catalog
// ==========================================
function renderProducts() {
  const filtered = PRODUCTS.filter(product => {
    const matchesCategory = currentCategory === 'all' || product.category === currentCategory;
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch = !query || 
      product.name.toLowerCase().includes(query) || 
      product.description.toLowerCase().includes(query) ||
      product.categoryLabel.toLowerCase().includes(query);
    return matchesCategory && matchesSearch;
  });

  productCountLabel.textContent = `Showing ${filtered.length} of ${PRODUCTS.length} items`;

  if (filtered.length === 0) {
    productGrid.innerHTML = '';
    noProductsFound.classList.remove('d-none');
    return;
  }

  noProductsFound.classList.add('d-none');

  productGrid.innerHTML = filtered.map(product => {
    return `
      <div class="col">
        <div class="product-card h-100 shadow-sm">
          <div class="product-image-wrapper">
            <span class="product-badge-overlay badge bg-dark text-white rounded-pill shadow-sm">
              ${product.categoryLabel}
            </span>
            <img 
              src="${product.image}" 
              alt="${product.name}" 
              class="product-image"
              loading="lazy"
              onerror="this.onerror=null; this.src='https://placehold.co/600x400/1e293b/ffffff?text=${encodeURIComponent(product.name)}';"
            >
          </div>
          <div class="product-card-body">
            <div class="d-flex align-items-center gap-1 text-warning small mb-1">
              <i class="bi bi-star-fill"></i>
              <span class="text-dark fw-bold">${product.rating}</span>
              <span class="text-muted">(${product.reviewCount})</span>
            </div>
            <h3 class="product-card-title">${product.name}</h3>
            <p class="product-card-desc">${product.description}</p>
            
            <div class="product-card-footer">
              <div class="mb-3">
                <span class="text-muted small d-block">Price</span>
                <span class="fs-4 fw-bold text-primary">$${product.price.toFixed(2)}</span>
              </div>
              
              <div class="d-grid gap-2">
                <button class="btn btn-outline-primary btn-sm rounded-pill fw-semibold view-detail-btn" data-id="${product.id}">
                  <i class="bi bi-eye me-1"></i> View Details & Quantity
                </button>
                <div class="d-flex gap-2">
                  <button class="btn btn-primary btn-sm rounded-pill fw-semibold flex-grow-1 quick-buy-btn" data-id="${product.id}" title="Buy Now">
                    <i class="bi bi-lightning-charge-fill me-1"></i> Buy Now
                  </button>
                  <button class="btn btn-outline-secondary btn-sm rounded-pill quick-cart-btn px-3" data-id="${product.id}" title="Add to Cart">
                    <i class="bi bi-cart-plus"></i>
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Event Listeners for Product Card Buttons
  document.querySelectorAll('.view-detail-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const id = parseInt(btn.getAttribute('data-id'));
      openProductDetail(id);
    });
  });

  // Direct Buy Button from Card
  document.querySelectorAll('.quick-buy-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      requireLogin(() => {
        const id = parseInt(btn.getAttribute('data-id'));
        const product = PRODUCTS.find(p => p.id === id);
        if (product) {
          const purchaseItems = [{
            id: product.id,
            name: product.name,
            price: product.price,
            quantity: 1,
            image: product.image
          }];
          promptCheckoutAddress(purchaseItems, product.price);
        }
      });
    });
  });

  // Direct Add to Cart Button from Card
  document.querySelectorAll('.quick-cart-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      requireLogin(() => {
        const id = parseInt(btn.getAttribute('data-id'));
        const product = PRODUCTS.find(p => p.id === id);
        if (product) {
          addToCart(product, 1);
        }
      });
    });
  });
}

// ==========================================
// 4. Product Detail Modal (Fixed Contrast Specs)
// ==========================================
function openProductDetail(productId) {
  const product = PRODUCTS.find(p => p.id === productId);
  if (!product) return;

  selectedProduct = product;
  modalQuantity = 1;
  modalQuantityInput.value = 1;

  // Set Modal Content
  modalTitle.textContent = product.name;
  modalCategory.textContent = product.categoryLabel;
  modalPrice.textContent = `$${product.price.toFixed(2)}`;
  modalDescription.textContent = product.description;
  modalImage.src = product.image;
  modalImage.alt = product.name;
  modalImage.onerror = function() {
    this.onerror = null;
    this.src = `https://placehold.co/600x400/1e293b/ffffff?text=${encodeURIComponent(product.name)}`;
  };

  // Star Ratings
  const fullStars = Math.floor(product.rating);
  let starsHtml = '';
  for (let i = 0; i < fullStars; i++) starsHtml += '<i class="bi bi-star-fill me-1"></i>';
  if (product.rating % 1 !== 0) starsHtml += '<i class="bi bi-star-half me-1"></i>';
  modalRatingStars.innerHTML = starsHtml;
  modalRatingText.textContent = `${product.rating} (${product.reviewCount} verified reviews)`;

  // Specifications with EXPLICIT high-contrast styling (fixes Telegram dark-mode white bug)
  modalSpecsList.innerHTML = product.specs.map(spec => `
    <li class="d-flex align-items-start gap-2 py-1">
      <i class="bi bi-check-circle-fill text-primary mt-1"></i>
      <span style="color: #0f172a !important; font-weight: 600; font-size: 0.88rem;">${spec}</span>
    </li>
  `).join('');

  updateModalSubtotal();
  productDetailModal.show();
  triggerHaptic('impact', 'light');
}

function updateModalSubtotal() {
  if (!selectedProduct) return;
  const qty = parseInt(modalQuantityInput.value) || 1;
  const subtotal = selectedProduct.price * qty;
  modalSubtotal.textContent = `$${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

modalQtyMinus.addEventListener('click', () => {
  let val = parseInt(modalQuantityInput.value) || 1;
  if (val > 1) {
    val--;
    modalQuantityInput.value = val;
    modalQuantity = val;
    updateModalSubtotal();
    triggerHaptic('impact', 'light');
  }
});

modalQtyPlus.addEventListener('click', () => {
  let val = parseInt(modalQuantityInput.value) || 1;
  val++;
  modalQuantityInput.value = val;
  modalQuantity = val;
  updateModalSubtotal();
  triggerHaptic('impact', 'light');
});

modalQuantityInput.addEventListener('input', () => {
  let val = parseInt(modalQuantityInput.value);
  if (isNaN(val) || val < 1) val = 1;
  modalQuantity = val;
  updateModalSubtotal();
});

modalAddToCartBtn.addEventListener('click', () => {
  requireLogin(() => {
    if (!selectedProduct) return;
    const qty = parseInt(modalQuantityInput.value) || 1;
    addToCart(selectedProduct, qty);
    productDetailModal.hide();
  });
});

modalInstantBuyBtn.addEventListener('click', () => {
  requireLogin(() => {
    if (!selectedProduct) return;
    const qty = parseInt(modalQuantityInput.value) || 1;
    const purchaseItems = [{
      id: selectedProduct.id,
      name: selectedProduct.name,
      price: selectedProduct.price,
      quantity: qty,
      image: selectedProduct.image
    }];
    const total = selectedProduct.price * qty;

    productDetailModal.hide();
    setTimeout(() => {
      promptCheckoutAddress(purchaseItems, total);
    }, 350);
  });
});

// ==========================================
// 5. Shopping Cart Management
// ==========================================
function saveCart() {
  localStorage.setItem('techforge_cart', JSON.stringify(cart));
  updateCartBadge();
  updateTelegramMainButton();
}

function updateCartBadge() {
  const badge = document.getElementById('cart-count-badge');
  if (!badge) return;
  const totalItems = cart.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0);
  badge.textContent = totalItems;
  if (totalItems > 0) {
    badge.classList.remove('d-none');
    badge.classList.add('badge-pop');
    setTimeout(() => badge.classList.remove('badge-pop'), 400);
  } else {
    badge.classList.add('d-none');
  }
}

function calculateCartTotal() {
  return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

function updateTelegramMainButton() {
  if (!tg?.MainButton) return;
  const total = calculateCartTotal();
  if (cart.length > 0) {
    tg.MainButton.setText(`CHECKOUT ($${total.toFixed(2)})`);
    tg.MainButton.show();
  } else {
    tg.MainButton.hide();
  }
}

function addToCart(product, quantity = 1) {
  const qty = Math.max(1, parseInt(quantity) || 1);
  const existing = cart.find(item => item.id === product.id);
  if (existing) {
    existing.quantity = (parseInt(existing.quantity) || 0) + qty;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: qty,
      image: product.image
    });
  }

  saveCart();
  triggerHaptic('notification', 'success');
  showToast(`Added ${qty}x "${product.name}" to cart!`);
}

function renderCart() {
  if (cart.length === 0) {
    cartItemsContainer.innerHTML = '';
    emptyCartView.classList.remove('d-none');
    cartFooter.classList.add('d-none');
    return;
  }

  emptyCartView.classList.add('d-none');
  cartFooter.classList.remove('d-none');

  cartItemsContainer.innerHTML = cart.map((item, index) => {
    return `
      <div class="cart-item-row">
        <img src="${item.image}" alt="${item.name}" class="cart-item-thumb" onerror="this.src='https://placehold.co/100x100/1e293b/ffffff?text=Tech';">
        <div class="cart-item-info">
          <div class="title" title="${item.name}">${item.name}</div>
          <div class="text-primary fw-semibold small">$${item.price.toFixed(2)} each</div>
          
          <div class="d-flex align-items-center gap-2 mt-2">
            <div class="input-group input-group-sm quantity-control" style="width: 130px;">
              <button class="btn btn-outline-secondary cart-qty-minus" data-index="${index}" type="button">
                <i class="bi bi-dash"></i>
              </button>
              <input type="number" class="form-control text-center fw-bold cart-qty-input" data-index="${index}" value="${item.quantity}" min="1">
              <button class="btn btn-outline-secondary cart-qty-plus" data-index="${index}" type="button">
                <i class="bi bi-plus"></i>
              </button>
            </div>
            <button class="btn btn-link text-danger p-0 ms-auto remove-item-btn" data-index="${index}" title="Remove item">
              <i class="bi bi-trash3 fs-6"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  cartTotalAmount.textContent = `$${calculateCartTotal().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Quantity handlers
  document.querySelectorAll('.cart-qty-minus').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.getAttribute('data-index'));
      if (cart[idx].quantity > 1) {
        cart[idx].quantity--;
        saveCart();
        renderCart();
        triggerHaptic('impact', 'light');
      } else {
        cart.splice(idx, 1);
        saveCart();
        renderCart();
        triggerHaptic('impact', 'medium');
      }
    });
  });

  document.querySelectorAll('.cart-qty-plus').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.getAttribute('data-index'));
      cart[idx].quantity++;
      saveCart();
      renderCart();
      triggerHaptic('impact', 'light');
    });
  });

  document.querySelectorAll('.cart-qty-input').forEach(input => {
    input.addEventListener('change', () => {
      const idx = parseInt(input.getAttribute('data-index'));
      let val = parseInt(input.value);
      if (isNaN(val) || val < 1) val = 1;
      cart[idx].quantity = val;
      saveCart();
      renderCart();
    });
  });

  document.querySelectorAll('.remove-item-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.getAttribute('data-index'));
      cart.splice(idx, 1);
      saveCart();
      renderCart();
      triggerHaptic('impact', 'medium');
      showToast("Item removed from cart");
    });
  });
}

// Cart Proceed to Checkout
checkoutBtn.addEventListener('click', () => {
  requireLogin(() => {
    if (cart.length === 0) return;
    const itemsToBuy = [...cart];
    const total = calculateCartTotal();

    cartModal.hide();
    setTimeout(() => {
      promptCheckoutAddress(itemsToBuy, total);
    }, 350);
  });
});

clearCartBtn.addEventListener('click', () => {
  if (confirm("Are you sure you want to clear your cart?")) {
    cart = [];
    saveCart();
    renderCart();
    showToast("Cart cleared");
  }
});

// ==========================================
// 6. Address Verification & Backend Purchase Flow
// ==========================================
function promptCheckoutAddress(items, totalAmount) {
  pendingCheckoutItems = items;
  pendingCheckoutTotal = totalAmount;

  checkoutRecipientName.value = currentUser ? (currentUser.full_name || currentUser.username) : 'Customer';
  checkoutRecipientPhone.value = currentUser ? (currentUser.phone || '') : '';
  checkoutRecipientAddress.value = currentUser ? (currentUser.address || '') : '';
  checkoutAddressTotal.textContent = `$${Number(totalAmount).toFixed(2)}`;

  checkoutAddressModal.show();
}

checkoutAddressForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const recipientName = checkoutRecipientName.value.trim();
  const phone = checkoutRecipientPhone.value.trim();
  const shippingAddress = checkoutRecipientAddress.value.trim();

  if (!shippingAddress) {
    alert('Please enter a delivery address.');
    return;
  }

  checkoutAddressModal.hide();

  try {
    const res = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        recipientName,
        shippingAddress,
        phone,
        items: pendingCheckoutItems,
        totalAmount: pendingCheckoutTotal
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to place order.');

    // Clear cart if purchase was from cart
    cart = [];
    saveCart();

    // Show simulated purchase receipt
    showReceiptModal(data.order);
    triggerHaptic('notification', 'success');

  } catch (err) {
    alert('Purchase error: ' + err.message);
  }
});

function showReceiptModal(order) {
  receiptOrderId.textContent = `#${order.order_code}`;
  receiptCustomerName.textContent = order.customer_name;
  receiptTimestamp.textContent = new Date(order.created_at || Date.now()).toLocaleString();
  receiptAddress.textContent = order.shipping_address;
  receiptTotal.textContent = `$${Number(order.total_amount).toFixed(2)}`;

  receiptItemsList.innerHTML = order.items.map(item => `
    <li class="d-flex justify-content-between align-items-center py-1 border-bottom">
      <span class="text-truncate me-2">
        <strong class="text-primary">${item.quantity}x</strong> ${item.name || item.product_name}
      </span>
      <span class="fw-bold text-nowrap">$${(Number(item.price) * Number(item.quantity)).toFixed(2)}</span>
    </li>
  `).join('');

  setTimeout(() => {
    receiptModal.show();
  }, 350);
}

// ==========================================
// 7. Customer Buy History (My Orders)
// ==========================================
viewMyOrdersNavBtn.addEventListener('click', async (e) => {
  e.preventDefault();
  requireLogin(async () => {
    try {
      const res = await fetch(`${API_BASE}/orders/my-orders`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      if (!res.ok) throw new Error('Could not load orders');
      const data = await res.json();
      const orders = data.orders || [];

      if (orders.length === 0) {
        myOrdersListContainer.innerHTML = `
          <div class="text-center py-5 text-muted">
            <i class="bi bi-bag-x fs-1 d-block mb-2"></i>
            <h5>No Orders Yet</h5>
            <p class="small">You haven't purchased any computer gear yet.</p>
          </div>
        `;
      } else {
        myOrdersListContainer.innerHTML = orders.map(order => {
          const dateStr = new Date(order.created_at).toLocaleString();
          const itemsList = order.items.map(i => `
            <li class="d-flex justify-content-between py-1 border-bottom small">
              <span><strong>${i.quantity}x</strong> ${i.product_name}</span>
              <span class="text-muted">$${Number(i.subtotal || (i.price * i.quantity)).toFixed(2)}</span>
            </li>
          `).join('');

          return `
            <div class="card border rounded-3 mb-3 shadow-none">
              <div class="card-header bg-white d-flex justify-content-between align-items-center py-2">
                <div>
                  <span class="badge bg-dark rounded-pill">${order.order_code}</span>
                  <span class="text-muted small ms-2">${dateStr}</span>
                </div>
                <span class="fs-6 fw-bold text-primary">$${Number(order.total_amount).toFixed(2)}</span>
              </div>
              <div class="card-body p-3">
                <div class="small text-muted mb-2">
                  <i class="bi bi-geo-alt text-primary me-1"></i> <strong>Shipped to:</strong> ${order.shipping_address}
                </div>
                <ul class="list-unstyled mb-0">
                  ${itemsList}
                </ul>
              </div>
            </div>
          `;
        }).join('');
      }

      myOrdersModal.show();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  });
});

// ==========================================
// 8. Search & Filters
// ==========================================
searchInput.addEventListener('input', (e) => {
  searchQuery = e.target.value;
  renderProducts();
});

clearSearchBtn.addEventListener('click', () => {
  searchInput.value = '';
  searchQuery = '';
  renderProducts();
});

categoryFilters.addEventListener('click', (e) => {
  const btn = e.target.closest('.filter-btn');
  if (!btn) return;

  document.querySelectorAll('.filter-btn').forEach(b => {
    b.classList.remove('btn-dark', 'active');
    b.classList.add('btn-outline-secondary');
  });

  btn.classList.remove('btn-outline-secondary');
  btn.classList.add('btn-dark', 'active');

  currentCategory = btn.getAttribute('data-category');
  renderProducts();
  triggerHaptic('impact', 'light');
});

resetFiltersBtn.addEventListener('click', () => {
  searchInput.value = '';
  searchQuery = '';
  currentCategory = 'all';

  document.querySelectorAll('.filter-btn').forEach(b => {
    b.classList.remove('btn-dark', 'active');
    b.classList.add('btn-outline-secondary');
    if (b.getAttribute('data-category') === 'all') {
      b.classList.remove('btn-outline-secondary');
      b.classList.add('btn-dark', 'active');
    }
  });

  renderProducts();
});

// ==========================================
// 9. App Initialization on DOM Ready
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  // Initialize Bootstrap Modals
  authModal = new bootstrap.Modal(document.getElementById('authModal'));
  productDetailModal = new bootstrap.Modal(document.getElementById('productDetailModal'));
  cartModal = new bootstrap.Modal(document.getElementById('cartModal'));
  checkoutAddressModal = new bootstrap.Modal(document.getElementById('checkoutAddressModal'));
  myOrdersModal = new bootstrap.Modal(document.getElementById('myOrdersModal'));
  receiptModal = new bootstrap.Modal(document.getElementById('receiptModal'));
  liveToast = new bootstrap.Toast(document.getElementById('liveToast'), { delay: 3500 });

  document.getElementById('cartModal').addEventListener('show.bs.modal', renderCart);

  // Clear auth inputs whenever auth modal is closed
  document.getElementById('authModal').addEventListener('hidden.bs.modal', () => {
    loginForm.reset();
    signupForm.reset();
    authAlert.classList.add('d-none');
  });

  initTelegramApp();
  checkAuthSession();
  renderProducts();
  updateCartBadge();
  updateTelegramMainButton();
});
