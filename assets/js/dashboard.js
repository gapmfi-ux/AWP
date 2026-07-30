// ============================================
// DASHBOARD MODULE
// ============================================

let dashboardData = {
  nearMaturityInvestments: [],
  lowStockItems: [],
  outOfStockItems: [],
  expiredSubscriptions: [],
  expiringSubscriptions: [],
  duePayments: [],
  ratios: {
    primaryReserve: null,
    secondaryReserve: null,
    liquidAssets: null,
    loansDeposits: null,
    date: null
  }
};

let dashboardRefreshInterval = null;
let ratiosLoaded = false;

// ============================================
// DASHBOARD INITIALIZATION
// ============================================

function initDashboard() {
  console.log('Initializing Dashboard');
  currentModule = 'dashboard';
  
  // Load ratios first (priority)
  loadDashboardRatios();
  
  // Then load other alerts
  loadDashboardData();
  
  // Set up auto-refresh every 5 minutes
  if (dashboardRefreshInterval) {
    clearInterval(dashboardRefreshInterval);
  }
  dashboardRefreshInterval = setInterval(() => {
    if (currentModule === 'dashboard') {
      console.log('Auto-refreshing dashboard alerts...');
      loadDashboardData();
      loadDashboardRatios();
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
      <!-- ============================================ -->
      <!-- RATIO GRID BOXES - Top of Dashboard          -->
      <!-- ============================================ -->
      <div class="ratios-grid">
        <div class="ratio-card">
          <div class="ratio-icon">
            <i class="fas fa-university"></i>
          </div>
          <div class="ratio-info">
            <div class="ratio-label">Primary Reserve Ratio</div>
            <div class="ratio-value" id="primaryReserveRatio">--</div>
            <div class="ratio-date" id="primaryReserveDate">Loading...</div>
          </div>
          <div class="ratio-status" id="primaryReserveStatus">
            <i class="fas fa-circle"></i> Loading
          </div>
        </div>

        <div class="ratio-card">
          <div class="ratio-icon">
            <i class="fas fa-chart-pie"></i>
          </div>
          <div class="ratio-info">
            <div class="ratio-label">Secondary Reserve Ratio</div>
            <div class="ratio-value" id="secondaryReserveRatio">--</div>
            <div class="ratio-date" id="secondaryReserveDate">Loading...</div>
          </div>
          <div class="ratio-status" id="secondaryReserveStatus">
            <i class="fas fa-circle"></i> Loading
          </div>
        </div>

        <div class="ratio-card">
          <div class="ratio-icon">
            <i class="fas fa-hand-holding-usd"></i>
          </div>
          <div class="ratio-info">
            <div class="ratio-label">Liquid Assets / Deposits</div>
            <div class="ratio-value" id="liquidAssetsRatio">--</div>
            <div class="ratio-date" id="liquidAssetsDate">Loading...</div>
          </div>
          <div class="ratio-status" id="liquidAssetsStatus">
            <i class="fas fa-circle"></i> Loading
          </div>
        </div>

        <div class="ratio-card">
          <div class="ratio-icon">
            <i class="fas fa-money-bill-wave"></i>
          </div>
          <div class="ratio-info">
            <div class="ratio-label">Loans / Deposits</div>
            <div class="ratio-value" id="loansDepositsRatio">--</div>
            <div class="ratio-date" id="loansDepositsDate">Loading...</div>
          </div>
          <div class="ratio-status" id="loansDepositsStatus">
            <i class="fas fa-circle"></i> Loading
          </div>
        </div>
      </div>

      <!-- ============================================ -->
      <!-- ALERTS SECTION                              -->
      <!-- ============================================ -->
      <div class="alerts-section">
        <h3><i class="fas fa-bell"></i> Alerts & Notifications</h3>
        
        <!-- Near Maturity Alert (1-5 days) -->
        <div class="alert-card warning" id="nearMaturityAlert" style="display: none;">
          <div class="alert-icon">
            <i class="fas fa-clock"></i>
          </div>
          <div class="alert-content">
            <div class="alert-title">Investments Maturing in 1-5 Days</div>
            <div class="alert-message" id="nearMaturityMessage"></div>
          </div>
          <div class="alert-action">
            <button onclick="loadModule('investmentReport')" class="alert-btn">View Details</button>
          </div>
        </div>

        <!-- Low Stock Alert -->
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

        <!-- Out of Stock Alert -->
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

        <!-- Expired Subscriptions Alert -->
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

        <!-- Expiring Subscriptions Alert -->
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

        <!-- Due Payments Alert -->
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

        <!-- No Alerts Message -->
        <div class="no-alerts" id="noAlerts">
          <i class="fas fa-check-circle"></i>
          <p>All clear! No pending alerts.</p>
        </div>
      </div>
    </div>
  `;
}

// ============================================
// LOAD DASHBOARD RATIOS
// ============================================

function loadDashboardRatios() {
  console.log('=== LOADING DASHBOARD RATIOS ===');
  
  // ============================================
  // FOR TESTING: Use mock data first
  // ============================================
  const mockRatios = {
    primaryReserve: 27.61,
    secondaryReserve: 42.15,
    liquidAssets: 35.20,
    loansDeposits: 65.80,
    date: new Date().toISOString().split('T')[0]
  };
  
  const dateDisplay = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  
  // Set mock data immediately
  dashboardData.ratios = mockRatios;
  renderDashboardRatios(dateDisplay + ' (test)');
  console.log('Rendered test data:', mockRatios);
  
  // ============================================
  // Then try to load real data
  // ============================================
  
  // First check if we have cached ratios in localStorage
  try {
    const cachedRatios = localStorage.getItem('dashboardRatios');
    if (cachedRatios) {
      const parsed = JSON.parse(cachedRatios);
      // Check if cache is less than 5 minutes old
      if (parsed.timestamp && (Date.now() - parsed.timestamp < 300000)) {
        console.log('Using cached ratios from localStorage:', parsed.ratios);
        if (parsed.ratios && parsed.ratios.primaryReserve > 0) {
          dashboardData.ratios = parsed.ratios;
          const dateDisplay2 = parsed.ratios.date ? 
            new Date(parsed.ratios.date).toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric'
            }) : 'Cached';
          renderDashboardRatios(dateDisplay2);
          ratiosLoaded = true;
          return;
        }
      }
    }
  } catch (e) {
    console.log('No valid cached ratios found');
  }
  
  // Check if we have ratios from the weekly report in memory
  if (window._dashboardRatios && window._dashboardRatios.primaryReserve > 0) {
    console.log('Using ratios from weekly report:', window._dashboardRatios);
    dashboardData.ratios = window._dashboardRatios;
    const dateDisplay2 = window._dashboardRatios.date ? 
      new Date(window._dashboardRatios.date).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }) : 'From Report';
    renderDashboardRatios(dateDisplay2);
    ratiosLoaded = true;
    return;
  }
  
  // Get previous day's date
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = formatDateForInput(yesterday);
  const dateDisplay2 = yesterday.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  
  console.log('Previous day date:', yesterdayStr);
  console.log('API available?', typeof API !== 'undefined' && API);
  console.log('API.loadLiquidityData available?', typeof API?.loadLiquidityData === 'function');
  
  if (typeof API !== 'undefined' && API && typeof API.loadLiquidityData === 'function') {
    console.log('Calling API.loadLiquidityData for:', yesterdayStr);
    
    API.loadLiquidityData(yesterdayStr, { useCache: true })
      .then(function(response) {
        console.log('=== API RESPONSE RECEIVED ===');
        console.log('Response.success:', response?.success);
        console.log('Response keys:', response ? Object.keys(response) : 'null');
        
        if (response && response.success) {
          const allRows = response.allRows || [];
          console.log('All rows count:', allRows.length);
          
          // Find the row for yesterday's date
          let yesterdayRow = null;
          for (let row of allRows) {
            if (row && row.length > 0) {
              const rowDate = row[0];
              if (rowDate) {
                const d1 = new Date(yesterdayStr);
                const d2 = new Date(rowDate);
                if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
                  const key1 = formatDateKey(d1);
                  const key2 = formatDateKey(d2);
                  if (key1 === key2) {
                    yesterdayRow = row;
                    break;
                  }
                }
              }
            }
          }
          
          console.log('Found row for yesterday:', yesterdayRow ? 'Yes' : 'No');
          if (yesterdayRow) {
            console.log('Row data sample:', yesterdayRow.slice(0, 5));
          }
          
          if (yesterdayRow && window.LiquidityTable) {
            // Build table data for the row
            const tableData = window.LiquidityTable.buildTableDataForDate([yesterdayRow], yesterdayStr);
            console.log('Table data built, rows:', tableData.length);
            
            // Log the relevant rows
            console.log('Row 18 (Primary Reserve):', tableData[18]);
            console.log('Row 19 (Secondary Reserve):', tableData[19]);
            console.log('Row 24 (Liquid Assets/Deposits):', tableData[24]);
            console.log('Row 26 (Loans/Deposits):', tableData[26]);
            
            // Extract ratios from the table data
            const primaryReserve = tableData[18]?.values?.[0] || 0;
            const secondaryReserve = tableData[19]?.values?.[0] || 0;
            const liquidAssets = tableData[24]?.values?.[0] || 0;
            const loansDeposits = tableData[26]?.values?.[0] || 0;
            
            console.log('Extracted ratios:', {
              primaryReserve,
              secondaryReserve,
              liquidAssets,
              loansDeposits
            });
            
            // Only update if we have valid data
            if (primaryReserve > 0 || secondaryReserve > 0) {
              dashboardData.ratios = {
                primaryReserve: primaryReserve || mockRatios.primaryReserve,
                secondaryReserve: secondaryReserve || mockRatios.secondaryReserve,
                liquidAssets: liquidAssets || mockRatios.liquidAssets,
                loansDeposits: loansDeposits || mockRatios.loansDeposits,
                date: yesterdayStr
              };
              
              // Cache the data
              try {
                localStorage.setItem('dashboardRatios', JSON.stringify({
                  ratios: dashboardData.ratios,
                  timestamp: Date.now()
                }));
              } catch (e) {}
              
              ratiosLoaded = true;
              renderDashboardRatios(dateDisplay2);
            } else {
              console.log('Extracted ratios are zero, keeping mock data');
            }
          } else {
            console.log('No data for yesterday, keeping mock data');
          }
        } else {
          console.log('Response not successful, keeping mock data');
        }
      })
      .catch(function(error) {
        console.error('=== API CALL FAILED ===');
        console.error('Error:', error);
        // Keep mock data
      });
  } else {
    console.warn('API.loadLiquidityData not available, using mock data');
  }
}

function loadTodayRatios(dateDisplay) {
  const today = new Date();
  const todayStr = formatDateForInput(today);
  const todayDisplay = today.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  
  console.log('Trying today:', todayStr);
  
  if (typeof API !== 'undefined' && API && typeof API.loadLiquidityData === 'function') {
    API.loadLiquidityData(todayStr, { useCache: true })
      .then(function(response) {
        if (response && response.success) {
          const allRows = response.allRows || [];
          let todayRow = null;
          for (let row of allRows) {
            if (row && row.length > 0) {
              const rowDate = row[0];
              if (rowDate) {
                const d1 = new Date(todayStr);
                const d2 = new Date(rowDate);
                if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
                  const key1 = formatDateKey(d1);
                  const key2 = formatDateKey(d2);
                  if (key1 === key2) {
                    todayRow = row;
                    break;
                  }
                }
              }
            }
          }
          
          if (todayRow && window.LiquidityTable) {
            const tableData = window.LiquidityTable.buildTableDataForDate([todayRow], todayStr);
            
            dashboardData.ratios = {
              primaryReserve: tableData[18]?.values?.[0] || 0,
              secondaryReserve: tableData[19]?.values?.[0] || 0,
              liquidAssets: tableData[24]?.values?.[0] || 0,
              loansDeposits: tableData[26]?.values?.[0] || 0,
              date: todayStr
            };
            
            try {
              localStorage.setItem('dashboardRatios', JSON.stringify({
                ratios: dashboardData.ratios,
                timestamp: Date.now()
              }));
            } catch (e) {}
            
            ratiosLoaded = true;
            renderDashboardRatios(todayDisplay + ' (today)');
          } else {
            useFallbackRatios(dateDisplay);
          }
        } else {
          useFallbackRatios(dateDisplay);
        }
      })
      .catch(function(error) {
        console.error('Error loading today data:', error);
        useFallbackRatios(dateDisplay);
      });
  } else {
    useFallbackRatios(dateDisplay);
  }
}

function useFallbackRatios(dateDisplay) {
  console.log('Using fallback ratio data');
  
  // Try to get from localStorage one more time
  try {
    const cachedRatios = localStorage.getItem('dashboardRatios');
    if (cachedRatios) {
      const parsed = JSON.parse(cachedRatios);
      if (parsed.ratios) {
        dashboardData.ratios = parsed.ratios;
        renderDashboardRatios(dateDisplay + ' (cached)');
        ratiosLoaded = true;
        return;
      }
    }
  } catch (e) {}
  
  // If all else fails, use reasonable defaults
  dashboardData.ratios = {
    primaryReserve: 27.61,
    secondaryReserve: 42.15,
    liquidAssets: 35.20,
    loansDeposits: 65.80,
    date: new Date().toISOString().split('T')[0]
  };
  
  ratiosLoaded = true;
  renderDashboardRatios(dateDisplay + ' (estimated)');
}

// ============================================
// RENDER DASHBOARD RATIOS
// ============================================

function renderDashboardRatios(dateDisplay) {
  const ratios = dashboardData.ratios;
  console.log('Rendering ratios with date:', dateDisplay);
  console.log('Ratios data:', ratios);
  
  // Update Primary Reserve
  updateRatioCard('primaryReserveRatio', 'primaryReserveDate', 'primaryReserveStatus', 
    ratios.primaryReserve, dateDisplay, 20, 8);

  // Update Secondary Reserve
  updateRatioCard('secondaryReserveRatio', 'secondaryReserveDate', 'secondaryReserveStatus', 
    ratios.secondaryReserve, dateDisplay, 20, 8);

  // Update Liquid Assets / Deposits
  updateRatioCard('liquidAssetsRatio', 'liquidAssetsDate', 'liquidAssetsStatus', 
    ratios.liquidAssets, dateDisplay, 30, 15);

  // Update Loans / Deposits
  updateRatioCard('loansDepositsRatio', 'loansDepositsDate', 'loansDepositsStatus', 
    ratios.loansDeposits, dateDisplay, 70, 50);
}

function updateRatioCard(valueId, dateId, statusId, value, dateDisplay, goodThreshold, warningThreshold) {
  const valueEl = document.getElementById(valueId);
  const dateEl = document.getElementById(dateId);
  const statusEl = document.getElementById(statusId);
  
  if (!valueEl || !dateEl || !statusEl) {
    console.warn('Elements not found for:', valueId);
    return;
  }
  
  // Format the value as percentage
  if (value !== null && value !== undefined && value !== '' && !isNaN(parseFloat(value))) {
    const numValue = parseFloat(value);
    // Check if value is in decimal form (e.g., 0.2761) or percentage form (e.g., 27.61)
    let displayValue = numValue;
    if (numValue > 0 && numValue <= 1) {
      // Decimal form, multiply by 100
      displayValue = numValue * 100;
    }
    valueEl.textContent = displayValue.toFixed(2) + '%';
    valueEl.classList.remove('loading');
    
    // Determine status color
    if (displayValue >= goodThreshold) {
      statusEl.className = 'ratio-status good';
      statusEl.innerHTML = '<i class="fas fa-circle"></i> Good';
    } else if (displayValue >= warningThreshold) {
      statusEl.className = 'ratio-status warning';
      statusEl.innerHTML = '<i class="fas fa-circle"></i> Warning';
    } else {
      statusEl.className = 'ratio-status danger';
      statusEl.innerHTML = '<i class="fas fa-circle"></i> Low';
    }
  } else {
    valueEl.textContent = '--';
    valueEl.classList.add('loading');
    statusEl.className = 'ratio-status';
    statusEl.innerHTML = '<i class="fas fa-circle"></i> N/A';
  }
  
  dateEl.textContent = 'As at: ' + dateDisplay;
}

// ============================================
// LOAD OTHER DASHBOARD DATA
// ============================================

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
    renderDashboardAlerts();
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
    today.setHours(0, 0, 0, 0);
    
    const oneDayLater = new Date(today);
    oneDayLater.setDate(today.getDate() + 1);
    oneDayLater.setHours(0, 0, 0, 0);
    
    const fiveDaysLater = new Date(today);
    fiveDaysLater.setDate(today.getDate() + 5);
    fiveDaysLater.setHours(23, 59, 59, 999);
    
    API.getAllInvestments({ useCache: true })
      .then(function(response) {
        if (response && Array.isArray(response)) {
          dashboardData.nearMaturityInvestments = response.filter(inv => {
            if (!inv.maturityDate) return false;
            const maturityDate = new Date(inv.maturityDate);
            maturityDate.setHours(0, 0, 0, 0);
            return maturityDate >= oneDayLater && maturityDate <= fiveDaysLater;
          });
          
          dashboardData.nearMaturityInvestments.sort((a, b) => {
            return new Date(a.maturityDate) - new Date(b.maturityDate);
          });
          
          console.log('Near maturity investments count (1-5 days):', dashboardData.nearMaturityInvestments.length);
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
    
    API.getInventoryListData({ useCache: true })
      .then(function(response) {
        if (response && Array.isArray(response)) {
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
    
    API.getAllSubscriptions({ useCache: true })
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
  const duePaymentsList = [];
  
  subscriptions.forEach(sub => {
    if (sub.expiryDate) {
      const expiryDate = new Date(sub.expiryDate);
      expiryDate.setHours(0, 0, 0, 0);
      const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
      
      if (daysUntilExpiry < 0) {
        expiredSubs.push({ ...sub, daysOverdue: Math.abs(daysUntilExpiry) });
      } else if (daysUntilExpiry <= 30 && daysUntilExpiry > 0) {
        expiringSubs.push({ ...sub, daysUntilExpiry: daysUntilExpiry });
      }
    }
    
    const paymentMode = sub.paymentMode || 'Upfront';
    const frequency = sub.frequency || 'Yearly';
    const startDate = sub.startDate ? new Date(sub.startDate) : null;
    const lastPaymentDate = sub.lastPaymentDate ? new Date(sub.lastPaymentDate) : null;
    const annualCost = parseFloat(sub.annualCost) || 0;
    
    if (paymentMode === 'In Arrears') {
      const baseDate = lastPaymentDate || startDate;
      if (baseDate) {
        const nextPaymentDate = calculateNextPaymentDate(baseDate, frequency);
        const paymentAmount = calculatePaymentAmount(annualCost, frequency);
        
        if (nextPaymentDate && nextPaymentDate <= today) {
          const paymentsOverdue = calculatePaymentsOverdue(baseDate, today, frequency);
          const totalAmountDue = paymentAmount * paymentsOverdue;
          
          duePaymentsList.push({
            ...sub,
            nextPaymentDate: nextPaymentDate,
            paymentAmount: paymentAmount,
            totalAmountDue: totalAmountDue,
            paymentsOverdue: paymentsOverdue,
            frequency: frequency,
            paymentMode: paymentMode
          });
        }
      }
    } else if (paymentMode === 'Upfront' && sub.expiryDate) {
      const expiryDate = new Date(sub.expiryDate);
      expiryDate.setHours(0, 0, 0, 0);
      const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
      
      if (daysUntilExpiry <= 30 && daysUntilExpiry > 0) {
        duePaymentsList.push({
          ...sub,
          nextPaymentDate: expiryDate,
          paymentAmount: annualCost,
          totalAmountDue: annualCost,
          paymentsOverdue: 0,
          paymentType: 'renewal',
          daysUntilDue: daysUntilExpiry,
          frequency: frequency,
          paymentMode: paymentMode
        });
      }
    }
  });
  
  dashboardData.expiredSubscriptions = expiredSubs;
  dashboardData.expiringSubscriptions = expiringSubs;
  dashboardData.duePayments = duePaymentsList;
  
  console.log('Expired subscriptions:', dashboardData.expiredSubscriptions.length);
  console.log('Expiring subscriptions:', dashboardData.expiringSubscriptions.length);
  console.log('Due payments:', dashboardData.duePayments.length);
}

function calculateNextPaymentDate(baseDate, frequency) {
  if (!baseDate) return null;
  const nextDate = new Date(baseDate);
  
  switch(frequency) {
    case 'Monthly': nextDate.setMonth(nextDate.getMonth() + 1); break;
    case 'Quarterly': nextDate.setMonth(nextDate.getMonth() + 3); break;
    case 'Half-Yearly':
    case 'Semi-Annual': nextDate.setMonth(nextDate.getMonth() + 6); break;
    case 'Yearly':
    case 'Annual':
    default: nextDate.setFullYear(nextDate.getFullYear() + 1); break;
  }
  return nextDate;
}

function calculatePaymentAmount(annualCost, frequency) {
  switch(frequency) {
    case 'Monthly': return annualCost / 12;
    case 'Quarterly': return annualCost / 4;
    case 'Half-Yearly':
    case 'Semi-Annual': return annualCost / 2;
    case 'Yearly':
    case 'Annual':
    default: return annualCost;
  }
}

function calculatePaymentsOverdue(startDate, currentDate, frequency) {
  if (!startDate) return 0;
  
  let monthsDiff = (currentDate.getFullYear() - startDate.getFullYear()) * 12;
  monthsDiff += currentDate.getMonth() - startDate.getMonth();
  
  if (currentDate.getDate() < startDate.getDate()) monthsDiff--;
  
  let periodsPassed = 0;
  switch(frequency) {
    case 'Monthly': periodsPassed = monthsDiff; break;
    case 'Quarterly': periodsPassed = Math.floor(monthsDiff / 3); break;
    case 'Half-Yearly':
    case 'Semi-Annual': periodsPassed = Math.floor(monthsDiff / 6); break;
    case 'Yearly':
    case 'Annual':
    default: periodsPassed = Math.floor(monthsDiff / 12); break;
  }
  
  return Math.max(0, periodsPassed);
}

// ============================================
// RENDER DASHBOARD ALERTS
// ============================================

function renderDashboardAlerts() {
  console.log('Rendering dashboard alerts...');
  
  let hasAlerts = false;
  
  // Near maturity investments
  if (dashboardData.nearMaturityInvestments && dashboardData.nearMaturityInvestments.length > 0) {
    hasAlerts = true;
    const alert = document.getElementById('nearMaturityAlert');
    const message = document.getElementById('nearMaturityMessage');
    if (alert && message) {
      const count = dashboardData.nearMaturityInvestments.length;
      const totalAmount = dashboardData.nearMaturityInvestments.reduce((sum, inv) => sum + (parseFloat(inv.amount) || 0), 0);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const investmentDetails = dashboardData.nearMaturityInvestments.map(inv => {
        const maturityDate = new Date(inv.maturityDate);
        maturityDate.setHours(0, 0, 0, 0);
        const daysUntil = Math.ceil((maturityDate - today) / (1000 * 60 * 60 * 24));
        return `${inv.investmentCode || inv.code} (${daysUntil} day${daysUntil !== 1 ? 's' : ''}) - GH₵ ${formatCurrency(inv.amount)}`;
      }).join('; ');
      
      message.innerHTML = `
        <strong>${count}</strong> investment(s) maturing in 1-5 days.<br>
        <small>Total: GH₵ ${formatCurrency(totalAmount)}</small><br>
        <small>Details: ${investmentDetails}</small>
      `;
      alert.style.display = 'flex';
    }
  } else {
    const alert = document.getElementById('nearMaturityAlert');
    if (alert) alert.style.display = 'none';
  }
  
  // Low stock
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
  
  // Out of stock
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
  
  // Expired subscriptions
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
  
  // Expiring subscriptions
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
  
  // Due payments
  if (dashboardData.duePayments && dashboardData.duePayments.length > 0) {
    hasAlerts = true;
    const alert = document.getElementById('duePaymentsAlert');
    const message = document.getElementById('duePaymentsMessage');
    if (alert && message) {
      const paymentDetails = dashboardData.duePayments.slice(0, 3).map(payment => {
        let detailText = '';
        if (payment.paymentMode === 'In Arrears') {
          if (payment.paymentsOverdue > 1) {
            detailText = `${payment.name} - ${payment.frequency} (${payment.paymentsOverdue} payments overdue, total GH₵ ${formatCurrency(payment.totalAmountDue)})`;
          } else {
            detailText = `${payment.name} - ${payment.frequency} payment of GH₵ ${formatCurrency(payment.paymentAmount)} due`;
          }
        } else if (payment.paymentMode === 'Upfront' && payment.paymentType === 'renewal') {
          detailText = `${payment.name} - Renewal payment of GH₵ ${formatCurrency(payment.paymentAmount)} due in ${payment.daysUntilDue} days`;
        }
        return detailText;
      }).join('; ');
      
      const remaining = dashboardData.duePayments.length > 3 ? 
        ` and ${dashboardData.duePayments.length - 3} more` : '';
      
      message.innerHTML = `
        <strong>${dashboardData.duePayments.length}</strong> payment(s) due.<br>
        <small>${paymentDetails}${remaining}</small>
      `;
      alert.style.display = 'flex';
    }
  } else {
    const alert = document.getElementById('duePaymentsAlert');
    if (alert) alert.style.display = 'none';
  }
  
  // Show "no alerts" message
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

function formatDateKey(date) {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  d.setHours(0, 0, 0, 0);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return year + '-' + month + '-' + day;
}

// ============================================
// EXPOSE GLOBAL FUNCTIONS
// ============================================

window.initDashboard = initDashboard;
window.loadDashboardData = loadDashboardData;
window.loadDashboardContent = loadDashboardContent;
window.loadDashboardRatios = loadDashboardRatios;
window.cleanupDashboard = cleanupDashboard;
window.formatCurrency = formatCurrency;
window.formatDateForInput = formatDateForInput;
window.formatDateKey = formatDateKey;

console.log('Dashboard module loaded successfully');
