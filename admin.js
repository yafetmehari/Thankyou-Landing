/**
 * thank you brand. - Admin Controller Script
 * Handles authentication checks, CRUD requests to Express REST API,
 * dynamic select rendering, and notification displays.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const authOverlay = document.getElementById('auth-overlay');
  const loginForm = document.getElementById('admin-login-form');
  const loginErrorMsg = document.getElementById('login-error-msg');
  const logoutBtn = document.getElementById('admin-logout-btn');

  const tabsListContainer = document.getElementById('admin-tabs-list');
  const addTabBtn = document.getElementById('add-tab-btn');
  const tabModalOverlay = document.getElementById('tab-modal-overlay');
  const tabModalClose = document.getElementById('tab-modal-close');
  const tabForm = document.getElementById('tab-form');
  const tabNameInput = document.getElementById('tab-name-input');
  const tabIdInput = document.getElementById('tab-id-input');
  const tabOriginalId = document.getElementById('tab-original-id');
  const tabModalTitle = document.getElementById('tab-modal-title');

  const productsContainer = document.getElementById('admin-products-list');
  const addProdBtn = document.getElementById('add-prod-btn');
  const productModalOverlay = document.getElementById('product-modal-overlay');
  const productModalClose = document.getElementById('product-modal-close');
  const productForm = document.getElementById('product-form');
  const productCategorySelect = document.getElementById('prod-category-select');
  
  // Product Form Inputs
  const productIdInput = document.getElementById('product-id-input');
  const prodNameInput = document.getElementById('prod-name-input');
  const prodPriceInput = document.getElementById('prod-price-input');
  const prodTagInput = document.getElementById('prod-tag-input');
  const prodImageInput = document.getElementById('prod-image-input');
  const prodDescInput = document.getElementById('prod-desc-input');
  const productModalTitle = document.getElementById('product-modal-title');
  const contactEmailInput = document.getElementById('contact-email-input');
  const saveContactEmailBtn = document.getElementById('save-contact-email-btn');
  const forgotPasswordLink = document.getElementById('forgot-password-link');
  const resetLoginBtn = document.getElementById('reset-login-btn');
  const adminUsernameInput = document.getElementById('admin-username-input');
  const adminEmailInput = document.getElementById('admin-email-input');
  const adminPasswordInput = document.getElementById('admin-password-input');
  const adminConfirmPasswordInput = document.getElementById('admin-confirm-password-input');
  const saveAdminAccountBtn = document.getElementById('save-admin-account-btn');
  const admin2faCodeInput = document.getElementById('admin-2fa-code');
  const twoFactorStatus = document.getElementById('two-factor-status');
  const generate2faBtn = document.getElementById('generate-2fa-btn');
  const disable2faBtn = document.getElementById('disable-2fa-btn');
  const twoFactorSetupPanel = document.getElementById('two-factor-setup-panel');
  const twoFactorQRCode = document.getElementById('two-factor-qr');
  const twoFactorSecretText = document.getElementById('two-factor-secret');
  const twoFactorVerifyCode = document.getElementById('two-factor-verify-code');
  const verify2faBtn = document.getElementById('verify-2fa-btn');
  const twoFactorSetupMsg = document.getElementById('two-factor-setup-msg');

  // Application Data Cache
  let serverData = { tabs: [], products: [], admin: { username: 'admin', email: 'admin@gmail.com', twoFactorEnabled: false }, settings: { contactEmail: '' } };
  let pendingLogin = null;

  // ==========================================================================
  // AUTHENTICATION LOGIC
  // ==========================================================================
  function checkAuth() {
    const isAuthed = sessionStorage.getItem('tyb_admin_authenticated') === 'true';
    if (isAuthed) {
      authOverlay.classList.add('hidden');
      fetchDashboardData();
    } else {
      authOverlay.classList.remove('hidden');
    }
  }

  // Handle Login Submission
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      loginErrorMsg.style.display = 'none';

      const username = document.getElementById('admin-username').value.trim();
      const password = document.getElementById('admin-password').value;
      const code = admin2faCodeInput?.value.trim();

      const payload = { username, password };
      if (code) payload.code = code;
      if (pendingLogin && code) {
        payload.username = pendingLogin.username;
        payload.password = pendingLogin.password;
      }

      try {
        const response = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (result.twoFactorRequired) {
          pendingLogin = { username, password };
          toggleLogin2FAStage(true);
          loginErrorMsg.textContent = result.message || 'Please enter your authenticator code.';
          loginErrorMsg.style.display = 'block';
          return;
        }

        if (response.ok && result.success) {
          sessionStorage.setItem('tyb_admin_authenticated', 'true');
          showToast('Welcome to the admin console.', 'info');
          loginForm.reset();
          resetLoginStage();
          checkAuth();
        } else {
          loginErrorMsg.textContent = result.message || 'Incorrect credentials.';
          loginErrorMsg.style.display = 'block';
        }
      } catch (err) {
        console.error('Login error:', err);
        loginErrorMsg.textContent = 'Network error. Make sure your server is running.';
        loginErrorMsg.style.display = 'block';
      }
    });
  }

  // Handle Logout Click
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      sessionStorage.removeItem('tyb_admin_authenticated');
      showToast('Logged out successfully.', 'info');
      checkAuth();
    });
  }

  // Check auth state immediately
  checkAuth();

  // ==========================================================================
  // DATA FETCHING & RENDERING
  // ==========================================================================
  async function fetchDashboardData() {
    try {
      const response = await fetch('/api/data');
      if (!response.ok) throw new Error('Failed to retrieve catalog data');
      
      serverData = await response.json();
      renderTabs();
      renderProductsList();
      populateCategoryDropdown();
      renderContactEmailSetting();
      renderAdminAccountSettings();
      
      if (typeof lucide !== 'undefined') {
        lucide.createIcons();
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      showToast('Error connecting to local database.', 'error');
    }
  }

  // Render Category Tabs List
  function renderTabs() {
    if (!tabsListContainer) return;
    tabsListContainer.innerHTML = '';

    serverData.tabs.forEach(tab => {
      const isSystemTab = tab.id === 'all';
      const tabEl = document.createElement('div');
      tabEl.className = 'admin-tab-item';
      tabEl.innerHTML = `
        <div class="admin-tab-details">
          <span class="tab-name">${tab.name}</span>
          <span class="admin-tab-id">/${tab.id}</span>
        </div>
        <div class="tab-actions">
          <button class="tab-action-btn edit-tab-trigger" data-id="${tab.id}" data-name="${tab.name}" title="Edit Tab">
            <i data-lucide="edit-3" style="width: 14px; height: 14px;"></i>
          </button>
          ${!isSystemTab ? `
            <button class="tab-action-btn delete delete-tab-trigger" data-id="${tab.id}" title="Delete Tab">
              <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
            </button>
          ` : ''}
        </div>
      `;
      tabsListContainer.appendChild(tabEl);
    });

    // Bind Edit triggers
    tabsListContainer.querySelectorAll('.edit-tab-trigger').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const name = btn.getAttribute('data-name');
        openTabModal(id, name);
      });
    });

    // Bind Delete triggers
    tabsListContainer.querySelectorAll('.delete-tab-trigger').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        deleteTab(id);
      });
    });
  }

  // Render Product Catalog Table
  function renderProductsList() {
    if (!productsContainer) return;
    productsContainer.innerHTML = '';

    if (serverData.products.length === 0) {
      productsContainer.innerHTML = `
        <tr>
          <td colspan="4" style="text-align: center; color: var(--color-charcoal-light); padding: 2rem;">
            No products found in database. Click "Add Product" to create one.
          </td>
        </tr>
      `;
      return;
    }

    serverData.products.forEach(prod => {
      const catObj = serverData.tabs.find(t => t.id === prod.category);
      const categoryLabel = catObj ? catObj.name : prod.category;

      const row = document.createElement('tr');
      row.innerHTML = `
        <td>
          <div class="product-row-info">
            <img src="${prod.image}" alt="${prod.title}" class="prod-thumb">
            <div>
              <div class="prod-title">${prod.title}</div>
              <div style="font-size: 0.75rem; color: var(--color-charcoal-light); max-width: 320px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">
                ${prod.desc}
              </div>
            </div>
          </div>
        </td>
        <td>
          <span class="prod-category-badge">${categoryLabel}</span>
        </td>
        <td>
          <strong>$${prod.price.toFixed(2)}</strong>
        </td>
        <td style="text-align: right; white-space: nowrap;">
          <button class="btn btn-secondary edit-prod-trigger" data-id="${prod.id}" style="padding: 0.4rem 0.8rem; font-size: 0.75rem; margin-right: 0.25rem;">
            <i data-lucide="edit" style="width: 12px; height: 12px; display: inline; vertical-align: middle; margin-right: 2px;"></i> Edit
          </button>
          <button class="btn btn-primary delete-prod-trigger" data-id="${prod.id}" style="padding: 0.4rem 0.8rem; font-size: 0.75rem; background-color: var(--color-error); border-color: var(--color-error);">
            <i data-lucide="trash-2" style="width: 12px; height: 12px; display: inline; vertical-align: middle; margin-right: 2px;"></i> Delete
          </button>
        </td>
      `;
      productsContainer.appendChild(row);
    });

    // Bind Edit triggers
    productsContainer.querySelectorAll('.edit-prod-trigger').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.getAttribute('data-id'));
        openProductModal(id);
      });
    });

    // Bind Delete triggers
    productsContainer.querySelectorAll('.delete-prod-trigger').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.getAttribute('data-id'));
        deleteProduct(id);
      });
    });
  }

  // Populate Categories/Tabs dropdown selections
  function populateCategoryDropdown() {
    if (!productCategorySelect) return;
    productCategorySelect.innerHTML = '';
    
    // Skip the "all" filter tab option for product categories
    const categories = serverData.tabs.filter(t => t.id !== 'all');
    
    categories.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat.id;
      opt.textContent = cat.name;
      productCategorySelect.appendChild(opt);
    });
  }

  function renderContactEmailSetting() {
    if (!contactEmailInput) return;
    contactEmailInput.value = serverData.settings?.contactEmail || '';
  }

  function updateTwoFactorUI() {
    const enabled = !!serverData.admin?.twoFactorEnabled;
    if (twoFactorStatus) {
      twoFactorStatus.textContent = enabled ? '2FA is currently enabled.' : '2FA is currently disabled.';
    }
    if (generate2faBtn) {
      generate2faBtn.style.display = enabled ? 'none' : 'inline-flex';
    }
    if (disable2faBtn) {
      disable2faBtn.style.display = enabled ? 'inline-flex' : 'none';
    }
    if (twoFactorSetupPanel) {
      twoFactorSetupPanel.style.display = 'none';
    }
    if (twoFactorSetupMsg) {
      twoFactorSetupMsg.textContent = '';
    }
    if (twoFactorQRCode) {
      twoFactorQRCode.src = '';
    }
    if (twoFactorSecretText) {
      twoFactorSecretText.textContent = 'Secret will appear here.';
    }
    if (twoFactorVerifyCode) {
      twoFactorVerifyCode.value = '';
    }
  }

  function renderAdminAccountSettings() {
    if (!adminUsernameInput || !adminEmailInput) return;
    adminUsernameInput.value = serverData.admin?.username || '';
    adminEmailInput.value = serverData.admin?.email || '';
    adminPasswordInput.value = '';
    adminConfirmPasswordInput.value = '';
    updateTwoFactorUI();
  }

  function toggleLogin2FAStage(show) {
    const stage = document.getElementById('login-2fa-stage');
    if (stage) {
      stage.style.display = show ? 'block' : 'none';
    }
    if (!show && admin2faCodeInput) {
      admin2faCodeInput.value = '';
    }
  }

  function resetLoginStage() {
    pendingLogin = null;
    toggleLogin2FAStage(false);
    if (loginErrorMsg) {
      loginErrorMsg.textContent = '';
      loginErrorMsg.style.display = 'none';
    }
  }

  // ==========================================================================
  // TAB/CATEGORY MUTATION FLOW
  // ==========================================================================
  function openTabModal(id = '', name = '') {
    tabOriginalId.value = id;
    if (id) {
      tabModalTitle.textContent = 'Edit Collection Tab';
      tabNameInput.value = name;
      tabIdInput.value = id;
      // Prevent editing the system URL slug for stability
      tabIdInput.disabled = (id === 'all');
    } else {
      tabModalTitle.textContent = 'Add Collection Tab';
      tabNameInput.value = '';
      tabIdInput.value = '';
      tabIdInput.disabled = false;
    }
    tabModalOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeTabModal() {
    tabModalOverlay.classList.remove('open');
    document.body.style.overflow = '';
    tabForm.reset();
  }

  if (addTabBtn) addTabBtn.addEventListener('click', () => openTabModal());
  if (tabModalClose) tabModalClose.addEventListener('click', closeTabModal);
  if (tabModalOverlay) {
    tabModalOverlay.addEventListener('click', (e) => {
      if (e.target === tabModalOverlay) closeTabModal();
    });
  }

  // Save/Submit Tab Updates
  if (tabForm) {
    tabForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const slug = tabIdInput.value.trim().toLowerCase();
      const labelName = tabNameInput.value.trim();
      const originalId = tabOriginalId.value;

      let updatedTabs = [...serverData.tabs];

      if (originalId) {
        // Edit category
        const index = updatedTabs.findIndex(t => t.id === originalId);
        if (index > -1) {
          updatedTabs[index] = { id: originalId === 'all' ? 'all' : slug, name: labelName };
          
          // Cascading category update for products assigned to the old slug
          if (originalId !== slug && originalId !== 'all') {
            serverData.products.forEach(p => {
              if (p.category === originalId) p.category = slug;
            });
            // Update products database as well
            await saveAllProductsCascaded();
          }
        }
      } else {
        // Add new category check for duplicates
        if (updatedTabs.find(t => t.id === slug)) {
          showToast('A category with that ID already exists.', 'error');
          return;
        }
        updatedTabs.push({ id: slug, name: labelName });
      }

      try {
        const response = await fetch('/api/tabs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tabs: updatedTabs })
        });

        const result = await response.json();

        if (response.ok && result.success) {
          showToast('Category tabs updated successfully.', 'info');
          closeTabModal();
          fetchDashboardData();
        } else {
          showToast(result.message || 'Error updating categories.', 'error');
        }
      } catch (err) {
        console.error(err);
        showToast('Server update failed.', 'error');
      }
    });
  }

  // Delete Tab Handler
  async function deleteTab(id) {
    if (id === 'all') return;
    
    // Check if products are currently assigned to this tab
    const productsInTab = serverData.products.filter(p => p.category === id);
    let confirmMsg = `Are you sure you want to delete the category tab "/${id}"?`;
    
    if (productsInTab.length > 0) {
      confirmMsg += `\nWarning: ${productsInTab.length} product(s) are currently assigned here. They will be reset to "apparel" to prevent display issues.`;
    }

    if (!confirm(confirmMsg)) return;

    // Filter categories
    const updatedTabs = serverData.tabs.filter(t => t.id !== id);

    // Update product categories
    if (productsInTab.length > 0) {
      serverData.products.forEach(p => {
        if (p.category === id) p.category = 'apparel';
      });
      await saveAllProductsCascaded();
    }

    try {
      const response = await fetch('/api/tabs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tabs: updatedTabs })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        showToast('Category deleted successfully.', 'info');
        fetchDashboardData();
      } else {
        showToast('Error deleting category.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Network error during category deletion.', 'error');
    }
  }

  // Helper utility for cascading updates
  async function saveAllProductsCascaded() {
    for (let product of serverData.products) {
      await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(product)
      });
    }
  }

  // ==========================================================================
  // PRODUCT MUTATION FLOW (CRUD)
  // ==========================================================================
  function openProductModal(id = 0) {
    if (id) {
      productModalTitle.textContent = 'Edit Product Details';
      const prod = serverData.products.find(p => p.id === id);
      if (prod) {
        productIdInput.value = prod.id;
        prodNameInput.value = prod.title;
        productCategorySelect.value = prod.category;
        prodPriceInput.value = prod.price;
        prodTagInput.value = prod.tag;
        prodImageInput.value = prod.image;
        prodDescInput.value = prod.desc;
      }
    } else {
      productModalTitle.textContent = 'Add Product Details';
      productIdInput.value = '';
      prodNameInput.value = '';
      if (productCategorySelect.options.length > 0) {
        productCategorySelect.selectedIndex = 0;
      }
      prodPriceInput.value = '';
      prodTagInput.value = '';
      prodImageInput.value = 'assets/hero_lifestyle.png';
      prodDescInput.value = '';
    }
    
    productModalOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeProductModal() {
    productModalOverlay.classList.remove('open');
    document.body.style.overflow = '';
    productForm.reset();
  }

  if (addProdBtn) addProdBtn.addEventListener('click', () => openProductModal());
  if (productModalClose) productModalClose.addEventListener('click', closeProductModal);
  if (productModalOverlay) {
    productModalOverlay.addEventListener('click', (e) => {
      if (e.target === productModalOverlay) closeProductModal();
    });
  }

  if (saveAdminAccountBtn) {
    saveAdminAccountBtn.addEventListener('click', async () => {
      const username = adminUsernameInput.value.trim();
      const email = adminEmailInput.value.trim();
      const password = adminPasswordInput.value;
      const confirmPassword = adminConfirmPasswordInput.value;

      if (!username || !email) {
        showToast('Admin username and email are required.', 'error');
        return;
      }

      if (password && password !== confirmPassword) {
        showToast('New password and confirmation do not match.', 'error');
        return;
      }

      try {
        const response = await fetch('/api/admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ admin: { username, email, password } })
        });

        const result = await response.json();
        if (response.ok && result.success) {
          serverData.admin = { username, email };
          renderAdminAccountSettings();
          showToast('Admin account updated successfully.', 'info');
        } else {
          showToast(result.message || 'Unable to save admin account.', 'error');
        }
      } catch (err) {
        console.error('Admin save error:', err);
        showToast('Network error while saving admin account.', 'error');
      }
    });
  }

  if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', async (event) => {
      event.preventDefault();
      try {
        const response = await fetch('/api/admin/reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });

        const result = await response.json();
        if (response.ok && result.success) {
          showToast(result.message || 'Reset email sent successfully.', 'info');
        } else {
          showToast(result.message || 'Unable to send reset email.', 'error');
        }
      } catch (err) {
        console.error('Password reset error:', err);
        showToast('Network error while requesting password reset.', 'error');
      }
    });
  }

  if (saveContactEmailBtn) {
    saveContactEmailBtn.addEventListener('click', async () => {
      const email = contactEmailInput.value.trim();
      if (!email) {
        alert('Please enter a valid email address.');
        return;
      }

      try {
        const response = await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ settings: { contactEmail: email } })
        });

        if (!response.ok) {
          const result = await response.json().catch(() => ({}));
          throw new Error(result.message || 'Failed to save settings');
        }

        serverData.settings = serverData.settings || {};
        serverData.settings.contactEmail = email;
        showToast('Contact email saved successfully.', 'info');
      } catch (err) {
        console.error('Settings save failed:', err);
        showToast('Unable to save contact email. Check the server console for details.', 'error');
      }
    });
  }

  if (resetLoginBtn) {
    resetLoginBtn.addEventListener('click', (e) => {
      e.preventDefault();
      resetLoginStage();
      loginForm.reset();
      showToast('Login form has been reset.', 'info');
    });
  }

  if (generate2faBtn) {
    generate2faBtn.addEventListener('click', async () => {
      try {
        const response = await fetch('/api/admin/2fa/setup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        const result = await response.json();

        if (response.ok && result.success) {
          if (twoFactorQRCode) twoFactorQRCode.src = result.qrDataUri || '';
          if (twoFactorSecretText) twoFactorSecretText.textContent = result.secret || 'Secret generated.';
          if (twoFactorSetupPanel) twoFactorSetupPanel.style.display = 'grid';
          showToast('Scan the QR code with Google Authenticator.', 'info');
        } else {
          showToast(result.message || 'Unable to generate 2FA QR code.', 'error');
        }
      } catch (err) {
        console.error('2FA setup error:', err);
        showToast('Network error while generating authenticator setup.', 'error');
      }
    });
  }

  if (verify2faBtn) {
    verify2faBtn.addEventListener('click', async () => {
      const code = twoFactorVerifyCode?.value.trim();
      if (!code) {
        if (twoFactorSetupMsg) twoFactorSetupMsg.textContent = 'Enter the authenticator code shown in your app.';
        return;
      }

      try {
        const response = await fetch('/api/admin/2fa/enable', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code })
        });
        const result = await response.json();

        if (response.ok && result.success) {
          serverData.admin.twoFactorEnabled = true;
          updateTwoFactorUI();
          if (twoFactorSetupMsg) twoFactorSetupMsg.textContent = 'Two-factor authentication is now enabled.';
          showToast('2FA enabled successfully.', 'info');
        } else {
          if (twoFactorSetupMsg) twoFactorSetupMsg.textContent = result.message || 'Invalid authenticator code.';
          showToast(result.message || 'Invalid authenticator code.', 'error');
        }
      } catch (err) {
        console.error('2FA verify error:', err);
        showToast('Network error while verifying 2FA code.', 'error');
      }
    });
  }

  if (disable2faBtn) {
    disable2faBtn.addEventListener('click', async () => {
      const code = prompt('Enter your current authenticator code to disable 2FA:');
      if (!code) {
        return;
      }

      try {
        const response = await fetch('/api/admin/2fa/disable', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code })
        });
        const result = await response.json();

        if (response.ok && result.success) {
          serverData.admin.twoFactorEnabled = false;
          updateTwoFactorUI();
          showToast('Two-factor authentication has been disabled.', 'info');
        } else {
          showToast(result.message || 'Unable to disable 2FA.', 'error');
        }
      } catch (err) {
        console.error('2FA disable error:', err);
        showToast('Network error while disabling 2FA.', 'error');
      }
    });
  }

  // Save/Submit Product CRUD details
  if (productForm) {
    productForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const payload = {
        id: productIdInput.value,
        title: prodNameInput.value.trim(),
        category: productCategorySelect.value,
        price: parseFloat(prodPriceInput.value),
        tag: prodTagInput.value.trim(),
        image: prodImageInput.value.trim(),
        desc: prodDescInput.value.trim()
      };

      try {
        const response = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (response.ok && result.success) {
          showToast('Product successfully saved to local database.', 'info');
          closeProductModal();
          fetchDashboardData();
        } else {
          showToast(result.message || 'Error saving product.', 'error');
        }
      } catch (err) {
        console.error(err);
        showToast('Network error during product saving.', 'error');
      }
    });
  }

  // Delete Product Handler
  async function deleteProduct(id) {
    if (!confirm('Are you sure you want to delete this product from the database catalog?')) return;

    try {
      const response = await fetch(`/api/products/${id}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (response.ok && result.success) {
        showToast('Product successfully deleted from catalog.', 'info');
        fetchDashboardData();
      } else {
        showToast(result.message || 'Error deleting product.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Network error during product deletion.', 'error');
    }
  }

  // ==========================================================================
  // TOAST NOTIFICATIONS HELPER
  // ==========================================================================
  const toast = document.getElementById('admin-toast');
  const toastMsg = document.getElementById('toast-message');
  const toastIcon = document.getElementById('toast-icon');
  let toastTimeout = null;

  function showToast(message, type = 'info') {
    if (!toast) return;
    
    // Clear any pending dismissal timeout
    if (toastTimeout) clearTimeout(toastTimeout);
    
    toastMsg.textContent = message;
    
    toast.className = 'toast-notification';
    if (type === 'error') {
      toast.classList.add('error');
      toastIcon.setAttribute('data-lucide', 'alert-circle');
    } else {
      toastIcon.setAttribute('data-lucide', 'check-circle-2');
    }
    
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }

    toast.classList.add('show');

    toastTimeout = setTimeout(() => {
      toast.classList.remove('show');
    }, 3500);
  }
});
