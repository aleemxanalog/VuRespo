let products = [];
let currentUser = null;

// Sync theme with system or LocalStorage immediately to prevent flash
(function() {
    const savedTheme = localStorage.getItem('theme');
    const isSystemLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
    if (savedTheme === 'light' || (!savedTheme && isSystemLight)) {
        document.documentElement.classList.add('light-mode');
    } else {
        document.documentElement.classList.remove('light-mode');
    }
})();

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    initThemeToggle();
    initNavbar();
    renderProducts();
    initCart();
    initMobileMenu();
    initSearch();
    initAuth();
    initPayment();
    
    // Load saved cart from localStorage and refresh UI
    updateCartUI();

    // Non-blocking async check
    checkAuthStatus();
});

async function checkAuthStatus() {
    try {
        const res = await fetch('/api/me');
        if (res.ok) {
            const data = await res.json();
            currentUser = data.user;
        }
    } catch { }
    updateUserUI();
}

function updateUserUI() {
    const userOpenBtns = document.querySelectorAll('#userOpenBtn, #mobileUserOpenBtn');
    
    // Explicit Admin Dashboard link
    let adminBtn = document.getElementById('adminNavBtn');
    let mAdminBtn = document.getElementById('mobileAdminNavBtn');
    
    if (currentUser && currentUser.is_admin) {
        if (!adminBtn) {
            const navLinks = document.querySelector('.nav-links');
            if (navLinks) {
                const li = document.createElement('li');
                li.id = 'adminNavBtn';
                li.innerHTML = '<a href="/dashboard.html" style="color:red; font-weight: bold;"><i class="fa-solid fa-gauge"></i> Dashboard</a>';
                navLinks.appendChild(li);
            }
        }
        if (!mAdminBtn) {
            const mobileNavLinks = document.querySelector('.mobile-nav-links');
            if (mobileNavLinks) {
                const mLi = document.createElement('li');
                mLi.id = 'mobileAdminNavBtn';
                mLi.innerHTML = '<a href="/dashboard.html" class="mobile-link" style="color:red; font-weight: bold;"><i class="fa-solid fa-gauge"></i> Dashboard</a>';
                mobileNavLinks.appendChild(mLi);
            }
        }
    } else {
        if (adminBtn) adminBtn.remove();
        if (mAdminBtn) mAdminBtn.remove();
    }

    userOpenBtns.forEach(btn => {
        if (currentUser) {
            btn.classList.replace('fa-regular', 'fa-solid');
            btn.title = `Logout (${currentUser.name})`;
        } else {
            btn.classList.replace('fa-solid', 'fa-regular');
            btn.title = "Account";
        }
    });
}

// Theme Toggle
function initThemeToggle() {
    const themeToggles = document.querySelectorAll('#themeToggle, #mobileThemeToggle');
    const docEl = document.documentElement;

    const syncIcons = () => {
        if (docEl.classList.contains('light-mode')) {
            themeToggles.forEach(t => t.classList.replace('fa-moon', 'fa-sun'));
        } else {
            themeToggles.forEach(t => t.classList.replace('fa-sun', 'fa-moon'));
        }
    };
    
    syncIcons();

    window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
        if (!localStorage.getItem('theme')) {
            if(e.matches) docEl.classList.add('light-mode');
            else docEl.classList.remove('light-mode');
            syncIcons();
        }
    });

    themeToggles.forEach(themeToggle => {
        themeToggle.addEventListener('click', () => {
            docEl.classList.toggle('light-mode');
            const isLight = docEl.classList.contains('light-mode');
            localStorage.setItem('theme', isLight ? 'light' : 'dark');
            syncIcons();
        });
    });
}

// Navbar Scroll Effect
function initNavbar() {
    const navbar = document.getElementById('navbar');

    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
}

// Render Products
async function renderProducts() {
    const grid = document.getElementById('productGrid');
    if (!grid) return;

    try {
        const response = await fetch('/api/products');
        products = await response.json();

        const urlParams = new URLSearchParams(window.location.search);
        const searchQuery = urlParams.get('search');
        
        if (searchQuery) {
            const input = document.getElementById('searchInput');
            if (input) input.value = searchQuery;
            displayProducts(products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())));
        } else {
            displayProducts(products);
        }
    } catch (err) {
        console.error("Failed to load products:", err);
        grid.innerHTML = '<p>Error loading products.</p>';
    }
}

