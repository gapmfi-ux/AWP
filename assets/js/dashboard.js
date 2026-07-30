// ============================================
// DASHBOARD MODULE
// ============================================

let dashboardData = {
  nearMaturityInvestments: [],
  lowStockItems: [],
  outOfStockItems: [],
  expiredSubscriptions: [],
  expiringSubscriptions: [],
  duePayments: [],  // Now includes recurring payments based on frequency
  ratios: {
    primaryReserve: null,
    secondaryReserve: null,
    liquidAssets: null,
    loansDeposits: null,
    date: null
  }
};

let dashboardRefreshInterval = null;

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
  
  // Set up auto-refresh every 5 minutes (300000 ms)
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
            <i class="fas fa-circle"></i>
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
            <i class="fas fa-circle"></i>
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
            <i class="fas fa-circle"></i>
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
            <i class="fas fa-circle"></i>
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

        <!-- Expiring Subscriptions Alert (based on expiry date) -->
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

        <!-- Due Payments Alert (based on payment mode and frequency) -->
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
// LOAD DASHBOARD RATIOS (Previous Day)
// ============================================

function loadDashboardRatios() {
  console.log('Loading dashboard ratios for previous day...');
  
  // Get previous day's date
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = formatDateForInput(yesterday);
  
  // Format date for display
  const dateDisplay = yesterday.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  
  // Show loading state
  document.getElementById('primaryReserveDate').textContent = 'Loading...';
  document.getElementById('secondaryReserveDate').textContent = 'Loading...';
  document.getElementById('liquidAssetsDate').textContent = 'Loading...';
  document.getElementById('loansDepositsDate').textContent = 'Loading...';
  
  // Load liquidity data for yesterday
  if (typeof API !== 'undefined' && API) {
    API.loadLiquidityData(yesterdayStr, { useCache: true })
      .then(function(response) {
        if (response && response.success) {
          const allRows = response.allRows || [];
          
          // Find the row for yesterday's date
          let yesterdayRow = null;
          for (let row of allRows) {
            if (row && row.length > 0) {
              const rowDate = row[0];
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
          
          if (yesterdayRow && window.LiquidityTable) {
            // Build table data for the row
            const tableData = window.LiquidityTable.buildTableDataForDate([yesterdayRow], yesterdayStr);
            
            // Extract ratios from the table data
            // Row indices: 
            // 18 = Primary Reserve %
            // 19 = Secondary Reserve %
            // 24 = Total Liquid Assets/Deposits
            // 26 = Loans/Deposits
            // 0 = Total Deposits
            
            const primaryReserveRow = tableData[18];
            const secondaryReserveRow = tableData[19];
            const liquidAssetsRow = tableData[24];
            const loansDepositsRow = tableData[26];
            
            // Get the value from the first column (index 0) since we're looking at a single day
            const primaryReserve = primaryReserveRow?.values?.[0] || 0;
            const secondaryReserve = secondaryReserveRow?.values?.[0] || 0;
            const liquidAssets = liquidAssetsRow?.values?.[0] || 0;
            const loansDeposits = loansDepositsRow?.values?.[0] || 0;
            
            // Update the dashboard
            dashboardData.ratios = {
              primaryReserve: primaryReserve,
              secondaryReserve: secondaryReserve,
              liquidAssets: liquidAssets,
              loansDeposits: loansDeposits,
              date: yesterdayStr
            };
            
            renderDashboardRatios(dateDisplay);
          } else {
            // No data for yesterday, try today
            const today = new Date();
            const todayStr = formatDateForInput(today);
            
            API.loadLiquidityData(todayStr, { useCache: true })
              .then(function(todayResponse) {
                if (todayResponse && todayResponse.success) {
                  const todayRows = todayResponse.allRows || [];
                  let todayRow = null;
                  for (let row of todayRows) {
                    if (row && row.length > 0) {
                      const rowDate = row[0];
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
                  
                  if (todayRow && window.LiquidityTable) {
                    const tableData = window.LiquidityTable.buildTableDataForDate([todayRow], todayStr);
                    
                    const primaryReserveRow = tableData[18];
                    const secondaryReserveRow = tableData[19];
                    const liquidAssetsRow = tableData[24];
                    const loansDepositsRow = tableData[26];
                    
                    dashboardData.ratios = {
                      primaryReserve: primaryReserveRow?.values?.[0] || 0,
                      secondaryReserve: secondaryReserveRow?.values?.[0] || 0,
                      liquidAssets: liquidAssetsRow?.values?.[0] || 0,
                      loansDeposits: loansDepositsRow?.values?.[0] || 0,
                      date: todayStr
                    };
                    
                    const todayDisplay = today.toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    });
                    renderDashboardRatios(todayDisplay + ' (today)');
                  } else {
                    setRatiosAsUnavailable(dateDisplay);
                  }
                } else {
                  setRatiosAsUnavailable(dateDisplay);
                }
              })
              .catch(function() {
                setRatiosAsUnavailable(dateDisplay);
              });
          }
        } else {
          setRatiosAsUnavailable(dateDisplay);
        }
      })
      .catch(function(error) {
        console.error('Error loading ratios:', error);
        setRatiosAsUnavailable(dateDisplay);
      });
  } else {
    setRatiosAsUnavailable(dateDisplay);
  }
}

// ============================================
// RENDER DASHBOARD RATIOS
// ============================================

function renderDashboardRatios(dateDisplay) {
  const ratios = dashboardData.ratios;
  
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
  
  if (!valueEl || !dateEl || !statusEl) return;
  
  // Format the value as percentage
  if (value !== null && value !== undefined && value !== '') {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      valueEl.textContent = numValue.toFixed(2) + '%';
      valueEl.classList.remove('loading');
      
      // Determine status color
      if (numValue >= goodThreshold) {
        statusEl.className = 'ratio-status good';
        statusEl.innerHTML = '<i class="fas fa-circle"></i> Good';
      } else if (numValue >= warningThreshold) {
        statusEl.className = 'ratio-status warning';
        statusEl.innerHTML = '<i class="fas fa-circle"></i> Warning';
      } else {
        statusEl.className = 'ratio-status danger';
        statusEl.innerHTML = '<i class="fas fa-circle"></i> Low';
      }
    } else {
      valueEl.textContent = '--';
      statusEl.className = 'ratio-status';
      statusEl.innerHTML = '<i class="fas fa-circle"></i> N/A';
    }
  } else {
    valueEl.textContent = '--';
    statusEl.className = 'ratio-status';
    statusEl.innerHTML = '<i class="fas fa-circle"></i> N/A';
  }
  
  dateEl.textContent = 'As at: ' + dateDisplay;
}

function setRatiosAsUnavailable(dateDisplay) {
  document.getElementById('primaryReserveRatio').textContent = '--';
  document.getElementById('primaryReserveDate').textContent = 'As at: ' + dateDisplay;
  document.getElementById('primaryReserveStatus').className = 'ratio-status';
  document.getElementById('primaryReserveStatus').innerHTML = '<i class="fas fa-circle"></i> N/A';
  
  document.getElementById('secondaryReserveRatio').textContent = '--';
  document.getElementById('secondaryReserveDate').textContent = 'As at: ' + dateDisplay;
  document.getElementById('secondaryReserveStatus').className = 'ratio-status';
  document.getElementById('secondaryReserveStatus').innerHTML = '<i class="fas fa-circle"></i> N/A';
  
  document.getElementById('liquidAssetsRatio').textContent = '--';
  document.getElementById('liquidAssetsDate').textContent = 'As at: ' + dateDisplay;
  document.getElementById('liquidAssetsStatus').className = 'ratio-status';
  document.getElementById('liquidAssetsStatus').innerHTML = '<i class="fas fa-circle"></i> N/A';
  
  document.getElementById('loansDepositsRatio').textContent = '--';
  document.getElementById('loansDepositsDate').textContent = 'As at: ' + dateDisplay;
  document.getElementById('loansDepositsStatus').className = 'ratio-status';
  document.getElementById('loansDepositsStatus').innerHTML = '<i class="fas fa-circle"></i> N/A';
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
    renderDashboardAlerts(); // Still render with whatever data we have
  });
}

