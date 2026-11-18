/**
 * TechForge - E-Commerce Mini App Logic
 * Handles Telegram WebApp integration, product rendering, cart state,
 * quantity management, and simulated auto-checkout.
 */

// Initialize Telegram WebApp API if running inside Telegram
const tg = window.Telegram?.WebApp;

// App State
let currentCategory = 'all';
let searchQuery = '';
let selectedProduct = null;
let modalQuantity = 1;

// Shopping Cart (Persisted in localStorage)
let cart = JSON.parse(localStorage.getItem('techforge_cart') || '[]');

// DOM Elements
const productGrid = document.getElementById('productGrid');
const productCountLabel = document.getElementById('productCountLabel');
const searchInput = document.getElementById('searchInput');
const clearSearchBtn = document.getElementById('clearSearchBtn');
const categoryFilters = document.getElementById('categoryFilters');
const noProductsFound = document.getElementById('noProductsFound');
const resetFiltersBtn = document.getElementById('resetFiltersBtn');

// Cart Elements
const cartModal = new bootstrap.Modal(document.getElementById('cartModal'));
const cartItemsContainer = document.getElementById('cartItemsContainer');
const emptyCartView = document.getElementById('emptyCartView');
const cartFooter = document.getElementById('cartFooter');
const cartTotalAmount = document.getElementById('cartTotalAmount');
const cartCountBadge = document.getElementById('cartCountBadge');
const checkoutBtn = document.getElementById('checkoutBtn');
const clearCartBtn = document.getElementById('clearCartBtn');

// Detail Modal Elements
const productDetailModal = new bootstrap.Modal(document.getElementById('productDetailModal'));
const modalImage = document.getElementById('modalImage');
const modalCategory = document.getElementById('modalCategory');
const modalTitle = document.getElementById('modalTitle');
const modalPrice = document.getElementById('modalPrice');
const modalStock = document.getElementById('modalStock');
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

// Receipt Elements
const receiptModal = new bootstrap.Modal(document.getElementById('receiptModal'));
const receiptOrderId = document.getElementById('receiptOrderId');
const receiptTimestamp = document.getElementById('receiptTimestamp');
const receiptItemsList = document.getElementById('receiptItemsList');
const receiptTotal = document.getElementById('receiptTotal');

// Toast Notification
const toastEl = document.getElementById('liveToast');
const toastMessage = document.getElementById('toastMessage');
const toastIcon = document.getElementById('toastIcon');
const liveToast = new bootstrap.Toast(toastEl, { delay: 2500 });

// ==========================================
// 1. Telegram WebApp Initialization
// ==========================================
function initTelegramApp() {
  if (tg) {
    tg.ready();
    tg.expand();

    // Set header & background colors matching Telegram theme
    if (tg.setHeaderColor) tg.setHeaderColor('secondary_bg_color');
    if (tg.setBackgroundColor) tg.setBackgroundColor('bg_color');

    // Display Telegram user info if available
    const user = tg.initDataUnsafe?.user;
    if (user) {
      const userPill = document.getElementById('tg-user-pill');
      const usernameSpan = document.getElementById('tg-username');
      if (userPill && usernameSpan) {
        usernameSpan.textContent = user.username ? `@${user.username}` : user.first_name || 'Telegram User';
        userPill.classList.remove('d-none');
        userPill.classList.add('d-flex');
      }
    }

    // Configure Telegram MainButton for fast checkout
    if (tg.MainButton) {
      tg.MainButton.onClick(() => {
        if (cart.length > 0) {
          cartModal.hide();
          executeAutoPurchase(cart, calculateCartTotal());
        }
      });
    }
  }
}

// Trigger haptic feedback if inside Telegram
function triggerHaptic(type = 'impact', style = 'medium') {
  if (tg?.HapticFeedback) {
    if (type === 'impact') {
      tg.HapticFeedback.impactOccurred(style);
    } else if (type === 'notification') {
      tg.HapticFeedback.notificationOccurred(style);
    }
  }
}

// Show Toast feedback
function showToast(message, isSuccess = true) {
  toastMessage.textContent = message;
  toastIcon.className = isSuccess 
    ? "bi bi-check-circle-fill text-success fs-5" 
    : "bi bi-exclamation-circle-fill text-warning fs-5";
  liveToast.show();
}

