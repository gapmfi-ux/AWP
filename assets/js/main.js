/* ============================================
   ACCOUNTS WORKSPACE - MAIN JAVASCRIPT
   Maintains original Google Apps Script logic approach
   ============================================ */

// Global Variables
let currentOpenSubmenu = null;
let sidebarCollapsed = false;
let currentUser = null;
let currentModule = 'dashboard';
let dashboardRefreshInterval = null;

// ============================================
// COMPATIBILITY LAYER - For modules using google.script.run
// ============================================

// Create a wrapper that mimics google.script.run for compatibility
window.google = {
  script: {
    run: (function() {
      // Store the current success and failure handlers
      let currentSuccessHandler = null;
      let currentFailureHandler = null;
      
      // Create the chainable object
      const chainable = {
        withSuccessHandler: function(callback) {
          currentSuccessHandler = callback;
          return chainable;
        },
        withFailureHandler: function(callback) {
          currentFailureHandler = callback;
          return chainable;
        }
      };
      
      // Add dynamic methods for all API actions
      const actions = [
        'getUserInfo',
        'processForm',
        'getNextPVNumber',
        'getPVNumbersByType',
        'getVoucherByNumber',
        'updateVoucher',
        'generateInventoryCategoryCode',
        'getInventoryCategories',
        'addNewInventory',
        'getPurchaseReportData',
        'getUsageReportData',
        'getInventoryListData',
        'recordInventoryUsage',
        'removeInventory',
        'generateAssetCode',
        'addNewAsset',
        'getDetailedRegister',
        'updateAssetStatus',
        'generateInvestmentCode',
        'addNewInvestment',
        'getInvestmentsByDateRange',
        'getMaturedInvestments',
        'getPVFormHTML',
        'getAddInventoryHTML',
        'getInventoryReportHTML',
        'getAddAssetHTML',
        'getAssetRegisterHTML',
        'getInvestmentAddHTML',
        'getInvestmentReportHTML'
      ];
      
      actions.forEach(action => {
        chainable[action] = function(...args) {
          // Map the action to API methods
          const actionMap = {
            // User
            'getUserInfo': () => API.getUserInfo(),
            
            // Payment Voucher
            'processForm': () => API.processForm(args[0]),
            'getNextPVNumber': () => API.getNextPVNumber(args[0]),
            'getPVNumbersByType': () => API.getPVNumbersByType(),
            'getVoucherByNumber': () => API.getVoucherByNumber(args[0], args[1]),
            'updateVoucher': () => API.updateVoucher(args[0]),
            
            // Inventory
            'generateInventoryCategoryCode': () => API.generateInventoryCategoryCode(),
            'getInventoryCategories': () => API.getInventoryCategories(),
            'addNewInventory': () => API.addNewInventory(args[0]),
            'getPurchaseReportData': () => API.getPurchaseReportData(args[0], args[1]),
            'getUsageReportData': () => API.getUsageReportData(args[0], args[1]),
            'getInventoryListData': () => API.getInventoryListData(),
            'recordInventoryUsage': () => API.recordInventoryUsage(args[0]),
            'removeInventory': () => API.removeInventory(args[0]),
            
            // Fixed Assets
            'generateAssetCode': () => API.generateAssetCode(args[0]),
            'addNewAsset': () => API.addNewAsset(args[0]),
            'getDetailedRegister': () => API.getDetailedRegister(),
            'updateAssetStatus': () => API.updateAssetStatus(args[0], args[1]),
            
            // Investment
            'generateInvestmentCode': () => API.generateInvestmentCode(args[0]),
            'addNewInvestment': () => API.addNewInvestment(args[0]),
            'getInvestmentsByDateRange': () => API.getInvestmentsByDateRange(args[0], args[1]),
            'getMaturedInvestments': () => API.getMaturedInvestments(args[0]),
            
            // HTML Module Loaders
            'getPVFormHTML': () => loadModuleFile('paymentVoucher'),
            'getAddInventoryHTML': () => loadModuleFile('inventoryAdd'),
            'getInventoryReportHTML': () => loadModuleFile('inventoryReport'),
            'getAddAssetHTML': () => loadModuleFile('addAsset'),
            'getAssetRegisterHTML': () => loadModuleFile('viewAssetRegister'),
            'getInvestmentAddHTML': () => loadModuleFile('investmentAdd'),
            'getInvestmentReportHTML': () => loadModuleFile('investmentReport')
          };
          
          const apiCall = actionMap[action];
          if (apiCall) {
            apiCall()
              .then(response => {
                if (currentSuccessHandler) {
                  currentSuccessHandler(response);
                }
              })
              .catch(error => {
                console.error(`API call failed for ${action}:`, error);
                if (currentFailureHandler) {
                  currentFailureHandler(error);
                }
              });
          } else {
            console.error('Unknown action:', action);
            if (currentFailureHandler) {
              currentFailureHandler(new Error(`Unknown action: ${action}`));
            }
          }
          return chainable;
        };
      });
      
      return chainable;
    })()
  }
};

