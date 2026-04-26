document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const productId = params.get('id');

    if (!productId) {
        document.getElementById('productDetailContent').innerHTML = '<p>Product not found.</p>';
        return;
    }

    try {
        const res = await fetch(`/api/products/${productId}`);
        if (!res.ok) {
            document.getElementById('productDetailContent').innerHTML = '<p>Product not found.</p>';
            return;
        }

        const product = await res.json();
        renderProductDetails(product);

    } catch (e) {
        document.getElementById('productDetailContent').innerHTML = '<p>Error loading product.</p>';
    }
});

function renderProductDetails(product) {
    const imgPath = product.image.startsWith('http') ? product.image : '/' + product.image;
    
    const thumbs = [
        { src: imgPath, alt: 'Front View', style: '' },
        { src: imgPath, alt: 'Back View', style: 'transform: scaleX(-1);' },
        { src: imgPath, alt: 'Detailed View', style: 'transform: scale(1.2);' }
    ];

    document.getElementById('productTitle').textContent = product.name;
    document.getElementById('productPrice').textContent = "$" + product.price.toFixed(2);
    
    const galleryContainer = document.getElementById('productGalleryContainer');
    if (galleryContainer) {
        galleryContainer.innerHTML = '';
        thumbs.forEach((thumb) => {
            const container = document.createElement('div');
            container.className = 'stacked-image-container';
            const img = document.createElement('img');
            img.src = thumb.src;
            img.alt = thumb.alt;
            img.style.cssText = thumb.style;
            container.appendChild(img);
            galleryContainer.appendChild(container);
        });
    }

    // Handle Size Selection
    const sizeBtns = document.querySelectorAll('.size-selector .circle-btn');
    sizeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            sizeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // Handle Color Selection
    const colorSelector = document.querySelector('.color-selector');
    if (colorSelector) {
        colorSelector.innerHTML = '';
        const colorArray = product.colors ? product.colors.split(',').map(c => c.trim()) : ['WHITE', 'RED', 'BLUE'];
        
        colorArray.forEach((c, idx) => {
            if (!c) return;
            const btn = document.createElement('button');
            btn.className = 'pill-btn' + (idx === 0 ? ' active' : '');
            btn.textContent = c.toUpperCase();
            colorSelector.appendChild(btn);
        });

        const colorBtns = document.querySelectorAll('.color-selector .pill-btn');
        colorBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                colorBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
    }

    // Handle Quantity Selection
    let currentQty = 1;
    const qtyVal = document.querySelector('.qty-val');
    const qtyBtns = document.querySelectorAll('.qty-btn');
    if (qtyBtns.length >= 2) {
        qtyBtns[0].addEventListener('click', () => {
            if (currentQty > 1) {
                currentQty--;
                if (qtyVal) qtyVal.textContent = currentQty;
            }
        });
        qtyBtns[1].addEventListener('click', () => {
            currentQty++;
            if (qtyVal) qtyVal.textContent = currentQty;
        });
    }

    function getSelectedVariants() {
        const activeSize = document.querySelector('.size-selector .circle-btn.active');
        const activeColor = document.querySelector('.color-selector .pill-btn.active');
        return {
            size: activeSize ? activeSize.textContent.trim() : 'M',
            color: activeColor ? activeColor.textContent.trim() : 'WHITE',
            quantity: currentQty
        };
    }

    const addBtn = document.getElementById('addToCartOutline');
    if (addBtn) {
        addBtn.innerHTML = `Add to cart - $${product.price.toFixed(2)}`;
        addBtn.addEventListener('click', () => {
            const variants = getSelectedVariants();
            const cartProduct = { ...product, image: imgPath, cartId: Date.now(), ...variants };
            cartItems.push(cartProduct);
            if (typeof updateCartUI === 'function') updateCartUI();
            
            const cartModal = document.getElementById('cartModal');
            const cartOverlay = document.getElementById('cartOverlay');
            if(cartModal && cartOverlay) {
                cartModal.classList.add('active');
                cartOverlay.classList.add('active');
            }
        });
    }

    const buyBtn = document.querySelector('.btn-buy-now');
    if (buyBtn) {
        buyBtn.addEventListener('click', () => {
            const variants = getSelectedVariants();
            const cartProduct = { ...product, image: imgPath, cartId: Date.now(), ...variants };
            cartItems.push(cartProduct);
            if (typeof updateCartUI === 'function') updateCartUI();
            
            // Instantly open the payment modal
            const paymentModal = document.getElementById('paymentModal');
            const paymentOverlay = document.getElementById('paymentOverlay');
            if (paymentModal && paymentOverlay) {
                // Pre-calculate cart total
                let total = 0;
                cartItems.forEach(item => total += (item.price * (item.quantity || 1)));
                const payTotalAmount = document.getElementById('payTotalAmount');
                if (payTotalAmount) {
                    payTotalAmount.textContent = `($${total.toFixed(2)})`;
                }

                // If auth is strictly checked on submit, it's fine. We simply open modal.
                paymentModal.classList.add('active');
                paymentOverlay.classList.add('active');
            }
        });
    }
}
