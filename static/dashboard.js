// Sync theme immediately to prevent flash
(function() {
    const savedTheme = localStorage.getItem('theme');
    const isSystemLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
    if (savedTheme === 'light' || (!savedTheme && isSystemLight)) {
        document.documentElement.classList.add('light-mode');
    } else {
        document.documentElement.classList.remove('light-mode');
    }
})();

document.addEventListener('DOMContentLoaded', () => {
    loadProducts();

    const addForm = document.getElementById('addProductForm');
    if (addForm) addForm.addEventListener('submit', handleAddProduct);

    initDashboardSidebar();
});

function initDashboardSidebar() {
    const openBtn = document.getElementById('openSidebarBtn');
    const closeBtn = document.getElementById('closeSidebarBtn');
    const sidebar = document.getElementById('dashboardSidebar');
    const overlay = document.getElementById('sidebarOverlay');

    const openMenu = () => {
        if(sidebar) sidebar.classList.add('active');
        if(overlay) overlay.classList.add('active');
    };

    const closeMenu = () => {
        if(sidebar) sidebar.classList.remove('active');
        if(overlay) overlay.classList.remove('active');
    };

    if (openBtn) openBtn.addEventListener('click', openMenu);
    if (closeBtn) closeBtn.addEventListener('click', closeMenu);
    if (overlay) overlay.addEventListener('click', closeMenu);
}

async function loadProducts() {
    const tbody = document.getElementById('productsTableBody');
    tbody.innerHTML = '<tr><td colspan="4">Loading...</td></tr>';
    
    try {
        const response = await fetch('/api/products');
        const products = await response.json();
        
        tbody.innerHTML = '';
        
        if (products.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-muted)">No products found.</td></tr>';
            return;
        }

        products.forEach(p => {
            const tr = document.createElement('tr');
            const imgPath = p.image.startsWith('http') ? p.image : '/' + p.image;
            
            tr.innerHTML = `
                <td><img src="${imgPath}" alt="${p.name}" class="prod-img-thumb"></td>
                <td>${p.name}</td>
                <td>$${p.price.toFixed(2)}</td>
                <td>
                    <button class="btn-danger" onclick="deleteProduct(${p.id})" title="Delete Product">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error(err);
        tbody.innerHTML = '<tr><td colspan="4" style="color: red;">Failed to load products.</td></tr>';
    }
}

async function handleAddProduct(e) {
    e.preventDefault();
    
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Adding...';

    const name = document.getElementById('productName').value;
    const price = document.getElementById('productPrice').value;
    const colorsObj = document.getElementById('productColors');
    const colors = colorsObj ? colorsObj.value : '';
    const fileInput = document.getElementById('productImageFile');
    const urlInput = document.getElementById('productImageUrl').value;
    
    const formData = new FormData();
    formData.append('name', name);
    formData.append('price', price);
    if (colors) formData.append('colors', colors);
    
    if (fileInput.files.length > 0) {
        formData.append('image', fileInput.files[0]);
    } else if (urlInput.trim() !== "") {
        formData.append('imageUrl', urlInput.trim());
    } else {
        showToast("Please provide an image file or URL", "error");
        resetBtn(submitBtn);
        return;
    }

    try {
        const response = await fetch('/api/products', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast("Product added successfully!");
            document.getElementById('addProductForm').reset();
            loadProducts(); // refresh table
        } else {
            showToast(data.error || "Failed to add product", "error");
        }
    } catch (err) {
        console.error(err);
        showToast("Network error occurred", "error");
    } finally {
        resetBtn(submitBtn);
    }
}

async function deleteProduct(id) {
    if (!confirm("Are you sure you want to delete this product?")) return;
    
    try {
        const response = await fetch(`/api/products/${id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showToast("Product deleted!");
            loadProducts();
        } else {
            const data = await response.json();
            showToast(data.error || "Failed to delete product", "error");
        }
    } catch (err) {
        console.error(err);
        showToast("Network error occurred", "error");
    }
}

function resetBtn(btn) {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-plus"></i> Add Product';
}

function showToast(message, type = "success") {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('fade-out');
        toast.addEventListener('animationend', () => toast.remove());
    }, 3000);
}