// Helper to load module HTML files
async function loadModuleFile(moduleName) {
  const modules = {
    'paymentVoucher': 'modules/payment-voucher.html',
    'inventoryAdd': 'modules/add-inventory.html',
    'inventoryReport': 'modules/inventory-report.html',
    'addAsset': 'modules/add-asset.html',
    'viewAssetRegister': 'modules/asset-register.html',
    'investmentAdd': 'modules/add-investment.html',
    'investmentReport': 'modules/investment-report.html'
  };
  
  try {
    const response = await fetch(modules[moduleName]);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.text();
  } catch (error) {
    console.error('Error loading module file:', error);
    return '<div class="welcome-card"><i class="fas fa-exclamation-circle welcome-icon"></i><h2>Error Loading Module</h2><p>Could not load module. Please try again.</p></div>';
  }
}

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', function() {
  initializeApp();
});

function initializeApp() {
  loadUserInfo();
  setupEventListeners();
  setupSidebarToggleOnResize();
  
  // Load dashboard content directly
  loadDashboardContent();
  
  // Check if sidebar should be collapsed based on screen size
  if (window.innerWidth <= 768) {
    sidebarCollapsed = true;
    document.getElementById('sidebar').classList.add('collapsed');
  }
}

function setupEventListeners() {
  // Close user dropdown when clicking outside
  document.addEventListener('click', function(event) {
    const userMenu = document.querySelector('.user-menu');
    const userDropdown = document.getElementById('userDropdown');
    
    if (userMenu && !userMenu.contains(event.target)) {
      if (userDropdown) userDropdown.classList.remove('show');
    }
  });
}

function setupSidebarToggleOnResize() {
  window.addEventListener('resize', function() {
    if (window.innerWidth > 768 && sidebarCollapsed) {
      // Do nothing, keep collapsed state
    } else if (window.innerWidth <= 768) {
      document.getElementById('sidebar').classList.remove('show-mobile');
    }
  });
}

// ============================================
// USER INFORMATION
// ============================================

function loadUserInfo() {
  const userNameEl = document.getElementById('userName');
  if (userNameEl) {
    userNameEl.textContent = 'Loading...';
  }
  
  google.script.run
    .withSuccessHandler(function(user) {
      currentUser = user;
      document.getElementById('userName').textContent = user.name || 'User';
    })
    .withFailureHandler(function(error) {
      console.error('Error loading user:', error);
      document.getElementById('userName').textContent = 'Guest';
    })
    .getUserInfo();
}

// ============================================
// UI HELPERS
// ============================================

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const mainContent = document.querySelector('.main-content');
  
  if (window.innerWidth <= 768) {
    sidebar.classList.toggle('show-mobile');
  } else {
    sidebar.classList.toggle('collapsed');
    if (mainContent) {
      mainContent.classList.toggle('expanded');
    }
    sidebarCollapsed = sidebar.classList.contains('collapsed');
    
    // Close all submenus when sidebar is collapsed
    if (sidebarCollapsed) {
      document.querySelectorAll('.submenu').forEach(menu => {
        menu.classList.remove('show');
      });
      document.querySelectorAll('.dropdown-icon').forEach(icon => {
        icon.classList.remove('rotated');
      });
      currentOpenSubmenu = null;
    }
  }
}

