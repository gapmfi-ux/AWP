/* ============================================
   ACCOUNTS WORKSPACE - MAIN JAVASCRIPT
   ============================================ */

// Global Variables
let currentOpenSubmenu = null;
let sidebarCollapsed = false;
let currentUser = null;
let currentModule = 'dashboard';
let pendingPayrollModule = null;

// ============================================
// PAYROLL ACCESS CODE
// ============================================

const PAYROLL_ACCESS_CODE = 'GAP2026'; // Default code

function checkPayrollAccess(moduleName) {
  // Check if access was already granted in this session
  if (sessionStorage.getItem('payrollAccessGranted') === 'true') {
    // Access already granted, proceed
    loadModule(moduleName);
    return;
  }
  
  // Store the requested module and show access modal
  pendingPayrollModule = moduleName;
  showAccessModal();
}

function showAccessModal() {
  const modal = document.getElementById('accessCodeModal');
  const input = document.getElementById('accessCodeInput');
  const error = document.getElementById('accessCodeError');
  
  if (modal) {
    modal.classList.add('show');
    modal.style.display = 'flex';
    if (input) {
      input.value = '';
      input.focus();
    }
    if (error) {
      error.style.display = 'none';
    }
  }
}

function verifyAccessCode() {
  const input = document.getElementById('accessCodeInput');
  const error = document.getElementById('accessCodeError');
  const enteredCode = input ? input.value.trim() : '';
  
  if (enteredCode === PAYROLL_ACCESS_CODE) {
    // Access granted
    sessionStorage.setItem('payrollAccessGranted', 'true');
    closeAccessModal();
    
    // Load the pending module
    if (pendingPayrollModule) {
      loadModule(pendingPayrollModule);
      pendingPayrollModule = null;
    }
  } else {
    // Invalid code
    if (error) {
      error.style.display = 'block';
    }
    if (input) {
      input.value = '';
      input.focus();
    }
    sessionStorage.removeItem('payrollAccessGranted');
  }
}

function closeAccessModal() {
  const modal = document.getElementById('accessCodeModal');
  if (modal) {
    modal.classList.remove('show');
    modal.style.display = 'none';
  }
  const error = document.getElementById('accessCodeError');
  if (error) {
    error.style.display = 'none';
  }
}

// Override the loadModule function to check for payroll modules
const originalLoadModule = loadModule;
loadModule = function(moduleName) {
  const payrollModules = ['employeeList', 'payroll', 'payslip'];
  
  if (payrollModules.includes(moduleName)) {
    checkPayrollAccess(moduleName);
  } else {
    originalLoadModule(moduleName);
  }
};

// ============================================
// COMPATIBILITY LAYER
// ============================================