// ==========================================
// 2. Render Product Catalog
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

  // Update counts
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
            <span class="product-badge-overlay badge bg-dark-subtle text-dark border border-secondary-subtle rounded-pill">
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
              <div class="d-flex justify-content-between align-items-center mb-3">
                <div>
                  <span class="text-muted small d-block">Price</span>
                  <span class="fs-5 fw-bold text-primary">$${product.price.toFixed(2)}</span>
                </div>
                <span class="badge bg-success-subtle text-success border border-success-subtle rounded-pill">
                  In Stock (${product.stock})
                </span>
              </div>
              <div class="d-grid gap-2">
                <button class="btn btn-outline-primary btn-sm rounded-pill fw-semibold view-detail-btn" data-id="${product.id}">
                  <i class="bi bi-eye me-1"></i> View Details
                </button>
                <button class="btn btn-primary btn-sm rounded-pill fw-semibold quick-buy-btn" data-id="${product.id}">
                  <i class="bi bi-lightning-charge me-1"></i> Instant Buy
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Attach event listeners to buttons
  document.querySelectorAll('.view-detail-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.getAttribute('data-id'));
      openProductDetail(id);
    });
  });

  document.querySelectorAll('.quick-buy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = parseInt(btn.getAttribute('data-id'));
      openProductDetail(id, true);
    });
  });
}

// ==========================================
// 3. Product Detail View & Quantity Control
// ==========================================
function openProductDetail(productId, focusBuy = false) {
  const product = PRODUCTS.find(p => p.id === productId);
  if (!product) return;

  selectedProduct = product;
  modalQuantity = 1;
  modalQuantityInput.value = 1;

  // Populate modal data
  modalTitle.textContent = product.name;
  modalCategory.textContent = product.categoryLabel;
  modalPrice.textContent = `$${product.price.toFixed(2)}`;
  modalStock.textContent = `In Stock (${product.stock} available)`;
  modalDescription.textContent = product.description;
  modalImage.src = product.image;
  modalImage.alt = product.name;
  modalImage.onerror = function() {
    this.onerror = null;
    this.src = `https://placehold.co/600x400/1e293b/ffffff?text=${encodeURIComponent(product.name)}`;
  };

  // Star ratings
  const fullStars = Math.floor(product.rating);
  let starsHtml = '';
  for (let i = 0; i < fullStars; i++) starsHtml += '<i class="bi bi-star-fill me-1"></i>';
  if (product.rating % 1 !== 0) starsHtml += '<i class="bi bi-star-half me-1"></i>';
  modalRatingStars.innerHTML = starsHtml;
  modalRatingText.textContent = `${product.rating} (${product.reviewCount} verified reviews)`;

  // Specs List
  modalSpecsList.innerHTML = product.specs.map(spec => `
    <li>
      <i class="bi bi-check-circle-fill text-primary"></i>
      <span>${spec}</span>
    </li>
  `).join('');

  updateModalSubtotal();
  productDetailModal.show();

  triggerHaptic('impact', 'light');

  if (focusBuy) {
    setTimeout(() => {
      modalInstantBuyBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
      modalInstantBuyBtn.classList.add('pulse-animation');
      setTimeout(() => modalInstantBuyBtn.classList.remove('pulse-animation'), 1000);
    }, 300);
  }
}