function toggleUserMenu() {
  const dropdown = document.getElementById('userDropdown');
  dropdown.classList.toggle('show');
}

function toggleSubmenu(submenuId) {
  if (sidebarCollapsed && window.innerWidth > 768) return;
  
  const submenu = document.getElementById(submenuId);
  const icon = document.getElementById(submenuId.replace('Submenu', 'Icon'));
  
  // Close other submenus
  if (currentOpenSubmenu && currentOpenSubmenu !== submenu) {
    currentOpenSubmenu.classList.remove('show');
    const prevIcon = document.getElementById(currentOpenSubmenu.id.replace('Submenu', 'Icon'));
    if (prevIcon) prevIcon.classList.remove('rotated');
  }
  
  if (submenu) {
    submenu.classList.toggle('show');
    if (icon) icon.classList.toggle('rotated');
    currentOpenSubmenu = submenu.classList.contains('show') ? submenu : null;
  }
}

// ============================================
// LOADING MODAL
// ============================================

function showLoadingModal(message = 'Loading...') {
  let modal = document.getElementById('contentLoadingModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'contentLoadingModal';
    modal.className = 'content-loading-modal';
    document.body.appendChild(modal);
  }
  
  modal.innerHTML = `
    <div class="loading-modal-content">
      <div class="loading-spinner"></div>
      <p>${message}</p>
    </div>
  `;
  modal.style.display = 'flex';
}

function hideLoadingModal() {
  const modal = document.getElementById('contentLoadingModal');
  if (modal) modal.style.display = 'none';
}

// ============================================
// DASHBOARD FUNCTIONS
// ============================================

// Load dashboard content directly
function loadDashboardContent() {
  const mainContent = document.getElementById('mainContent');
  if (mainContent) {
    mainContent.innerHTML = '<div class="content-wrapper">' + generateDashboardHTML() + '</div>';
  }
  // Initialize dashboard and load alerts
  setTimeout(() => {
    initDashboard();
  }, 100);
}

// Generate dashboard HTML
function generateDashboardHTML() {
  return `
    <div class="dashboard-container">
      <div class="alerts-section">
        <h3><i class="fas fa-bell"></i> Alerts & Notifications</h3>
        
        <div class="alert-card" id="maturedAlert" style="display: none;">
          <div class="alert-icon">
            <i class="fas fa-check-circle"></i>
          </div>
          <div class="alert-content">
            <div class="alert-title">Matured Investments</div>
            <div class="alert-message" id="maturedMessage"></div>
          </div>
          <div class="alert-action">
            <button onclick="loadModule('investmentReport')" class="alert-btn">View Details</button>
          </div>
        </div>

        <div class="alert-card warning" id="nearMaturityAlert" style="display: none;">
          <div class="alert-icon">
            <i class="fas fa-clock"></i>
          </div>
          <div class="alert-content">
            <div class="alert-title">Investments Maturing in 5 Days</div>
            <div class="alert-message" id="nearMaturityMessage"></div>
          </div>
          <div class="alert-action">
            <button onclick="loadModule('investmentReport')" class="alert-btn">View Details</button>
          </div>
        </div>

        <div class="alert-card warning" id="lowStockAlert" style="display: none;">
          <div class="alert-icon">
            <i class="fas fa-boxes"></i>
          </div>
          <div class="alert-content">
            <div class="alert-title">Low Stock Alert</div>
            <div class="alert-message" id="lowStockMessage"></div>
          </div>
          <div class="alert-action">
            <button onclick="loadModule('inventoryReport')" class="alert-btn">View Inventory</button>
          </div>
        </div>

        <div class="alert-card danger" id="outOfStockAlert" style="display: none;">
          <div class="alert-icon">
            <i class="fas fa-times-circle"></i>
          </div>
          <div class="alert-content">
            <div class="alert-title">Out of Stock</div>
            <div class="alert-message" id="outOfStockMessage"></div>
          </div>
          <div class="alert-action">
            <button onclick="loadModule('inventoryAdd')" class="alert-btn">Restock Now</button>
          </div>
        </div>

        <div class="no-alerts" id="noAlerts">
          <i class="fas fa-check-circle"></i>
          <p>All clear! No pending alerts.</p>
        </div>
      </div>
    </div>
  `;
}

