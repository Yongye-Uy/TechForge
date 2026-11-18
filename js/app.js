/**
 * TechForge - E-Commerce Mini App Logic
 * Handles Telegram WebApp integration, product rendering, cart state,
 * custom quantity management, and simulated auto-checkout.
 */

// Initialize Telegram WebApp API if available
const tg = window.Telegram?.WebApp;

// Helper: Check if truly running inside active Telegram client
function isInsideTelegram() {
  return Boolean(
    tg &&
    tg.initData &&
    tg.initData.length > 0 &&
    tg.platform &&
    tg.platform !== 'unknown'
  );
}

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

// Bootstrap Modal Instances
let cartModal;
let productDetailModal;
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

// Receipt Elements
const receiptOrderId = document.getElementById('receiptOrderId');
const receiptTimestamp = document.getElementById('receiptTimestamp');
const receiptItemsList = document.getElementById('receiptItemsList');
const receiptTotal = document.getElementById('receiptTotal');

// Toast Notification
const toastEl = document.getElementById('liveToast');
const toastMessage = document.getElementById('toastMessage');
const toastIcon = document.getElementById('toastIcon');

// ==========================================
// 1. Telegram WebApp Integration
// ==========================================
function initTelegramApp() {
  if (tg) {
    try {
      tg.ready();
      tg.expand();

      if (tg.setHeaderColor) tg.setHeaderColor('secondary_bg_color');
      if (tg.setBackgroundColor) tg.setBackgroundColor('bg_color');

      // Display Telegram user info if available
      const user = tg.initDataUnsafe?.user;
      if (user) {
        const userPill = document.getElementById('tg-user-pill');
        const usernameSpan = document.getElementById('tg-username');
        if (userPill && usernameSpan) {
          usernameSpan.textContent = user.username ? `@${user.username}` : (user.first_name || 'Telegram User');
          userPill.classList.remove('d-none');
          userPill.classList.add('d-flex');
        }
      }

      // Hook MainButton for checkout
      if (tg.MainButton) {
        tg.MainButton.onClick(() => {
          if (cart.length > 0) {
            if (cartModal) cartModal.hide();
            setTimeout(() => {
              executeAutoPurchase(cart, calculateCartTotal());
            }, 300);
          }
        });
      }
    } catch (err) {
      console.warn("Telegram WebApp initialization error:", err);
    }
  }
}

// Trigger haptic feedback safely
function triggerHaptic(type = 'impact', style = 'medium') {
  try {
    if (tg?.HapticFeedback) {
      if (type === 'impact') {
        tg.HapticFeedback.impactOccurred(style);
      } else if (type === 'notification') {
        tg.HapticFeedback.notificationOccurred(style);
      }
    }
  } catch (e) {
    // Silently ignore outside of Telegram
  }
}

// Display visual toast alert
function showToast(message, isSuccess = true) {
  if (!toastMessage || !toastIcon || !liveToast) return;
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
                  <button class="btn btn-primary btn-sm rounded-pill fw-semibold flex-grow-1 quick-buy-btn" data-id="${product.id}" title="Instant 1-Click Buy">
                    <i class="bi bi-lightning-charge-fill me-1"></i> Buy Now
                  </button>
                  <button class="btn btn-outline-secondary btn-sm rounded-pill quick-cart-btn px-3" data-id="${product.id}" title="Add 1 to Cart">
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

  // Direct 1-Click Buy from Card (Buys 1 item immediately)
  document.querySelectorAll('.quick-buy-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
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
        executeAutoPurchase(purchaseItems, product.price);
      }
    });
  });

  // Direct 1-Click Add to Cart from Card
  document.querySelectorAll('.quick-cart-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const id = parseInt(btn.getAttribute('data-id'));
      const product = PRODUCTS.find(p => p.id === id);
      if (product) {
        addToCart(product, 1);
      }
    });
  });
}

// ==========================================
// 3. Product Detail Modal & Custom Quantity
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

  // Specifications
  modalSpecsList.innerHTML = product.specs.map(spec => `
    <li>
      <i class="bi bi-check-circle-fill text-primary"></i>
      <span>${spec}</span>
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

// Quantity +/- Listeners
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

// Add To Cart from Detail Modal
modalAddToCartBtn.addEventListener('click', () => {
  if (!selectedProduct) return;
  const qty = parseInt(modalQuantityInput.value) || 1;
  addToCart(selectedProduct, qty);
  productDetailModal.hide();
});

// Instant Buy from Detail Modal (Allows any amount)
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

  // Hide detail modal then show receipt modal to avoid backdrop collision
  productDetailModal.hide();
  setTimeout(() => {
    executeAutoPurchase(purchaseItems, total);
  }, 350);
});

// ==========================================
// 4. Shopping Cart Management
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
          
          <!-- Quantity Control for any amount inside cart -->
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

  // Quantity handlers in cart
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

// Cart Checkout Button (Auto-purchase all items)
checkoutBtn.addEventListener('click', () => {
  if (cart.length === 0) return;
  const itemsToBuy = [...cart];
  const total = calculateCartTotal();

  cartModal.hide();
  setTimeout(() => {
    executeAutoPurchase(itemsToBuy, total);
  }, 350);
});

// Clear Cart Button
clearCartBtn.addEventListener('click', () => {
  if (confirm("Are you sure you want to clear your cart?")) {
    cart = [];
    saveCart();
    renderCart();
    showToast("Cart cleared");
  }
});

// ==========================================
// 5. Simulated Auto-Purchase Execution
// ==========================================
function executeAutoPurchase(items, totalAmount) {
  triggerHaptic('notification', 'success');

  // Generate Receipt Data
  const randomId = 'TF-' + Math.floor(100000 + Math.random() * 900000);
  const now = new Date();
  const timestampStr = now.toLocaleDateString() + ' ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  receiptOrderId.textContent = `#${randomId}`;
  receiptTimestamp.textContent = timestampStr;
  receiptTotal.textContent = `$${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  receiptItemsList.innerHTML = items.map(item => `
    <li class="d-flex justify-content-between align-items-center py-1 border-bottom">
      <span class="text-truncate me-2">
        <strong class="text-primary">${item.quantity}x</strong> ${item.name}
      </span>
      <span class="fw-bold text-nowrap">$${(item.price * item.quantity).toFixed(2)}</span>
    </li>
  `).join('');

  // Clear cart if items were purchased
  cart = [];
  saveCart();

  // GUARANTEED MODAL DISPLAY: Always show receipt modal directly
  receiptModal.show();

  // If inside genuine Telegram client, also trigger Telegram notification
  if (isInsideTelegram() && tg?.showAlert) {
    tg.showAlert(`🎉 Auto-Purchase Confirmed!\nOrder #${randomId}\nTotal: $${totalAmount.toFixed(2)}`);
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
// 7. App Initialization on DOM Ready
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  // Initialize Bootstrap Modals safely after DOM is loaded
  cartModal = new bootstrap.Modal(document.getElementById('cartModal'));
  productDetailModal = new bootstrap.Modal(document.getElementById('productDetailModal'));
  receiptModal = new bootstrap.Modal(document.getElementById('receiptModal'));
  liveToast = new bootstrap.Toast(document.getElementById('liveToast'), { delay: 3500 });

  // Re-render cart whenever cart modal opens
  document.getElementById('cartModal').addEventListener('show.bs.modal', renderCart);

  // Initialize Telegram
  initTelegramApp();

  // Initial Render
  renderProducts();
  updateCartBadge();
  updateTelegramMainButton();
});