function updateModalSubtotal() {
  if (!selectedProduct) return;
  const qty = parseInt(modalQuantityInput.value) || 1;
  const subtotal = selectedProduct.price * qty;
  modalSubtotal.textContent = `$${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Modal Quantity Listeners
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

// Add to Cart from Detail Modal
modalAddToCartBtn.addEventListener('click', () => {
  if (!selectedProduct) return;
  const qty = parseInt(modalQuantityInput.value) || 1;
  addToCart(selectedProduct, qty);
  productDetailModal.hide();
});

// Instant Buy from Detail Modal (Auto Purchase without real payment)
modalInstantBuyBtn.addEventListener('click', () => {
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
  executeAutoPurchase(purchaseItems, total);
});

// ==========================================
// 4. Cart Operations & Persistence
// ==========================================
function saveCart() {
  localStorage.setItem('techforge_cart', JSON.stringify(cart));
  updateCartBadge();
  updateTelegramMainButton();
}

function updateCartBadge() {
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  cartCountBadge.textContent = totalItems;
  if (totalItems > 0) {
    cartCountBadge.classList.remove('d-none');
  } else {
    cartCountBadge.classList.add('d-none');
  }
}

function calculateCartTotal() {
  return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

function updateTelegramMainButton() {
  if (!tg?.MainButton) return;
  const total = calculateCartTotal();
  if (cart.length > 0) {
    tg.MainButton.setText(`AUTO-BUY NOW ($${total.toFixed(2)})`);
    tg.MainButton.show();
  } else {
    tg.MainButton.hide();
  }
}

function addToCart(product, quantity = 1) {
  const existing = cart.find(item => item.id === product.id);
  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: quantity,
      image: product.image
    });
  }

  saveCart();
  triggerHaptic('notification', 'success');
  showToast(`Added ${quantity}x "${product.name}" to cart!`);
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
          
          <!-- Quantity Control for any amount -->
          <div class="d-flex align-items-center gap-2 mt-2">
            <div class="input-group input-group-sm quantity-control" style="width: 120px;">
              <button class="btn btn-outline-secondary cart-qty-minus" data-index="${index}" type="button">
                <i class="bi bi-dash"></i>
              </button>
              <input type="number" class="form-control text-center fw-bold cart-qty-input" data-index="${index}" value="${item.quantity}" min="1">
              <button class="btn btn-outline-secondary cart-qty-plus" data-index="${index}" type="button">
                <i class="bi bi-plus"></i>
              </button>
            </div>
            <button class="btn btn-link text-danger p-0 ms-auto remove-item-btn" data-index="${index}" title="Remove item">
              <i class="bi bi-trash3"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  cartTotalAmount.textContent = `$${calculateCartTotal().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Attach handlers
  document.querySelectorAll('.cart-qty-minus').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.getAttribute('data-index'));
      if (cart[idx].quantity > 1) {
        cart[idx].quantity--;
        saveCart();
        renderCart();
        triggerHaptic('impact', 'light');
      } else {
        // If 1, remove item
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

// Cart checkout & clear events
checkoutBtn.addEventListener('click', () => {
  if (cart.length === 0) return;
  cartModal.hide();
  executeAutoPurchase(cart, calculateCartTotal());
});

clearCartBtn.addEventListener('click', () => {
  if (confirm("Are you sure you want to clear your cart?")) {
    cart = [];
    saveCart();
    renderCart();
    showToast("Cart cleared");
  }
});

// Re-render cart whenever the modal is shown
document.getElementById('cartModal').addEventListener('show.bs.modal', renderCart);

// ==========================================
// 5. Simulated Auto-Purchase Flow
// ==========================================
function executeAutoPurchase(items, totalAmount) {
  // Trigger Telegram Haptic Feedback
  triggerHaptic('notification', 'success');

  // Generate simulated receipt
  const randomId = 'TF-' + Math.floor(100000 + Math.random() * 900000);
  const now = new Date();
  const timestampStr = now.toLocaleDateString() + ' ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  receiptOrderId.textContent = `#${randomId}`;
  receiptTimestamp.textContent = timestampStr;
  receiptTotal.textContent = `$${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  receiptItemsList.innerHTML = items.map(item => `
    <li class="d-flex justify-content-between align-items-center py-1">
      <span class="text-truncate me-2">
        <strong>${item.quantity}x</strong> ${item.name}
      </span>
      <span class="fw-semibold text-nowrap">$${(item.price * item.quantity).toFixed(2)}</span>
    </li>
  `).join('');

  // If items bought came from cart, clear cart
  cart = [];
  saveCart();

  // If Telegram WebApp supports popups, show native alert or show Bootstrap receipt modal
  if (tg?.showPopup) {
    tg.showPopup({
      title: "Purchase Successful!",
      message: `Order #${randomId} confirmed!\nTotal Paid (Simulated): $${totalAmount.toFixed(2)}\nThank you for testing TechForge Mini App!`,
      buttons: [{ type: 'ok', text: 'View Full Receipt' }]
    }, () => {
      receiptModal.show();
    });
  } else {
    receiptModal.show();
  }

  // If in Telegram bot chat, optionally send data back to bot
  // Note: tg.sendData works only when mini app is opened via a KeyboardButton
  try {
    if (tg?.sendData && false) { // Kept disabled by default so webview doesn't abruptly close unless requested
      tg.sendData(JSON.stringify({ orderId: randomId, total: totalAmount, count: items.length }));
    }
  } catch (e) {
    console.log("sendData ignored in web context", e);
  }
}

// ==========================================
// 6. Search & Filters
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
// 7. Initialize Application
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  initTelegramApp();
  renderProducts();
  updateCartBadge();
  updateTelegramMainButton();
});