// Load dashboard data (alerts)
async function loadDashboardData() {
  try {
    console.log('Loading dashboard alerts...');
    
    // Get today's date
    const today = new Date();
    const todayStr = formatDateForInput(today);
    
    // Get date 5 days from now
    const fiveDaysLater = new Date(today);
    fiveDaysLater.setDate(today.getDate() + 5);
    const fiveDaysStr = formatDateForInput(fiveDaysLater);
    
    // Get start of year for date range
    const startOfYear = getStartOfYear();
    
    // Load investments and inventory data
    const [investments, inventoryList] = await Promise.all([
      API.getInvestmentsByDateRange(startOfYear, fiveDaysStr).catch(() => []),
      API.getInventoryListData().catch(() => [])
    ]);
    
    console.log('Investments loaded:', investments ? investments.length : 0);
    console.log('Inventory loaded:', inventoryList ? inventoryList.length : 0);
    
    // Process investment alerts
    processInvestmentAlerts(investments, todayStr, fiveDaysStr);
    
    // Process inventory alerts
    processInventoryAlerts(inventoryList);
    
  } catch (error) {
    console.error('Error loading dashboard data:', error);
  }
}

// Process investment alerts (matured and near maturity)
function processInvestmentAlerts(investments, todayStr, fiveDaysStr) {
  const maturedList = [];
  const nearMaturityList = [];
  
  if (investments && Array.isArray(investments)) {
    investments.forEach(inv => {
      if (inv.maturityDate) {
        const maturityDate = new Date(inv.maturityDate);
        const today = new Date(todayStr);
        const fiveDays = new Date(fiveDaysStr);
        
        // Check if matured today
        if (formatDateForInput(maturityDate) === todayStr) {
          maturedList.push({
            code: inv.investmentCode,
            amount: inv.maturityAmount || inv.amount,
            type: inv.investmentType
          });
        }
        // Check if maturing within 5 days (and not today)
        else if (maturityDate <= fiveDays && maturityDate > today) {
          nearMaturityList.push({
            code: inv.investmentCode,
            amount: inv.maturityAmount || inv.amount,
            date: inv.maturityDate,
            type: inv.investmentType
          });
        }
      }
    });
  }
  
  // Display matured investments alert
  const maturedAlert = document.getElementById('maturedAlert');
  const maturedMessage = document.getElementById('maturedMessage');
  
  if (maturedList.length > 0) {
    if (maturedAlert) maturedAlert.style.display = 'flex';
    if (maturedMessage) {
      maturedMessage.innerHTML = `
        <strong>${maturedList.length} investment(s) matured today:</strong>
        <ul>
          ${maturedList.map(inv => `<li>${inv.code} - GH₵ ${formatCurrency(inv.amount)}</li>`).join('')}
        </ul>
      `;
    }
  } else {
    if (maturedAlert) maturedAlert.style.display = 'none';
  }
  
  // Display near maturity alert
  const nearMaturityAlert = document.getElementById('nearMaturityAlert');
  const nearMaturityMessage = document.getElementById('nearMaturityMessage');
  
  if (nearMaturityList.length > 0) {
    if (nearMaturityAlert) nearMaturityAlert.style.display = 'flex';
    if (nearMaturityMessage) {
      nearMaturityMessage.innerHTML = `
        <strong>${nearMaturityList.length} investment(s) maturing in 5 days:</strong>
        <ul>
          ${nearMaturityList.map(inv => `<li>${inv.code} - GH₵ ${formatCurrency(inv.amount)} maturing on ${formatDate(inv.date)}</li>`).join('')}
        </ul>
      `;
    }
  } else {
    if (nearMaturityAlert) nearMaturityAlert.style.display = 'none';
  }
}