// ============================================
// INVESTMENT ALERTS - Only maturing within 1-5 days
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
    
    // Get date 1 day from now (tomorrow)
    const oneDayLater = new Date(today);
    oneDayLater.setDate(today.getDate() + 1);
    oneDayLater.setHours(0, 0, 0, 0);
    
    // Get date 5 days from now
    const fiveDaysLater = new Date(today);
    fiveDaysLater.setDate(today.getDate() + 5);
    fiveDaysLater.setHours(23, 59, 59, 999);
    
    // Get all investments to check maturity dates
    API.getAllInvestments()
      .then(function(response) {
        if (response && Array.isArray(response)) {
          // Only get investments maturing within 1-5 days (excluding today)
          dashboardData.nearMaturityInvestments = response.filter(inv => {
            if (!inv.maturityDate) return false;
            const maturityDate = new Date(inv.maturityDate);
            maturityDate.setHours(0, 0, 0, 0);
            
            // Check if maturity date is between tomorrow and 5 days from now
            return maturityDate >= oneDayLater && maturityDate <= fiveDaysLater;
          });
          
          // Sort by maturity date (soonest first)
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
  const duePaymentsList = [];
  
  subscriptions.forEach(sub => {
    // Process expiry-based alerts
    if (sub.expiryDate) {
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
    }
    
    // Process payment due alerts based on payment mode and frequency
    const paymentMode = sub.paymentMode || 'Upfront';
    const frequency = sub.frequency || 'Yearly';
    const startDate = sub.startDate ? new Date(sub.startDate) : null;
    const lastPaymentDate = sub.lastPaymentDate ? new Date(sub.lastPaymentDate) : null;
    const annualCost = parseFloat(sub.annualCost) || 0;
    const amountPaid = parseFloat(sub.amountPaid) || 0;
    
    // Calculate next payment due date based on payment mode and frequency
    let nextPaymentDate = null;
    let paymentAmount = 0;
    let isPaymentDue = false;
    
    if (paymentMode === 'In Arrears') {
      // For In Arrears, payments are due after service period
      // Calculate based on start date or last payment date
      const baseDate = lastPaymentDate || startDate;
      
      if (baseDate) {
        nextPaymentDate = calculateNextPaymentDate(baseDate, frequency);
        paymentAmount = calculatePaymentAmount(annualCost, frequency);
        
        // Check if payment is due (today or overdue)
        if (nextPaymentDate && nextPaymentDate <= today) {
          // Calculate how many payments are overdue
          const paymentsOverdue = calculatePaymentsOverdue(baseDate, today, frequency);
          const totalAmountDue = paymentAmount * paymentsOverdue;
          
          isPaymentDue = true;
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
      // For Upfront, check if renewal payment is due (30 days before expiry)
      const expiryDate = new Date(sub.expiryDate);
      expiryDate.setHours(0, 0, 0, 0);
      const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
      
      // Alert for upcoming renewal payment (30 days before expiry)
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

// Helper function to calculate next payment date based on frequency
function calculateNextPaymentDate(baseDate, frequency) {
  if (!baseDate) return null;
  
  const nextDate = new Date(baseDate);
  
  switch(frequency) {
    case 'Monthly':
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    case 'Quarterly':
      nextDate.setMonth(nextDate.getMonth() + 3);
      break;
    case 'Half-Yearly':
    case 'Semi-Annual':
      nextDate.setMonth(nextDate.getMonth() + 6);
      break;
    case 'Yearly':
    case 'Annual':
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;
    default:
      nextDate.setFullYear(nextDate.getFullYear() + 1);
  }
  
  return nextDate;
}

// Helper function to calculate payment amount based on frequency
function calculatePaymentAmount(annualCost, frequency) {
  switch(frequency) {
    case 'Monthly':
      return annualCost / 12;
    case 'Quarterly':
      return annualCost / 4;
    case 'Half-Yearly':
    case 'Semi-Annual':
      return annualCost / 2;
    case 'Yearly':
    case 'Annual':
    default:
      return annualCost;
  }
}

// Helper function to calculate how many payments are overdue
function calculatePaymentsOverdue(startDate, currentDate, frequency) {
  if (!startDate) return 0;
  
  let monthsDiff = (currentDate.getFullYear() - startDate.getFullYear()) * 12;
  monthsDiff += currentDate.getMonth() - startDate.getMonth();
  
  // Adjust for day of month
  if (currentDate.getDate() < startDate.getDate()) {
    monthsDiff--;
  }
  
  let periodsPassed = 0;
  switch(frequency) {
    case 'Monthly':
      periodsPassed = monthsDiff;
      break;
    case 'Quarterly':
      periodsPassed = Math.floor(monthsDiff / 3);
      break;
    case 'Half-Yearly':
    case 'Semi-Annual':
      periodsPassed = Math.floor(monthsDiff / 6);
      break;
    case 'Yearly':
    case 'Annual':
      periodsPassed = Math.floor(monthsDiff / 12);
      break;
    default:
      periodsPassed = Math.floor(monthsDiff / 12);
  }
  
  return Math.max(0, periodsPassed);
}

// ============================================
// RENDER DASHBOARD ALERTS
// ============================================

function renderDashboardAlerts() {
  console.log('Rendering dashboard alerts...');
  
  let hasAlerts = false;
  
  // Render near maturity investments (1-5 days only)
  if (dashboardData.nearMaturityInvestments && dashboardData.nearMaturityInvestments.length > 0) {
    hasAlerts = true;
    const alert = document.getElementById('nearMaturityAlert');
    const message = document.getElementById('nearMaturityMessage');
    if (alert && message) {
      const count = dashboardData.nearMaturityInvestments.length;
      const totalAmount = dashboardData.nearMaturityInvestments.reduce((sum, inv) => sum + (parseFloat(inv.amount) || 0), 0);
      
      // Calculate days until maturity for display
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
  
  // Render expiring subscriptions alert (based on expiry date)
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
  
  // Render due payments alert (based on payment mode and frequency)
  if (dashboardData.duePayments && dashboardData.duePayments.length > 0) {
    hasAlerts = true;
    const alert = document.getElementById('duePaymentsAlert');
    const message = document.getElementById('duePaymentsMessage');
    if (alert && message) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
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