window.google = {
  script: {
    run: (function() {
      let currentSuccessHandler = null;
      let currentFailureHandler = null;
      
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
          const actionMap = {
            'getUserInfo': () => API.getUserInfo(),
            'processForm': () => API.processForm(args[0]),
            'getNextPVNumber': () => API.getNextPVNumber(args[0]),
            'getPVNumbersByType': () => API.getPVNumbersByType(),
            'getVoucherByNumber': () => API.getVoucherByNumber(args[0], args[1]),
            'updateVoucher': () => API.updateVoucher(args[0]),
            'generateInventoryCategoryCode': () => API.generateInventoryCategoryCode(),
            'getInventoryCategories': () => API.getInventoryCategories(),
            'addNewInventory': () => API.addNewInventory(args[0]),
            'getPurchaseReportData': () => API.getPurchaseReportData(args[0], args[1]),
            'getUsageReportData': () => API.getUsageReportData(args[0], args[1]),
            'getInventoryListData': () => API.getInventoryListData(args[0]),
            'recordInventoryUsage': () => API.recordInventoryUsage(args[0]),
            'removeInventory': () => API.removeInventory(args[0]),
            'generateAssetCode': () => API.generateAssetCode(args[0]),
            'addNewAsset': () => API.addNewAsset(args[0]),
            'getDetailedRegister': () => API.getDetailedRegister(),
            'updateAssetStatus': () => API.updateAssetStatus(args[0], args[1]),
            'generateInvestmentCode': () => API.generateInvestmentCode(args[0]),
            'addNewInvestment': () => API.addNewInvestment(args[0]),
            'getInvestmentsByDateRange': () => API.getInvestmentsByDateRange(args[0], args[1]),
            'getMaturedInvestments': () => API.getMaturedInvestments(args[0]),
            'getSubscriptionCategories': () => API.getSubscriptionCategories(),
            'generateSubscriptionCategoryCode': () => API.generateSubscriptionCategoryCode(),
            'getNextSubscriptionCode': () => API.getNextSubscriptionCode(args[0]),
            'addSubscription': () => API.addSubscription(args[0]),
            'getAllSubscriptions': () => API.getAllSubscriptions(),
            'updateSubscription': () => API.updateSubscription(args[0]),
            'deleteSubscription': () => API.deleteSubscription(args[0]),
            'getSubscriptionsByDateRange': () => API.getSubscriptionsByDateRange(args[0], args[1]),
            'getExpiredSubscriptions': () => API.getExpiredSubscriptions(args[0]),
            'renewSubscription': () => API.renewSubscription(args[0], args[1], args[2]),
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
    'investmentReport': 'modules/investment-report.html',
    'employeeList': 'modules/employee-list.html',
    'payroll': 'modules/payroll.html',
    'payslip': 'modules/payslip.html'
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
  
  if (typeof loadDashboardContent === 'function') {
    loadDashboardContent();
  } else {
    const mainContent = document.getElementById('mainContent');
    if (mainContent) {
      mainContent.innerHTML = '<div class="content-wrapper"><p>Loading dashboard...</p></div>';
    }
  }
  
  if (window.innerWidth <= 768) {
    sidebarCollapsed = true;
    const s = document.getElementById('sidebar');
    if (s) s.classList.add('collapsed');
  }
}

function setupEventListeners() {
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
      // Do nothing
    } else if (window.innerWidth <= 768) {
      const s = document.getElementById('sidebar');
      if (s) s.classList.remove('show-mobile');
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
      const el = document.getElementById('userName');
      if (el) el.textContent = user.name || 'User';
    })
    .withFailureHandler(function(error) {
      console.error('Error loading user:', error);
      const el = document.getElementById('userName');
      if (el) el.textContent = 'Guest';
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
    if (sidebar) sidebar.classList.toggle('show-mobile');
  } else {
    if (sidebar) sidebar.classList.toggle('collapsed');
    if (mainContent) mainContent.classList.toggle('expanded');
    sidebarCollapsed = sidebar && sidebar.classList.contains('collapsed');
    
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
  if (dropdown) dropdown.classList.toggle('show');
}

function toggleSubmenu(submenuId) {
  if (sidebarCollapsed && window.innerWidth > 768) return;
  
  const submenu = document.getElementById(submenuId);
  const icon = document.getElementById(submenuId.replace('Submenu', 'Icon'));
  
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
// MODULE LOADING
// ============================================

function loadModule(moduleName) {
  return new Promise((resolve, reject) => {
    if (currentModule === moduleName) {
      resolve();
      return;
    }
    
    showLoadingModal('Loading module...');
    currentModule = moduleName;
    updateActiveMenuItem(moduleName);
    
    const modules = {
      'paymentVoucher': { file: 'modules/payment-voucher.html', init: 'initPVModule' },
      'inventoryAdd': { file: 'modules/add-inventory.html', init: 'initInventoryModule' },
      'inventoryReport': { file: 'modules/inventory-report.html', init: 'initInventoryReportModule' },
      'addAsset': { file: 'modules/add-asset.html', init: 'initAssetModule' },
      'viewAssetRegister': { file: 'modules/asset-register.html', init: 'initAssetRegisterModule' },
      'investmentAdd': { file: 'modules/add-investment.html', init: 'initInvestmentModule' },
      'investmentReport': { file: 'modules/investment-report.html', init: 'initInvestmentReportModule' },
      'subscriptionAdd': { file: 'modules/subscription-add.html', init: 'initSubscriptionAddModule' },
      'subscriptionSchedule': { file: 'modules/subscription-schedule.html', init: 'initSubscriptionScheduleModule' },
      'dailyLiquidity': { file: 'modules/dailyliquidity.html', init: 'initDailyLiquidityModule' },
      'employeeList': { file: 'modules/employee-list.html', init: 'initEmployeeListModule' },
      'payroll': { file: 'modules/payroll.html', init: 'initPayrollModule' },
      'payslip': { file: 'modules/payslip.html', init: 'initPayslipModule' },
      'dashboard': null
    };
    
    if (moduleName === 'dashboard') {
      if (typeof loadDashboardContent === 'function') {
        loadDashboardContent();
      }
      hideLoadingModal();
      closeSidebarMobile();
      resolve();
      return;
    }
    
    const config = modules[moduleName];
    if (!config) {
      showError('Module not found: ' + moduleName);
      hideLoadingModal();
      reject(new Error('Module not found: ' + moduleName));
      return;
    }
    
    fetch(config.file)
      .then(response => response.ok ? response.text() : Promise.reject('HTTP ' + response.status))
      .then(html => {
        const main = document.getElementById('mainContent');
        if (main) {
          main.innerHTML = `<div class="content-wrapper">${html}</div>`;
        }
        setTimeout(() => {
          try {
            if (window[config.init] && typeof window[config.init] === 'function') {
              window[config.init]();
            }
            hideLoadingModal();
            closeSidebarMobile();
            resolve();
          } catch (initErr) {
            hideLoadingModal();
            console.error('Module init error:', initErr);
            reject(initErr);
          }
        }, 150);
      })
      .catch(error => {
        console.error('Error loading module:', error);
        showError('Could not load module. Please try again.');
        hideLoadingModal();
        reject(error);
      });
  });
}

function updateActiveMenuItem(moduleName) {
  document.querySelectorAll('.menu-item').forEach(item => {
    item.classList.remove('active');
  });
  
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
// MODULE INITIALIZERS
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

function initSubscriptionAddModule() {
  console.log('Subscription Add module loaded');
}

function initSubscriptionScheduleModule() {
  console.log('Subscription Schedule module loaded');
}

function initDailyLiquidityModule() {
  console.log('Daily Liquidity module loaded');
  if (typeof window.initDailyLiquidityModule === 'function') {
    window.initDailyLiquidityModule();
  }
}

function initEmployeeListModule() {
  console.log('Employee List module loaded');
  if (typeof window.initEmployeeList === 'function') window.initEmployeeList();
}

function initPayrollModule() {
  console.log('Payroll module loaded');
  if (typeof window.initPayroll === 'function') window.initPayroll();
}

function initPayslipModule() {
  console.log('Payslip module loaded');
  if (typeof window.initPayslipModule === 'function') window.initPayslipModule();
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
    sessionStorage.removeItem('payrollAccessGranted');
    alert('Logged out successfully');
    window.location.reload();
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

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

function getToday() {
  return formatDateForInput(new Date());
}

function getStartOfYear() {
  const today = new Date();
  const startOfYear = new Date(today.getFullYear(), 0, 1);
  return formatDateForInput(startOfYear);
}

function formatDateForInput(date) {
  if (!date) return '';
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ============================================
// EXPORT
// ============================================

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
window.initSubscriptionAddModule = initSubscriptionAddModule;
window.initSubscriptionScheduleModule = initSubscriptionScheduleModule;
window.initDailyLiquidityModule = initDailyLiquidityModule;
window.initEmployeeListModule = initEmployeeListModule;
window.initPayrollModule = initPayrollModule;
window.initPayslipModule = initPayslipModule;
window.formatDate = formatDate;
window.getToday = getToday;
window.getStartOfYear = getStartOfYear;
window.showLoadingModal = showLoadingModal;
window.hideLoadingModal = hideLoadingModal;
window.verifyAccessCode = verifyAccessCode;
window.closeAccessModal = closeAccessModal;
window.checkPayrollAccess = checkPayrollAccess;

// ============================================
// ADD CSS FOR LOADING MODAL
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

  /* Access Code Modal */
  .access-modal {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    z-index: 999999;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(4px);
  }

  .access-modal.show {
    display: flex;
  }

  .access-modal-content {
    background: #ffffff;
    border-radius: 12px;
    max-width: 420px;
    width: 92%;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    animation: modalSlideIn 0.25s ease-out;
    padding: 0;
    overflow: hidden;
  }

  .access-modal-header {
    padding: 18px 24px;
    border-bottom: 1px solid #e2e8f0;
    background: #fafbfc;
  }

  .access-modal-header h3 {
    margin: 0;
    font-size: 17px;
    font-weight: 700;
    color: #1a202c;
  }

  .access-modal-header h3 i {
    color: #4361ee;
    margin-right: 8px;
  }

  .access-modal-body {
    padding: 24px;
  }

  .access-modal-body p {
    margin: 0 0 4px 0;
    font-size: 14px;
    color: #4a5568;
  }

  @keyframes modalSlideIn {
    from {
      opacity: 0;
      transform: translateY(-20px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
`;
document.head.appendChild(homepageLoadingStyle);
