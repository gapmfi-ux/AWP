// ============================================
// DASHBOARD MODULE
// ============================================

let dashboardData = {
  maturedInvestments: [],
  nearMaturityInvestments: [],
  lowStockItems: [],
  outOfStockItems: [],
  expiredSubscriptions: [],
  expiringSubscriptions: [],
  duePayments: []
};

let dashboardRefreshInterval = null;

// ============================================
// DASHBOARD INITIALIZATION
// ============================================

function initDashboard() {
  console.log('Initializing Dashboard');
  currentModule = 'dashboard';
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

function cleanupDashboard() {
  if (dashboardRefreshInterval) {
    clearInterval(dashboardRefreshInterval);
    dashboardRefreshInterval = null;
  }
}

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

        <div class="alert-card danger" id="expiredSubscriptionsAlert" style="display: none;">
          <div class="alert-icon">
            <i class="fas fa-calendar-times"></i>
          </div>
          <div class="alert-content">
            <div class="alert-title">Expired Subscriptions</div>
            <div class="alert-message" id="expiredSubscriptionsMessage"></div>
          </div>
          <div class="alert-action">
            <button onclick="loadModule('subscriptionSchedule')" class="alert-btn">Renew Now</button>
          </div>
        </div>

        <div class="alert-card warning" id="expiringSubscriptionsAlert" style="display: none;">
          <div class="alert-icon">
            <i class="fas fa-exclamation-circle"></i>
          </div>
          <div class="alert-content">
            <div class="alert-title">Subscriptions Expiring Soon</div>
            <div class="alert-message" id="expiringSubscriptionsMessage"></div>
          </div>
          <div class="alert-action">
            <button onclick="loadModule('subscriptionSchedule')" class="alert-btn">View Schedule</button>
          </div>
        </div>

        <div class="alert-card danger" id="duePaymentsAlert" style="display: none;">
          <div class="alert-icon">
            <i class="fas fa-credit-card"></i>
          </div>
          <div class="alert-content">
            <div class="alert-title">Subscription Payments Due</div>
            <div class="alert-message" id="duePaymentsMessage"></div>
          </div>
          <div class="alert-action">
            <button onclick="loadModule('subscriptionSchedule')" class="alert-btn">Make Payment</button>
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

function loadDashboardData() {
  console.log('Loading dashboard data...');
  
  // Load all data in parallel
  Promise.all([
    loadInvestmentAlerts(),
    loadInventoryAlerts(),
    loadSubscriptionAlerts()
  ])
  .then(() => {
    console.log('All dashboard data loaded');
    renderDashboardAlerts();
  })
  .catch(error => {
    console.error('Error loading dashboard data:', error);
    renderDashboardAlerts(); // Still render with whatever data we have
  });
}

// ============================================
// INVESTMENT ALERTS
// ============================================

function loadInvestmentAlerts() {
  console.log('Loading investment alerts...');
  
  return new Promise((resolve) => {
    if (typeof API === 'undefined' || !API) {
      console.log('API not available for investments');
      resolve();
      return;
    }
    
    const today = new Date();
    const todayStr = formatDateForInput(today);
    const fiveDaysLater = new Date(today);
    fiveDaysLater.setDate(today.getDate() + 5);
    const fiveDaysStr = formatDateForInput(fiveDaysLater);
    
    // Get all investments to check maturity dates
    API.getAllInvestments()
      .then(function(response) {
        if (response && Array.isArray(response)) {
          console.log('Total investments:', response.length);
          
          const todayDate = new Date(todayStr);
          todayDate.setHours(0, 0, 0, 0);
          
          const fiveDaysDate = new Date(fiveDaysStr);
          fiveDaysDate.setHours(23, 59, 59, 999);
          
          // Matured investments (maturity date < today)
          dashboardData.maturedInvestments = response.filter(inv => {
            if (!inv.maturityDate) return false;
            const maturityDate = new Date(inv.maturityDate);
            maturityDate.setHours(0, 0, 0, 0);
            return maturityDate < todayDate;
          });
          
          // Near maturity investments (maturity date is 1 to 5 days from today)
          dashboardData.nearMaturityInvestments = response.filter(inv => {
            if (!inv.maturityDate) return false;
            const maturityDate = new Date(inv.maturityDate);
            maturityDate.setHours(0, 0, 0, 0);
            return maturityDate > todayDate && maturityDate <= fiveDaysDate;
          });
          
          console.log('Matured investments count:', dashboardData.maturedInvestments.length);
          console.log('Near maturity investments count:', dashboardData.nearMaturityInvestments.length);
        }
        resolve();
      })
      .catch(error => {
        console.error('Error loading investments:', error);
        resolve();
      });
  });
}

// ============================================
// INVENTORY ALERTS
// ============================================

function loadInventoryAlerts() {
  console.log('Loading inventory alerts...');
  
  return new Promise((resolve) => {
    if (typeof API === 'undefined' || !API) {
      console.log('API not available for inventory');
      resolve();
      return;
    }
    
    API.getInventoryListData()
      .then(function(response) {
        if (response && Array.isArray(response)) {
          // Separate low stock and out of stock
          dashboardData.lowStockItems = response.filter(item => 
            item.quantity > 0 && item.quantity <= 5
          );
          dashboardData.outOfStockItems = response.filter(item => 
            item.quantity === 0
          );
          
          console.log('Low stock items:', dashboardData.lowStockItems.length);
          console.log('Out of stock items:', dashboardData.outOfStockItems.length);
        }
        resolve();
      })
      .catch(error => {
        console.error('Error loading inventory data:', error);
        resolve();
      });
  });
}

// ============================================
// SUBSCRIPTION ALERTS
// ============================================

function loadSubscriptionAlerts() {
  console.log('Loading subscription alerts...');
  
  return new Promise((resolve) => {
    if (typeof API === 'undefined' || !API) {
      console.log('API not available for subscriptions');
      loadSubscriptionAlertsFromStorage();
      resolve();
      return;
    }
    
    API.getAllSubscriptions()
      .then(function(response) {
        if (response && Array.isArray(response)) {
          processSubscriptionAlerts(response);
        } else if (response && response.data && Array.isArray(response.data)) {
          processSubscriptionAlerts(response.data);
        } else {
          loadSubscriptionAlertsFromStorage();
        }
        resolve();
      })
      .catch(error => {
        console.error('Error loading subscriptions:', error);
        loadSubscriptionAlertsFromStorage();
        resolve();
      });
  });
}

function loadSubscriptionAlertsFromStorage() {
  const stored = localStorage.getItem('subscriptions_list');
  if (stored) {
    try {
      const subscriptions = JSON.parse(stored);
      processSubscriptionAlerts(subscriptions);
    } catch (e) {
      console.error('Error parsing subscriptions from storage:', e);
    }
  }
}

function processSubscriptionAlerts(subscriptions) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const expiredSubs = [];
  const expiringSubs = [];
  const duPayments = [];
  
  subscriptions.forEach(sub => {
    if (!sub.expiryDate) return;
    
    const expiryDate = new Date(sub.expiryDate);
    expiryDate.setHours(0, 0, 0, 0);
    
    const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
    
    // Check for expired subscriptions
    if (daysUntilExpiry < 0) {
      expiredSubs.push({
        ...sub,
        daysOverdue: Math.abs(daysUntilExpiry)
      });
    }
    // Check for expiring soon (30 days)
    else if (daysUntilExpiry <= 30 && daysUntilExpiry > 0) {
      expiringSubs.push({
        ...sub,
        daysUntilExpiry: daysUntilExpiry
      });
    }
  });
  
  // Check for in-arrears subscriptions with pending payments
  subscriptions.forEach(sub => {
    if (sub.paymentMode === 'In Arrears') {
      const amountPaid = sub.amountPaid || 0;
      const remaining = (sub.annualCost || 0) - amountPaid;
      
      if (remaining > 0) {
        duPayments.push({
          ...sub,
          amountDue: remaining,
          amountPaid: amountPaid
        });
      }
    }
  });
  
  dashboardData.expiredSubscriptions = expiredSubs;
  dashboardData.expiringSubscriptions = expiringSubs;
  dashboardData.duePayments = duPayments;
  
  console.log('Expired subscriptions:', dashboardData.expiredSubscriptions.length);
  console.log('Expiring subscriptions:', dashboardData.expiringSubscriptions.length);
  console.log('Due payments:', dashboardData.duePayments.length);
}