// Process inventory alerts (low stock and out of stock)
function processInventoryAlerts(inventoryList) {
  const lowStockList = [];
  const outOfStockList = [];
  
  if (inventoryList && Array.isArray(inventoryList)) {
    inventoryList.forEach(item => {
      const quantity = parseInt(item.quantity) || 0;
      const code = item.inventoryCode || item.code;
      const name = item.categoryName || item.name;
      
      if (quantity === 0) {
        outOfStockList.push({ code, name, quantity });
      } else if (quantity <= 5) {
        lowStockList.push({ code, name, quantity });
      }
    });
  }
  
  // Display out of stock alert
  const outOfStockAlert = document.getElementById('outOfStockAlert');
  const outOfStockMessage = document.getElementById('outOfStockMessage');
  
  if (outOfStockList.length > 0) {
    if (outOfStockAlert) outOfStockAlert.style.display = 'flex';
    if (outOfStockMessage) {
      outOfStockMessage.innerHTML = `
        <strong>${outOfStockList.length} item(s) out of stock:</strong>
        <ul>
          ${outOfStockList.map(item => `<li>${item.code} - ${item.name}</li>`).join('')}
        </ul>
      `;
    }
  } else {
    if (outOfStockAlert) outOfStockAlert.style.display = 'none';
  }
  
  // Display low stock alert
  const lowStockAlert = document.getElementById('lowStockAlert');
  const lowStockMessage = document.getElementById('lowStockMessage');
  
  if (lowStockList.length > 0) {
    if (lowStockAlert) lowStockAlert.style.display = 'flex';
    if (lowStockMessage) {
      lowStockMessage.innerHTML = `
        <strong>${lowStockList.length} item(s) running low (≤5 units):</strong>
        <ul>
          ${lowStockList.map(item => `<li>${item.code} - ${item.name} (${item.quantity} left)</li>`).join('')}
        </ul>
      `;
    }
  } else {
    if (lowStockAlert) lowStockAlert.style.display = 'none';
  }
  
  // Show/hide "no alerts" message (check all alerts)
  const noAlerts = document.getElementById('noAlerts');
  const maturedAlert = document.getElementById('maturedAlert');
  const nearMaturityAlert = document.getElementById('nearMaturityAlert');
  
  const hasAnyAlerts = 
    (maturedAlert && maturedAlert.style.display === 'flex') ||
    (nearMaturityAlert && nearMaturityAlert.style.display === 'flex') ||
    lowStockList.length > 0 ||
    outOfStockList.length > 0;
  
  if (noAlerts) {
    if (hasAnyAlerts) {
      noAlerts.style.display = 'none';
    } else {
      noAlerts.style.display = 'block';
    }
  }
}

// Initialize Dashboard
function initDashboard() {
  console.log('Dashboard initialized - loading alerts');
  currentModule = 'dashboard';
  // Load dashboard data
  loadDashboardData();
  
  // Set up auto-refresh every 5 minutes (300000 ms)
  if (dashboardRefreshInterval) {
    clearInterval(dashboardRefreshInterval);
  }
  dashboardRefreshInterval = setInterval(() => {
    if (currentModule === 'dashboard') {
      console.log('Auto-refreshing dashboard alerts...');
      loadDashboardData();
    }
  }, 300000);
}

// Clean up interval when leaving dashboard (optional)
function cleanupDashboard() {
  if (dashboardRefreshInterval) {
    clearInterval(dashboardRefreshInterval);
    dashboardRefreshInterval = null;
  }
}

// ============================================
// MODULE LOADING (for other modules)
// ============================================