function displayProducts(productsToRender) {
    const grid = document.getElementById('productGrid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    if (productsToRender.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align:center;">No products match your search.</p>';
        return;
    }

    productsToRender.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.setAttribute('data-id', product.id);

        const imgPath = product.image.startsWith('http') ? product.image : '/' + product.image;

        card.innerHTML = `
            <div class="product-image-container">
                <img src="${imgPath}" alt="${product.name}" class="product-image">
                <div class="add-to-cart-overlay" data-id="${product.id}">
                    Add to Cart
                </div>
            </div>
            <div class="product-info">
                <h3 class="product-name">${product.name}</h3>
                <p class="product-price">$${product.price.toFixed(2)}</p>
            </div>
        `;
        grid.appendChild(card);
    });
}

// Cart State & Interaction
// Load cart from localStorage on startup
let cartItems = JSON.parse(localStorage.getItem('westrowear_cart') || '[]');

function initCart() {
    const cartOpenBtns = document.querySelectorAll('#cartOpenBtn, #mobileCartOpenBtn');
    const cartModal = document.getElementById('cartModal');
    const cartOverlay = document.getElementById('cartOverlay');
    const closeCart = document.getElementById('closeCart');
    const grid = document.getElementById('productGrid');

    // Open cart
    cartOpenBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            cartModal.classList.add('active');
            cartOverlay.classList.add('active');
        });
    });

    // Close cart
    const closeMenu = () => {
        cartModal.classList.remove('active');
        cartOverlay.classList.remove('active');
    };
    closeCart.addEventListener('click', closeMenu);
    cartOverlay.addEventListener('click', closeMenu);

    // Add to Cart from grid or redirect to product page
    grid.addEventListener('click', (e) => {
        if (e.target.classList.contains('add-to-cart-overlay')) {
            const productId = parseInt(e.target.getAttribute('data-id'));
            const product = products.find(p => p.id === productId);

            if (product) {
                // Determine absolute path same as rendering
                const imgPath = product.image.startsWith('http') ? product.image : '/' + product.image;
                const cartProduct = { ...product, image: imgPath, cartId: Date.now() };

                cartItems.push(cartProduct);
                updateCartUI();

                // Animate Cart Icons
                const cartCountElements = document.querySelectorAll('.cart-count');
                cartCountElements.forEach(el => {
                    el.style.transform = 'scale(1.5)';
                    setTimeout(() => {
                        el.style.transform = 'scale(1)';
                    }, 200);
                });

                // Auto-open cart
                cartModal.classList.add('active');
                cartOverlay.classList.add('active');
            }
        } else {
            const card = e.target.closest('.product-card');
            if (card) {
                const productId = card.getAttribute('data-id');
                window.location.href = `/product.html?id=${productId}`;
            }
        }
    });

    // Remove from Cart
    const cartContainer = document.getElementById('cartItemsContainer');
    cartContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-item') || e.target.closest('.remove-item')) {
            const target = e.target.classList.contains('remove-item') ? e.target : e.target.closest('.remove-item');
            const cartId = parseInt(target.getAttribute('data-cartid'));
            cartItems = cartItems.filter(item => item.cartId !== cartId);
            updateCartUI();
        }
    });

    // Checkout Process (Open Payment Modal)
    const checkoutBtn = document.querySelector('.checkout-btn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', () => {
            if (cartItems.length === 0) {
                showToast("Your cart is empty!");
                return;
            }

            if (!currentUser) {
                showToast("Please login or create an account to checkout.", "error");
                closeMenu();
                document.getElementById('userOpenBtn').click();
                return;
            }

            // Calculate total and set it in the payment modal button
            let total = 0;
            cartItems.forEach(item => total += (item.price * (item.quantity || 1)));
            document.getElementById('payTotalAmount').textContent = `($${total.toFixed(2)})`;

            closeMenu(); // Close cart

            // Open payment modal
            document.getElementById('paymentModal').classList.add('active');
            document.getElementById('paymentOverlay').classList.add('active');
        });
    }
}

function saveCart() {
    localStorage.setItem('westrowear_cart', JSON.stringify(cartItems));
}

function updateCartUI() {
    const cartContainer = document.getElementById('cartItemsContainer');
    const cartCountElements = document.querySelectorAll('.cart-count');
    const cartTotalValue = document.getElementById('cartTotalValue');

    // Save to localStorage on every update
    saveCart();

    cartCountElements.forEach(el => el.textContent = cartItems.length);

    if (cartItems.length === 0) {
        cartContainer.innerHTML = '<div class="empty-cart-msg">Your cart is empty.</div>';
        if (cartTotalValue) cartTotalValue.textContent = '$0.00';
        return;
    }

    cartContainer.innerHTML = '';
    let total = 0;

    cartItems.forEach(item => {
        const qty = item.quantity || 1;
        total += (item.price * qty);
        const variantText = item.size && item.color ? `<div style="font-size:0.8rem;color:var(--text-secondary);margin-top:2px;">${item.color} | Size: ${item.size} | Qty: ${qty}</div>` : '';

        const div = document.createElement('div');
        div.className = 'cart-item';
        div.innerHTML = `
            <img src="${item.image}" alt="${item.name}" class="cart-item-img">
            <div class="cart-item-info">
                <div class="cart-item-title">${item.name}</div>
                <div class="cart-item-price">$${item.price.toFixed(2)}</div>
                ${variantText}
            </div>
            <i class="fa-solid fa-trash remove-item" data-cartid="${item.cartId}" style="cursor:pointer;" title="Remove Item"></i>
        `;
        cartContainer.appendChild(div);
    });

    if (cartTotalValue) cartTotalValue.textContent = '$' + total.toFixed(2);
}

