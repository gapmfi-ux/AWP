
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

// ============================================
// DASHBOARD INITIALIZATION
// ============================================

function initDashboard() {
  console.log('Initializing Dashboard');
  loadDashboardData();
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
    
    const today = new Date().toISOString().split('T')[0];
    console.log('Today date string:', today);
    
    // Get all investments to check maturity dates
    API.getAllInvestments()
      .then(function(response) {
        if (response && Array.isArray(response)) {
          console.log('Total investments:', response.length);
          
          const todayDate = new Date(today);
          todayDate.setHours(0, 0, 0, 0);
          
          const fiveDaysLater = new Date(today);
          fiveDaysLater.setDate(fiveDaysLater.getDate() + 5);
          fiveDaysLater.setHours(23, 59, 59, 999);
          
          console.log('Today:', todayDate);
          console.log('5 days later:', fiveDaysLater);
          
          // Matured investments (maturity date < today)
          dashboardData.maturedInvestments = response.filter(inv => {
            const maturityDate = new Date(inv.maturityDate);
            maturityDate.setHours(0, 0, 0, 0);
            const isMature = maturityDate < todayDate;
            console.log('Investment ' + inv.investmentCode + ': maturityDate=' + maturityDate + ', isMature=' + isMature);
            return isMature;
          });
          
          // Near maturity investments (maturity date is 1 to 5 days from today)
          dashboardData.nearMaturityInvestments = response.filter(inv => {
            const maturityDate = new Date(inv.maturityDate);
            maturityDate.setHours(0, 0, 0, 0);
            const isNearMaturity = maturityDate > todayDate && maturityDate <= fiveDaysLater;
            if (isNearMaturity) {
              console.log('NEAR MATURITY - Investment ' + inv.investmentCode + ': maturityDate=' + maturityDate);
            }
            return isNearMaturity;
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
            item.quantity > 0 && item.quantity <= 10
          );
          dashboardData.outOfStockItems = response.filter(item => 
            item.quantity === 0
          );
          
          console.log('Low stock items:', dashboardData.lowStockItems);
          console.log('Out of stock items:', dashboardData.outOfStockItems);
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
      // Try loading from localStorage
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
  
  console.log('Expired subscriptions:', dashboardData.expiredSubscriptions);
  console.log('Expiring subscriptions:', dashboardData.expiringSubscriptions);
  console.log('Due payments:', dashboardData.duePayments);
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
      message.innerHTML = `<strong>${count}</strong> investment(s) have matured and are ready for action.`;
      alert.style.display = 'flex';
    }
  }
  
  // Render near maturity investments
  if (dashboardData.nearMaturityInvestments && dashboardData.nearMaturityInvestments.length > 0) {
    hasAlerts = true;
    const alert = document.getElementById('nearMaturityAlert');
    const message = document.getElementById('nearMaturityMessage');
    if (alert && message) {
      const count = dashboardData.nearMaturityInvestments.length;
      message.innerHTML = `<strong>${count}</strong> investment(s) will mature within the next 5 days.`;
      alert.style.display = 'flex';
    }
  }
  
  // Render low stock alert
  if (dashboardData.lowStockItems && dashboardData.lowStockItems.length > 0) {
    hasAlerts = true;
    const alert = document.getElementById('lowStockAlert');
    const message = document.getElementById('lowStockMessage');
    if (alert && message) {
      const items = dashboardData.lowStockItems.slice(0, 3).map(item => 
        `${item.name || item.code} (${item.quantity} left)`
      ).join(', ');
      const remaining = dashboardData.lowStockItems.length > 3 ? 
        ` and ${dashboardData.lowStockItems.length - 3} more` : '';
      message.innerHTML = `${items}${remaining}`;
      alert.style.display = 'flex';
    }
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

function formatCurrency(val) {
  if (val === null || val === undefined || val === '') return '0.00';
  const numValue = parseFloat(val);
  if (isNaN(numValue)) return '0.00';
  return numValue.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function loadModule(moduleName) {
  console.log('Loading module:', moduleName);
  // This function should be called from your main app to load the specified module
  if (typeof window.loadModule === 'function') {
    window.loadModule(moduleName);
  }
}

// Expose global functions
window.initDashboard = initDashboard;
window.loadDashboardData = loadDashboardData;