// Alias for sidebar to load modules
function loadModule(moduleName) {
  if (currentModule === moduleName) return;
  
  showLoadingModal('Loading module...');
  currentModule = moduleName;
  
  // Update active state in sidebar
  updateActiveMenuItem(moduleName);
  
  const modules = {
    'paymentVoucher': { file: 'modules/payment-voucher.html', init: 'initPVModule' },
    'inventoryAdd': { file: 'modules/add-inventory.html', init: 'initInventoryModule' },
    'inventoryReport': { file: 'modules/inventory-report.html', init: 'initInventoryReportModule' },
    'addAsset': { file: 'modules/add-asset.html', init: 'initAssetModule' },
    'viewAssetRegister': { file: 'modules/asset-register.html', init: 'initAssetRegisterModule' },
    'investmentAdd': { file: 'modules/add-investment.html', init: 'initInvestmentModule' },
    'investmentReport': { file: 'modules/investment-report.html', init: 'initInvestmentReportModule' },
    'dashboard': null
  };
  
  // Handle dashboard separately
  if (moduleName === 'dashboard') {
    loadDashboardContent();
    hideLoadingModal();
    closeSidebarMobile();
    return;
  }
  
  const config = modules[moduleName];
  if (!config) {
    showError('Module not found: ' + moduleName);
    hideLoadingModal();
    return;
  }
  
  fetch(config.file)
    .then(response => response.ok ? response.text() : Promise.reject('HTTP ' + response.status))
    .then(html => {
      document.getElementById('mainContent').innerHTML = `<div class="content-wrapper">${html}</div>`;
      setTimeout(() => {
        if (window[config.init] && typeof window[config.init] === 'function') {
          window[config.init]();
        }
        hideLoadingModal();
      }, 150);
      closeSidebarMobile();
    })
    .catch(error => {
      console.error('Error loading module:', error);
      showError('Could not load module. Please try again.');
      hideLoadingModal();
    });
}

function updateActiveMenuItem(moduleName) {
  // Remove active class from all menu items
  document.querySelectorAll('.menu-item').forEach(item => {
    item.classList.remove('active');
  });
  
  // Find and activate the corresponding menu item
  document.querySelectorAll('.menu-item').forEach(item => {
    const onclickAttr = item.getAttribute('onclick');
    if (onclickAttr && onclickAttr.includes(`'${moduleName}'`)) {
      item.classList.add('active');
    }
  });
}

function showError(message) {
  alert(message);
}

function closeSidebarMobile() {
  if (window.innerWidth <= 768) {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
      sidebar.classList.remove('show-mobile');
    }
  }
}

// ============================================
// MODULE INITIALIZERS (Placeholders)
// ============================================

function initPVModule() {
  console.log('Payment Voucher module loaded');
}

function initInventoryModule() {
  console.log('Inventory module loaded');
}

function initInventoryReportModule() {
  console.log('Inventory Report module loaded');
}

function initAssetModule() {
  console.log('Asset module loaded');
}

function initAssetRegisterModule() {
  console.log('Asset Register module loaded');
}

function initInvestmentModule() {
  console.log('Investment module loaded');
}

function initInvestmentReportModule() {
  console.log('Investment Report module loaded');
}

// ============================================
// USER FUNCTIONS
// ============================================

function showProfile() {
  alert('Profile feature coming soon');
}

function showSettings() {
  alert('Settings feature coming soon');
}