// Mobile Menu
function initMobileMenu() {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const mobileMenu = document.getElementById('mobileMenu');
    const mobileMenuOverlay = document.getElementById('mobileMenuOverlay');
    const closeMobileMenu = document.getElementById('closeMobileMenu');
    const mobileLinks = document.querySelectorAll('.mobile-link');

    const openMenu = () => {
        mobileMenu.classList.add('active');
        mobileMenuOverlay.classList.add('active');
    };

    const closeMenu = () => {
        mobileMenu.classList.remove('active');
        mobileMenuOverlay.classList.remove('active');
    };

    if (mobileMenuBtn) mobileMenuBtn.addEventListener('click', openMenu);
    if (closeMobileMenu) closeMobileMenu.addEventListener('click', closeMenu);
    if (mobileMenuOverlay) mobileMenuOverlay.addEventListener('click', closeMenu);

    mobileLinks.forEach(link => {
        link.addEventListener('click', closeMenu);
    });
}

// Search Overlay
function initSearch() {
    const searchOpenBtns = document.querySelectorAll('#searchOpenBtn, #mobileSearchOpenBtn');
    const searchOverlay = document.getElementById('searchOverlay');
    const closeSearch = document.getElementById('closeSearch');

    const searchInput = document.getElementById('searchInput');

    const openSearch = () => {
        searchOverlay.classList.add('active');
        setTimeout(() => searchInput && searchInput.focus(), 100);

        // Close mobile menu if open
        const mobileMenu = document.getElementById('mobileMenu');
        const mobileMenuOverlay = document.getElementById('mobileMenuOverlay');
        if (mobileMenu) mobileMenu.classList.remove('active');
        if (mobileMenuOverlay) mobileMenuOverlay.classList.remove('active');
    };

    const closeSearchOverlay = () => {
        searchOverlay.classList.remove('active');
    };

    // Live search and redirection
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const val = e.target.value.toLowerCase();
            if (!window.location.pathname.includes('product.html') && !window.location.pathname.includes('dashboard.html')) {
                displayProducts(products.filter(p => p.name.toLowerCase().includes(val)));
            }
        });
        
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const val = e.target.value;
                if (window.location.pathname.includes('product.html') || window.location.pathname.includes('dashboard.html')) {
                    window.location.href = `/?search=${encodeURIComponent(val)}#featured`;
                } else {
                    closeSearchOverlay();
                    window.location.hash = '#featured';
                }
            }
        });
    }

    searchOpenBtns.forEach(btn => btn.addEventListener('click', openSearch));
    if (closeSearch) closeSearch.addEventListener('click', closeSearchOverlay);
}