// ============================================
// RENDER DASHBOARD ALERTS
// ============================================

function renderDashboardAlerts() {
  console.log('Rendering dashboard alerts...');
  
  let hasAlerts = false;
  
  // Render matured investments
  if (dashboardData.maturedInvestments && dashboardData.maturedInvestments.length > 0) {
    hasAlerts = true;
    const alert = document.getElementById('maturedAlert');
    const message = document.getElementById('maturedMessage');
    if (alert && message) {
      const count = dashboardData.maturedInvestments.length;
      const totalAmount = dashboardData.maturedInvestments.reduce((sum, inv) => sum + (parseFloat(inv.maturityAmount || inv.amount) || 0), 0);
      message.innerHTML = `<strong>${count}</strong> investment(s) have matured (Total: GH₵ ${formatCurrency(totalAmount)}).`;
      alert.style.display = 'flex';
    }
  } else {
    const alert = document.getElementById('maturedAlert');
    if (alert) alert.style.display = 'none';
  }
  
  // Render near maturity investments
  if (dashboardData.nearMaturityInvestments && dashboardData.nearMaturityInvestments.length > 0) {
    hasAlerts = true;
    const alert = document.getElementById('nearMaturityAlert');
    const message = document.getElementById('nearMaturityMessage');
    if (alert && message) {
      const count = dashboardData.nearMaturityInvestments.length;
      const totalAmount = dashboardData.nearMaturityInvestments.reduce((sum, inv) => sum + (parseFloat(inv.amount) || 0), 0);
      message.innerHTML = `<strong>${count}</strong> investment(s) will mature within 5 days (Total: GH₵ ${formatCurrency(totalAmount)}).`;
      alert.style.display = 'flex';
    }
  } else {
    const alert = document.getElementById('nearMaturityAlert');
    if (alert) alert.style.display = 'none';
  }
  
  // Render low stock alert
  if (dashboardData.lowStockItems && dashboardData.lowStockItems.length > 0) {
    hasAlerts = true;
    const alert = document.getElementById('lowStockAlert');
    const message = document.getElementById('lowStockMessage');
    if (alert && message) {
      const items = dashboardData.lowStockItems.slice(0, 3).map(item => 
        `${item.name || item.categoryName || item.code} (${item.quantity} left)`
      ).join(', ');
      const remaining = dashboardData.lowStockItems.length > 3 ? 
        ` and ${dashboardData.lowStockItems.length - 3} more` : '';
      message.innerHTML = `${items}${remaining}`;
      alert.style.display = 'flex';
    }
  } else {
    const alert = document.getElementById('lowStockAlert');
    if (alert) alert.style.display = 'none';
  }
  
  // Render out of stock alert
  if (dashboardData.outOfStockItems && dashboardData.outOfStockItems.length > 0) {
    hasAlerts = true;
    const alert = document.getElementById('outOfStockAlert');
    const message = document.getElementById('outOfStockMessage');
    if (alert && message) {
      const count = dashboardData.outOfStockItems.length;
      message.innerHTML = `<strong>${count}</strong> item(s) are out of stock and need restocking.`;
      alert.style.display = 'flex';
    }
  } else {
    const alert = document.getElementById('outOfStockAlert');
    if (alert) alert.style.display = 'none';
  }
  
  // Render expired subscriptions alert
  if (dashboardData.expiredSubscriptions && dashboardData.expiredSubscriptions.length > 0) {
    hasAlerts = true;
    const alert = document.getElementById('expiredSubscriptionsAlert');
    const message = document.getElementById('expiredSubscriptionsMessage');
    if (alert && message) {
      const items = dashboardData.expiredSubscriptions.slice(0, 3).map(sub => 
        `${sub.name} (${sub.daysOverdue} days overdue)`
      ).join(', ');
      const remaining = dashboardData.expiredSubscriptions.length > 3 ? 
        ` and ${dashboardData.expiredSubscriptions.length - 3} more` : '';
      message.innerHTML = `${items}${remaining}`;
      alert.style.display = 'flex';
    }
  } else {
    const alert = document.getElementById('expiredSubscriptionsAlert');
    if (alert) alert.style.display = 'none';
  }
  
  // Render expiring subscriptions alert
  if (dashboardData.expiringSubscriptions && dashboardData.expiringSubscriptions.length > 0) {
    hasAlerts = true;
    const alert = document.getElementById('expiringSubscriptionsAlert');
    const message = document.getElementById('expiringSubscriptionsMessage');
    if (alert && message) {
      const items = dashboardData.expiringSubscriptions.slice(0, 3).map(sub => 
        `${sub.name} (expires in ${sub.daysUntilExpiry} days)`
      ).join(', ');
      const remaining = dashboardData.expiringSubscriptions.length > 3 ? 
        ` and ${dashboardData.expiringSubscriptions.length - 3} more` : '';
      message.innerHTML = `${items}${remaining}`;
      alert.style.display = 'flex';
    }
  } else {
    const alert = document.getElementById('expiringSubscriptionsAlert');
    if (alert) alert.style.display = 'none';
  }
  
  // Render due payments alert
  if (dashboardData.duePayments && dashboardData.duePayments.length > 0) {
    hasAlerts = true;
    const alert = document.getElementById('duePaymentsAlert');
    const message = document.getElementById('duePaymentsMessage');
    if (alert && message) {
      const items = dashboardData.duePayments.slice(0, 3).map(sub => 
        `${sub.name} (GH₵ ${formatCurrency(sub.amountDue)} due)`
      ).join(', ');
      const remaining = dashboardData.duePayments.length > 3 ? 
        ` and ${dashboardData.duePayments.length - 3} more` : '';
      message.innerHTML = `${items}${remaining}`;
      alert.style.display = 'flex';
    }
  } else {
    const alert = document.getElementById('duePaymentsAlert');
    if (alert) alert.style.display = 'none';
  }
  
  // Show "no alerts" message if there are no alerts
  const noAlertsDiv = document.getElementById('noAlerts');
  if (noAlertsDiv) {
    noAlertsDiv.style.display = hasAlerts ? 'none' : 'block';
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

function formatDateForInput(date) {
  if (!date) return '';
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Expose global functions
window.initDashboard = initDashboard;
window.loadDashboardData = loadDashboardData;
window.loadDashboardContent = loadDashboardContent;
window.cleanupDashboard = cleanupDashboard;
window.formatCurrency = formatCurrency;
window.formatDateForInput = formatDateForInput;