function logout() {
  if (confirm('Are you sure you want to logout?')) {
    currentUser = null;
    alert('Logged out successfully');
    window.location.reload();
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function formatCurrency(value) {
  if (value === null || value === undefined || value === '') return '0.00';
  const numValue = parseFloat(value);
  if (isNaN(numValue)) return '0.00';
  return numValue.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatDate(dateString) {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (e) {
    return dateString;
  }
}

function formatDateForInput(date) {
  if (!date) return '';
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getToday() {
  return formatDateForInput(new Date());
}

function getStartOfYear() {
  const today = new Date();
  const startOfYear = new Date(today.getFullYear(), 0, 1);
  return formatDateForInput(startOfYear);
}

// ============================================
// EXPORT FOR MODULES
// ============================================

// Make functions available globally
window.loadModule = loadModule;
window.toggleSidebar = toggleSidebar;
window.toggleUserMenu = toggleUserMenu;
window.toggleSubmenu = toggleSubmenu;
window.showProfile = showProfile;
window.showSettings = showSettings;
window.logout = logout;
window.initPVModule = initPVModule;
window.initInventoryModule = initInventoryModule;
window.initInventoryReportModule = initInventoryReportModule;
window.initAssetModule = initAssetModule;
window.initAssetRegisterModule = initAssetRegisterModule;
window.initInvestmentModule = initInvestmentModule;
window.initInvestmentReportModule = initInvestmentReportModule;
window.initDashboard = initDashboard;
window.refreshDashboard = loadDashboardData;
window.formatCurrency = formatCurrency;
window.formatDate = formatDate;
window.formatDateForInput = formatDateForInput;
window.getToday = getToday;
window.getStartOfYear = getStartOfYear;

// ============================================
// ADD CSS FOR LOADING MODAL AND DASHBOARD
// ============================================

const homepageLoadingStyle = document.createElement('style');
homepageLoadingStyle.textContent = `
  .content-loading-modal {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: none;
    align-items: center;
    justify-content: center;
    z-index: 999;
  }

  .loading-modal-content {
    background: white;
    padding: 40px;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
    text-align: center;
    min-width: 150px;
  }

  .loading-spinner {
    width: 50px;
    height: 50px;
    border: 4px solid #f3f3f3;
    border-top: 4px solid #4361ee;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 15px auto;
  }

  .loading-modal-content p {
    color: #2d3748;
    font-size: 14px;
    font-weight: 500;
    margin: 0;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  /* Dashboard Alerts Styles */
  .dashboard-container {
    max-width: 1000px;
    margin: 0 auto;
  }

  .alerts-section {
    background: white;
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  }

  .alerts-section h3 {
    color: #2d3748;
    font-size: 16px;
    margin-bottom: 15px;
    padding-bottom: 10px;
    border-bottom: 2px solid #e2e8f0;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .alerts-section h3 i {
    color: #4361ee;
  }

  .alert-card {
    display: flex;
    align-items: center;
    gap: 15px;
    padding: 15px;
    margin-bottom: 12px;
    border-radius: 10px;
    background: #f0fdf4;
    border-left: 4px solid #06d6a0;
    transition: all 0.2s;
  }

  .alert-card.warning {
    background: #fefce8;
    border-left-color: #ffd166;
  }

  .alert-card.danger {
    background: #fef2f2;
    border-left-color: #ef476f;
  }

  .alert-card:hover {
    transform: translateX(3px);
  }

  .alert-icon {
    font-size: 28px;
    min-width: 50px;
    text-align: center;
  }

  .alert-card .alert-icon i {
    color: #06d6a0;
  }

  .alert-card.warning .alert-icon i {
    color: #ffd166;
  }

  .alert-card.danger .alert-icon i {
    color: #ef476f;
  }

  .alert-content {
    flex: 1;
  }

  .alert-title {
    font-weight: 700;
    font-size: 14px;
    color: #2d3748;
    margin-bottom: 4px;
  }

  .alert-message {
    font-size: 12px;
    color: #4a5568;
  }

  .alert-message ul {
    margin: 5px 0 0 20px;
    padding: 0;
  }

  .alert-message li {
    margin: 3px 0;
  }

  .alert-btn {
    background: #4361ee;
    color: white;
    border: none;
    padding: 6px 14px;
    border-radius: 6px;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
  }

  .alert-btn:hover {
    background: #3a56d4;
    transform: translateY(-1px);
  }

  .alert-card.danger .alert-btn {
    background: #ef476f;
  }

  .alert-card.danger .alert-btn:hover {
    background: #d32f2f;
  }

  .alert-card.warning .alert-btn {
    background: #ffd166;
    color: #2d3748;
  }

  .alert-card.warning .alert-btn:hover {
    background: #e6c200;
  }

  .no-alerts {
    text-align: center;
    padding: 40px;
    color: #a0aec0;
  }

  .no-alerts i {
    font-size: 48px;
    margin-bottom: 12px;
    color: #cbd5e0;
  }

  .no-alerts p {
    font-size: 14px;
  }

  @media (max-width: 768px) {
    .alerts-section {
      padding: 15px;
    }

    .alert-card {
      flex-direction: column;
      text-align: center;
      gap: 10px;
    }

    .alert-action {
      width: 100%;
    }

    .alert-btn {
      width: 100%;
    }
  }
`;
document.head.appendChild(homepageLoadingStyle);