// Auth Modal
function initAuth() {
    const userOpenBtns = document.querySelectorAll('#userOpenBtn, #mobileUserOpenBtn');
    const authModal = document.getElementById('authModal');
    const authOverlay = document.getElementById('authOverlay');
    const closeAuth = document.getElementById('closeAuth');

    const loginTab = document.getElementById('loginTab');
    const registerTab = document.getElementById('registerTab');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    const openAuth = async () => {
        // If logged in, clicking the user button logs out or goes to admin
        if (currentUser) {
            if (currentUser.is_admin) {
                const choice = confirm("You are an Admin. Go to Dashboard? (Cancel to Logout instead)");
                if (choice) {
                    window.location.href = '/dashboard.html';
                    return;
                }
            } else {
                if (!confirm("Do you want to logout?")) return;
            }

            await fetch('/api/logout', { method: 'POST' });
            currentUser = null;
            updateUserUI();
            showToast("Logged out successfully.");
            return;
        }

        authModal.classList.add('active');
        authOverlay.classList.add('active');

        // Close mobile menu if open
        const mobileMenu = document.getElementById('mobileMenu');
        const mobileMenuOverlay = document.getElementById('mobileMenuOverlay');
        if (mobileMenu) mobileMenu.classList.remove('active');
        if (mobileMenuOverlay) mobileMenuOverlay.classList.remove('active');
    };

    const closeAuthModal = () => {
        authModal.classList.remove('active');
        authOverlay.classList.remove('active');
    };

    userOpenBtns.forEach(btn => btn.addEventListener('click', openAuth));
    if (closeAuth) closeAuth.addEventListener('click', closeAuthModal);
    if (authOverlay) authOverlay.addEventListener('click', closeAuthModal);

    // Tab Switching
    loginTab.addEventListener('click', () => {
        loginTab.classList.add('active');
        registerTab.classList.remove('active');
        loginForm.classList.add('active');
        registerForm.classList.remove('active');
    });

    registerTab.addEventListener('click', () => {
        registerTab.classList.add('active');
        loginTab.classList.remove('active');
        registerForm.classList.add('active');
        loginForm.classList.remove('active');
    });

    // Login Submission
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const submitBtn = loginForm.querySelector('button');
        submitBtn.disabled = true;

        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();

            if (res.ok) {
                currentUser = data.user;
                updateUserUI();
                showToast("Logged in successfully!");
                closeAuthModal();
                loginForm.reset();

                if (currentUser.is_admin) {
                    window.location.href = '/dashboard.html';
                }
            } else {
                showToast(data.error || "Login failed", "error");
            }
        } catch (err) {
            showToast("Network error", "error");
        } finally {
            submitBtn.disabled = false;
        }
    });

    // Register Submission
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('registerName').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const submitBtn = registerForm.querySelector('button');
        submitBtn.disabled = true;

        try {
            const res = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password })
            });
            const data = await res.json();

            if (res.ok) {
                currentUser = data.user;
                updateUserUI();
                showToast("Account created successfully!");
                closeAuthModal();
                registerForm.reset();
            } else {
                showToast(data.error || "Registration failed", "error");
            }
        } catch (err) {
            showToast("Network error", "error");
        } finally {
            submitBtn.disabled = false;
        }
    });
}

// Payment Modal logic
function initPayment() {
    const paymentModal = document.getElementById('paymentModal');
    const paymentOverlay = document.getElementById('paymentOverlay');
    const closePayment = document.getElementById('closePayment');
    const paymentForm = document.getElementById('paymentForm');
    const payNowBtn = document.getElementById('payNowBtn');

    const closePaymentModal = () => {
        paymentModal.classList.remove('active');
        paymentOverlay.classList.remove('active');
    };

    if (closePayment) closePayment.addEventListener('click', closePaymentModal);
    if (paymentOverlay) paymentOverlay.addEventListener('click', closePaymentModal);

    // Form formatting for card input
    const cardNumberInput = document.getElementById('cardNumber');
    if (cardNumberInput) {
        cardNumberInput.addEventListener('input', function (e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 16) value = value.slice(0, 16);
            let formattedValue = '';
            for (let i = 0; i < value.length; i++) {
                if (i > 0 && i % 4 === 0) {
                    formattedValue += ' ';
                }
                formattedValue += value[i];
            }
            e.target.value = formattedValue;
        });
    }

    const cardExpiryInput = document.getElementById('cardExpiry');
    if (cardExpiryInput) {
        cardExpiryInput.addEventListener('input', function (e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 4) value = value.slice(0, 4);
            if (value.length > 2) {
                value = value.slice(0, 2) + '/' + value.slice(2);
            }
            e.target.value = value;
        });
    }

    // Handle payment submission
    if (paymentForm) {
        paymentForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (!currentUser) {
                showToast("Session expired. Please log in again.", "error");
                return;
            }

            const originalBtnText = payNowBtn.innerHTML;
            payNowBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';
            payNowBtn.disabled = true;

            const name = document.getElementById('shipName').value;
            const address = document.getElementById('shipAddress').value;
            const city = document.getElementById('shipCity').value;
            const zip = document.getElementById('shipZip').value;

            let total = 0;
            cartItems.forEach(item => total += (item.price * (item.quantity || 1)));

            try {
                const res = await fetch('/api/checkout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, address, city, zip, total })
                });

                if (res.ok) {
                    cartItems = [];
                    saveCart();
                    updateCartUI();
                    closePaymentModal();
                    showToast("Purchase successful! Order recorded in database.");
                    paymentForm.reset();
                } else {
                    const data = await res.json();
                    showToast(data.error || "Checkout failed", "error");
                }
            } catch (err) {
                showToast("Network error", "error");
            } finally {
                payNowBtn.innerHTML = originalBtnText;
                payNowBtn.disabled = false;
            }
        });
    }
}

// Toast Notifications
function showToast(message, type = "success") {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) return;

    // Optional: could color differently if type === "error" by assigning CSS class
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    if (type === 'error') {
        toast.style.backgroundColor = '#ff4757';
        toast.style.color = '#fff';
    }

    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('fade-out');
        toast.addEventListener('animationend', () => {
            toast.remove();
        });
    }, 3000);
}
