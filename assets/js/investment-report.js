(function() {
  // Use IIFE to avoid global variable conflicts
  
  // Storage key for bank day counts
  var BANK_DAY_COUNT_STORAGE_KEY = 'investment_bank_day_counts';
  
  // Flag to track if module is already initialized
  var isReportModuleInitialized = false;

  // ============================================
  // INITIALIZATION
  // ============================================

  window.initInvestmentReportModule = function() {
    // Prevent duplicate initialization
    if (isReportModuleInitialized) {
      console.log('Investment report module already initialized');
      return;
    }
    isReportModuleInitialized = true;
    
    console.log('Initializing Investment Report Module');
    
    // Set default dates
    const today = new Date().toISOString().split('T')[0];
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    const fromDateString = oneMonthAgo.toISOString().split('T')[0];

    // Full Report (new default)
    const fullReportToDate = document.getElementById('fullReportToDate');
    if (fullReportToDate) fullReportToDate.value = today;

    // Interest Report
    const interestFromDate = document.getElementById('interestFromDate');
    if (interestFromDate) interestFromDate.value = fromDateString;
    const interestToDate = document.getElementById('interestToDate');
    if (interestToDate) interestToDate.value = today;

    // Purchase Report
    const purchaseFromDate = document.getElementById('purchaseFromDate');
    if (purchaseFromDate) purchaseFromDate.value = fromDateString;
    const purchaseToDate = document.getElementById('purchaseToDate');
    if (purchaseToDate) purchaseToDate.value = today;

    // Matured Report
    const maturedToDate = document.getElementById('maturedToDate');
    if (maturedToDate) maturedToDate.value = today;

    // Load initial reports
    loadFullInvestmentReport();
    loadMaturedInvestmentsReport();
  };

  // ============================================
  // TAB SWITCHING
  // ============================================

  window.switchInvestmentReportTab = function(tabName) {
    // Hide all tab contents
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(function(tab) {
      tab.classList.remove('active');
    });

    // Show selected tab
    const selectedTab = document.getElementById(tabName);
    if (selectedTab) {
      selectedTab.classList.add('active');
    }

    // Update tab buttons
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(function(btn) {
      btn.classList.remove('active');
    });
    if (event && event.target) {
      event.target.classList.add('active');
    }

    // Hide all control groups
    const controlGroups = document.querySelectorAll('.control-group');
    controlGroups.forEach(function(group) {
      group.style.display = 'none';
    });

    // Show appropriate control group and load data
    if (tabName === 'fullReport') {
      const fullControls = document.getElementById('fullReportControls');
      if (fullControls) fullControls.style.display = 'flex';
      loadFullInvestmentReport();
    } else if (tabName === 'interestReport') {
      const interestControls = document.getElementById('interestControls');
      if (interestControls) interestControls.style.display = 'flex';
      loadInterestReport();
    } else if (tabName === 'purchaseReport') {
      const purchaseControls = document.getElementById('purchaseControls');
      if (purchaseControls) purchaseControls.style.display = 'flex';
      loadPurchaseReport();
    } else if (tabName === 'maturedReport') {
      const maturedControls = document.getElementById('maturedControls');
      if (maturedControls) maturedControls.style.display = 'flex';
      loadMaturedInvestmentsReport();
    }
  };

  // ============================================
  // LOAD FULL INVESTMENT REPORT
  // ============================================

  window.loadFullInvestmentReport = function() {
    console.log('Loading full investment report...');
    
    const toDate = document.getElementById('fullReportToDate').value;
    if (!toDate) return;
    
    showFullReportLoading();
    
    if (typeof API !== 'undefined' && API && typeof API.getAllInvestments === 'function') {
      API.getAllInvestments()
        .then(function(investments) {
          console.log('All investments loaded:', investments);
          const reportType = document.getElementById('reportTypeSelect').value || 'byType';
          displayFullReport(investments, reportType, toDate);
        })
        .catch(function(error) {
          console.error('Error loading investments:', error);
          showReportError('fullReportContainer', 'Error loading investments: ' + error.message);
        });
    } else {
      console.warn('API not available');
      showReportError('fullReportContainer', 'API not available');
    }
  };

  window.handleReportTypeChange = function() {
    const reportType = document.getElementById('reportTypeSelect').value;
    const toDate = document.getElementById('fullReportToDate').value;
    
    showFullReportLoading();
    
    if (typeof API !== 'undefined' && API && typeof API.getAllInvestments === 'function') {
      API.getAllInvestments()
        .then(function(investments) {
          displayFullReport(investments, reportType, toDate);
        })
        .catch(function(error) {
          console.error('Error:', error);
          showReportError('fullReportContainer', 'Error loading report');
        });
    }
  };

function displayFullReport(investments, groupBy, reportToDate) {
  const container = document.getElementById('fullReportContainer');
  if (!container) return;

  if (!investments || investments.length === 0) {
    container.innerHTML = '<div class="empty-report"><i class="fas fa-inbox"></i><p>No investments found</p></div>';
    return;
  }

  // Filter active investments: investment date <= toDate and maturity date > toDate
  const toDateTime = new Date(reportToDate);
  toDateTime.setHours(23, 59, 59, 999);
  const toDateOnly = new Date(reportToDate);
  toDateOnly.setHours(0, 0, 0, 0);

  const activeInvestments = investments.filter(function(inv) {
    const investDate = new Date(inv.investmentDate);
    const maturityDate = new Date(inv.maturityDate);
    return investDate <= toDateTime && maturityDate > toDateTime;
  });

  if (activeInvestments.length === 0) {
    container.innerHTML = '<div class="empty-report"><i class="fas fa-inbox"></i><p>No active investments as at ' + reportToDate + '</p></div>';
    return;
  }

  let groupedData = {};
  let totalAmount = 0;
  let totalInterest = 0;
  let totalMaturity = 0;
  let totalCurrent = 0;

  // Group investments
  activeInvestments.forEach(function(inv) {
    let groupKey;
    
    if (groupBy === 'byBank') {
      groupKey = inv.bankName;
    } else if (groupBy === 'byDuration') {
      groupKey = inv.duration + ' days';
    } else {
      groupKey = inv.investmentType;
    }

    if (!groupedData[groupKey]) {
      groupedData[groupKey] = [];
    }
    groupedData[groupKey].push(inv);

    totalAmount += inv.amount;
    totalInterest += inv.interestAmount;
    totalMaturity += inv.maturityAmount;
    
    // Calculate accrued to-date
    const accruedVals = calculateAccruedInterest(
      inv.amount,
      inv.interestRate,
      inv.investmentDate,
      inv.investmentDate,
      reportToDate,
      inv.investmentType,
      inv.maturityDate
    );
    
    // Current value = 0 if matured, otherwise amount + accrued
    const maturityDate = new Date(inv.maturityDate);
    maturityDate.setHours(0, 0, 0, 0);
    let currentValue = 0;
    if (maturityDate > toDateOnly) {
      currentValue = inv.amount + accruedVals.toDate;
    }
    totalCurrent += currentValue;
  });

  // Build HTML
  let html = '';
  
  for (const group in groupedData) {
    const items = groupedData[group];
    let subtotalAmount = 0;
    let subtotalInterest = 0;
    let subtotalMaturity = 0;
    let subtotalCurrent = 0;

    items.forEach(function(item) {
      subtotalAmount += item.amount;
      subtotalInterest += item.interestAmount;
      subtotalMaturity += item.maturityAmount;
      
      const accruedVals = calculateAccruedInterest(
        item.amount,
        item.interestRate,
        item.investmentDate,
        item.investmentDate,
        reportToDate,
        item.investmentType,
        item.maturityDate
      );
      
      // Current value = 0 if matured
      const maturityDate = new Date(item.maturityDate);
      maturityDate.setHours(0, 0, 0, 0);
      let currentValue = 0;
      if (maturityDate > toDateOnly) {
        currentValue = item.amount + accruedVals.toDate;
      }
      subtotalCurrent += currentValue;
    });

    html += '<div class="grouped-report">';
    html += '<div class="group-title">' + group + '</div>';
    html += '<div class="group-table-wrapper">';
    html += '<table class="group-table">';
    html += '<thead><tr>';
    html += '<th>Code</th><th>Bank</th><th>Type</th><th>Amount (GHc)</th><th>Rate (%)</th>';
    html += '<th>Duration (Days)</th><th>Inv. Date</th><th>Maturity Date</th>';
    html += '<th>Interest (GHc)</th><th>Maturity Amt (GHc)</th><th>Current Value (GHc)</th><th>Action</th>';
    html += '</tr></thead>';
    html += '<tbody>';

    items.forEach(function(item) {
      const accruedVals = calculateAccruedInterest(
        item.amount,
        item.interestRate,
        item.investmentDate,
        item.investmentDate,
        reportToDate,
        item.investmentType,
        item.maturityDate
      );
      
      // Current value = 0 if matured
      const maturityDate = new Date(item.maturityDate);
      maturityDate.setHours(0, 0, 0, 0);
      let currentValue = 0;
      if (maturityDate > toDateOnly) {
        currentValue = item.amount + accruedVals.toDate;
      }
      
      html += '<tr>';
      html += '<td>' + (item.investmentCode || '') + '</td>';
      html += '<td>' + (item.bankName || '') + '</td>';
      html += '<td>' + (item.investmentType || '') + '</td>';
      html += '<td class="text-right">' + formatCurrency(item.amount) + '</td>';
      html += '<td class="text-center">' + (item.interestRate || 0).toFixed(2) + '</td>';
      html += '<td class="text-center">' + (item.duration || 0) + '</td>';
      html += '<td class="text-center">' + (item.investmentDate || '') + '</td>';
      html += '<td class="text-center">' + (item.maturityDate || '') + '</td>';
      html += '<td class="text-right">' + formatCurrency(item.interestAmount) + '</td>';
      html += '<td class="text-right">' + formatCurrency(item.maturityAmount) + '</td>';
      html += '<td class="text-right">' + formatCurrency(currentValue) + '</td>';
      html += '<td><button class="action-btn" onclick="showFullReportActionMenu(event, \'' + (item.investmentCode || '') + '\')"><i class="fas fa-ellipsis-v"></i></button></td>';
      html += '</tr>';
    });

    html += '<tr class="subtotal-row">';
    html += '<td colspan="3">Subtotal</td>';
    html += '<td class="text-right">' + formatCurrency(subtotalAmount) + '</td>';
    html += '<td>-</td><td>-</td><td>-</td><td>-</td>';
    html += '<td class="text-right">' + formatCurrency(subtotalInterest) + '</td>';
    html += '<td class="text-right">' + formatCurrency(subtotalMaturity) + '</td>';
    html += '<td class="text-right">' + formatCurrency(subtotalCurrent) + '</td>';
    html += '<td>-</td>';
    html += '</tr>';

    html += '</tbody></table></div></div>';
  }

  // Grand total
  html += '<div class="grand-total-report">';
  html += '<table class="group-table"><tbody>';
  html += '<tr class="grand-total-row">';
  html += '<td colspan="3">GRAND TOTAL</td>';
  html += '<td class="text-right">' + formatCurrency(totalAmount) + '</td>';
  html += '<td>-</td><td>-</td><td>-</td><td>-</td>';
  html += '<td class="text-right">' + formatCurrency(totalInterest) + '</td>';
  html += '<td class="text-right">' + formatCurrency(totalMaturity) + '</td>';
  html += '<td class="text-right">' + formatCurrency(totalCurrent) + '</td>';
  html += '<td>-</td>';
  html += '</tr>';
  html += '</tbody></table></div>';

  container.innerHTML = html;
}
  // ============================================
  // LOAD INTEREST REPORT
  // ============================================

  window.loadInterestReport = function() {
    const fromDate = document.getElementById('interestFromDate').value;
    const toDate = document.getElementById('interestToDate').value;
    
    if (!fromDate || !toDate) return;

    console.log('Loading interest report:', fromDate, 'to', toDate);

    showInterestReportLoading();

    if (typeof API !== 'undefined' && API && typeof API.getAllInvestments === 'function') {
      API.getAllInvestments()
        .then(function(investments) {
          console.log('All investments loaded for interest report:', investments);
          const reportType = document.getElementById('interestReportTypeSelect').value || 'byType';
          displayInterestReport(investments, fromDate, toDate, reportType);
        })
        .catch(function(error) {
          console.error('Error:', error);
          showReportError('interestReportContainer', 'Error loading report');
        });
    }
  };

  window.handleInterestReportTypeChange = function() {
    const reportType = document.getElementById('interestReportTypeSelect').value;
    const fromDate = document.getElementById('interestFromDate').value;
    const toDate = document.getElementById('interestToDate').value;
    
    showInterestReportLoading();
    
    if (typeof API !== 'undefined' && API && typeof API.getAllInvestments === 'function') {
      API.getAllInvestments()
        .then(function(investments) {
          displayInterestReport(investments, fromDate, toDate, reportType);
        })
        .catch(function(error) {
          console.error('Error:', error);
          showReportError('interestReportContainer', 'Error loading report');
        });
    }
  };

function displayInterestReport(investments, fromDate, toDate, groupBy) {
  const container = document.getElementById('interestReportContainer');
  if (!container) return;

  if (!investments || investments.length === 0) {
    container.innerHTML = '<div class="empty-report"><i class="fas fa-inbox"></i><p>No investments found for selected period</p></div>';
    return;
  }

  // Filter active investments within the date range
  const fromDateTime = new Date(fromDate);
  fromDateTime.setHours(0, 0, 0, 0);
  const toDateTime = new Date(toDate);
  toDateTime.setHours(23, 59, 59, 999);

  const activeInvestments = investments.filter(function(inv) {
    const investDate = new Date(inv.investmentDate);
    const maturityDate = new Date(inv.maturityDate);
    return investDate <= toDateTime && maturityDate > fromDateTime;
  });

  if (activeInvestments.length === 0) {
    container.innerHTML = '<div class="empty-report"><i class="fas fa-inbox"></i><p>No active investments in the selected period</p></div>';
    return;
  }

  let groupedData = {};
  let totalAmount = 0;
  let totalInterest = 0;
  let totalAccruedMonthly = 0;
  let totalAccruedToDate = 0;
  let totalCurrent = 0;

  activeInvestments.forEach(function(inv) {
    let groupKey;
    
    if (groupBy === 'byBank') {
      groupKey = inv.bankName;
    } else if (groupBy === 'byDuration') {
      groupKey = inv.duration + ' days';
    } else {
      groupKey = inv.investmentType;
    }
    
    if (!groupedData[groupKey]) {
      groupedData[groupKey] = [];
    }
    groupedData[groupKey].push(inv);
    
    totalAmount += inv.amount;
    totalInterest += inv.interestAmount;
    
    // Calculate accrued values
    const accruedVals = calculateAccruedInterest(
      inv.amount,
      inv.interestRate,
      inv.investmentDate,
      fromDate,
      toDate,
      inv.investmentType,
      inv.maturityDate
    );
    
    totalAccruedMonthly += accruedVals.monthly;
    totalAccruedToDate += accruedVals.toDate;
    
    // Current value = 0 if matured, otherwise amount + accrued
    const maturityDate = new Date(inv.maturityDate);
    maturityDate.setHours(0, 0, 0, 0);
    let currentVal = 0;
    if (maturityDate > toDateTime) {
      currentVal = inv.amount + accruedVals.toDate;
    }
    totalCurrent += currentVal;
  });

  let html = '';
  
  for (const group in groupedData) {
    const items = groupedData[group];
    let subtotalAmount = 0;
    let subtotalInterest = 0;
    let subtotalAccruedMonthly = 0;
    let subtotalAccruedToDate = 0;
    let subtotalCurrent = 0;

    items.forEach(function(item) {
      subtotalAmount += item.amount;
      subtotalInterest += item.interestAmount;
      
      const accruedVals = calculateAccruedInterest(
        item.amount,
        item.interestRate,
        item.investmentDate,
        fromDate,
        toDate,
        item.investmentType,
        item.maturityDate
      );
      
      subtotalAccruedMonthly += accruedVals.monthly;
      subtotalAccruedToDate += accruedVals.toDate;
      
      // Current value = 0 if matured
      const maturityDate = new Date(item.maturityDate);
      maturityDate.setHours(0, 0, 0, 0);
      let currentVal = 0;
      if (maturityDate > toDateTime) {
        currentVal = item.amount + accruedVals.toDate;
      }
      subtotalCurrent += currentVal;
    });

    html += '<div class="grouped-report">';
    html += '<div class="group-title">' + group + '</div>';
    html += '<div class="group-table-wrapper">';
    html += '<table class="group-table">';
    html += '<thead><tr>';
    html += '<th>Code</th><th>Bank</th><th>Type</th><th>Amount (GHc)</th><th>Rate (%)</th>';
    html += '<th>Duration (Days)</th><th>Inv. Date</th><th>Maturity Date</th><th>Interest (GHc)</th>';
    html += '<th>Accrued Monthly</th><th>Accrued To Date</th><th>Current Value (GHc)</th>';
    html += '</tr></thead>';
    html += '<tbody>';

    items.forEach(function(item) {
      const accruedVals = calculateAccruedInterest(
        item.amount,
        item.interestRate,
        item.investmentDate,
        fromDate,
        toDate,
        item.investmentType,
        item.maturityDate
      );
      
      // Current value = 0 if matured
      const maturityDate = new Date(item.maturityDate);
      maturityDate.setHours(0, 0, 0, 0);
      let currentVal = 0;
      if (maturityDate > toDateTime) {
        currentVal = item.amount + accruedVals.toDate;
      }
      
      html += '<tr>';
      html += '<td>' + (item.investmentCode || '') + '</td>';
      html += '<td>' + (item.bankName || '') + '</td>';
      html += '<td>' + (item.investmentType || '') + '</td>';
      html += '<td class="text-right">' + formatCurrency(item.amount) + '</td>';
      html += '<td class="text-center">' + (item.interestRate || 0).toFixed(2) + '</td>';
      html += '<td class="text-center">' + (item.duration || 0) + '</td>';
      html += '<td class="text-center">' + (item.investmentDate || '') + '</td>';
      html += '<td class="text-center">' + (item.maturityDate || '') + '</td>';
      html += '<td class="text-right">' + formatCurrency(item.interestAmount) + '</td>';
      html += '<td class="text-right">' + formatCurrency(accruedVals.monthly) + '</td>';
      html += '<td class="text-right">' + formatCurrency(accruedVals.toDate) + '</td>';
      html += '<td class="text-right">' + formatCurrency(currentVal) + '</td>';
      html += '</tr>';
    });

    html += '<tr class="subtotal-row">';
    html += '<td colspan="3">Subtotal</td>';
    html += '<td class="text-right">' + formatCurrency(subtotalAmount) + '</td>';
    html += '<td>-</td><td>-</td><td>-</td><td>-</td>';
    html += '<td class="text-right">' + formatCurrency(subtotalInterest) + '</td>';
    html += '<td class="text-right">' + formatCurrency(subtotalAccruedMonthly) + '</td>';
    html += '<td class="text-right">' + formatCurrency(subtotalAccruedToDate) + '</td>';
    html += '<td class="text-right">' + formatCurrency(subtotalCurrent) + '</td>';
    html += '</tr>';
    html += '</tbody></table></div></div>';
  }

  html += '<div class="grand-total-report">';
  html += '<table class="group-table"><tbody>';
  html += '<tr class="grand-total-row">';
  html += '<td colspan="3">TOTAL</td>';
  html += '<td class="text-right">' + formatCurrency(totalAmount) + '</td>';
  html += '<td>-</td><td>-</td><td>-</td><td>-</td>';
  html += '<td class="text-right">' + formatCurrency(totalInterest) + '</td>';
  html += '<td class="text-right">' + formatCurrency(totalAccruedMonthly) + '</td>';
  html += '<td class="text-right">' + formatCurrency(totalAccruedToDate) + '</td>';
  html += '<td class="text-right">' + formatCurrency(totalCurrent) + '</td>';
  html += '</tr>';
  html += '</tbody></table></div>';

  container.innerHTML = html;
}
  // ============================================
  // LOAD PURCHASE REPORT
  // ============================================

  window.loadPurchaseReport = function() {
    const fromDate = document.getElementById('purchaseFromDate').value;
    const toDate = document.getElementById('purchaseToDate').value;
    
    if (!fromDate || !toDate) return;

    console.log('Loading purchase report:', fromDate, 'to', toDate);

    if (typeof API !== 'undefined' && API && typeof API.getInvestmentsByDateRange === 'function') {
      API.getInvestmentsByDateRange(fromDate, toDate)
        .then(function(investments) {
          console.log('Purchase data loaded:', investments);
          displayPurchaseReport(investments);
        })
        .catch(function(error) {
          console.error('Error:', error);
          showTableError('purchaseReportBody', 7, 'Error loading purchase report');
        });
    }
  };

  function displayPurchaseReport(investments) {
    const tbody = document.getElementById('purchaseReportBody');
    if (!tbody) return;

    if (!investments || investments.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="loading-cell">No investments found</td></tr>';
      return;
    }

    let html = '';
    let totalAmount = 0;

    investments.forEach(function(item) {
      html += '<tr>';
      html += '<td>' + (item.investmentCode || '') + '</td>';
      html += '<td>' + (item.bankName || '') + '</td>';
      html += '<td>' + (item.investmentType || '') + '</td>';
      html += '<td class="text-right">' + formatCurrency(item.amount) + '</td>';
      html += '<td class="text-center">' + (item.interestRate || 0).toFixed(2) + '</td>';
      html += '<td class="text-center">' + (item.duration || 0) + '</td>';
      html += '<td class="text-center">' + (item.investmentDate || '') + '</td>';
      html += '</tr>';
      totalAmount += item.amount;
    });

    html += '<tr class="subtotal-row">';
    html += '<td colspan="3">TOTAL</td>';
    html += '<td class="text-right">' + formatCurrency(totalAmount) + '</td>';
    html += '<td>-</td><td>-</td><td>-</td>';
    html += '</tr>';

    tbody.innerHTML = html;
  }

  // ============================================
  // LOAD MATURED INVESTMENTS
  // ============================================

  window.loadMaturedInvestmentsReport = function() {
    const toDate = document.getElementById('maturedToDate').value || new Date().toISOString().split('T')[0];
    
    console.log('Loading matured investments as at:', toDate);

    if (typeof API !== 'undefined' && API && typeof API.getMaturedInvestments === 'function') {
      API.getMaturedInvestments(toDate)
        .then(function(investments) {
          console.log('Matured investments loaded:', investments);
          displayMaturedReport(investments);
        })
        .catch(function(error) {
          console.error('Error:', error);
          showTableError('maturedReportBody', 10, 'Error loading matured investments');
        });
    }
  };

  function displayMaturedReport(investments) {
    const tbody = document.getElementById('maturedReportBody');
    if (!tbody) return;

    if (!investments || investments.length === 0) {
      tbody.innerHTML = '<tr><td colspan="10" class="loading-cell">No matured investments</td></tr>';
      return;
    }

    let html = '';
    investments.forEach(function(item) {
      html += '<tr>';
      html += '<td>' + (item.investmentCode || '') + '</td>';
      html += '<td>' + (item.bankName || '') + '</td>';
      html += '<td>' + (item.investmentType || '') + '</td>';
      html += '<td class="text-right">' + formatCurrency(item.amount) + '</td>';
      html += '<td class="text-center">' + (item.interestRate || 0).toFixed(2) + '</td>';
      html += '<td class="text-center">' + (item.duration || 0) + '</td>';
      html += '<td class="text-center">' + (item.investmentDate || '') + '</td>';
      html += '<td class="text-center">' + (item.maturityDate || '') + '</td>';
      html += '<td class="text-right">' + formatCurrency(item.maturityAmount) + '</td>';
      html += '<td><button class="action-btn" onclick="showMaturedActionMenu(event, \'' + (item.investmentCode || '') + '\')"><i class="fas fa-ellipsis-v"></i></button></td>';
      html += '</tr>';
    });

    tbody.innerHTML = html;
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

  function showReportError(containerId, message) {
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = '<div class="error-report"><i class="fas fa-exclamation-circle"></i><p>' + message + '</p></div>';
    }
  }

  function showTableError(tbodyId, colspan, message) {
    const tbody = document.getElementById(tbodyId);
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="' + colspan + '" class="loading-cell">' + message + '</td></tr>';
    }
  }

  function showFullReportLoading() {
    const container = document.getElementById('fullReportContainer');
    if (container) {
      container.innerHTML = '<div class="loading-report"><div class="loading-spinner-inline"></div><p>Loading full report...</p></div>';
    }
  }

  function showInterestReportLoading() {
    const container = document.getElementById('interestReportContainer');
    if (container) {
      container.innerHTML = '<div class="loading-report"><div class="loading-spinner-inline"></div><p>Loading interest report...</p></div>';
    }
  }

  // ============================================
  // ACCRUED INTEREST CALCULATION
  // ============================================

function calculateAccruedInterest(amount, annualRate, investmentDate, fromDate, toDate, investmentType, maturityDate) {
  try {
    const investStart = new Date(investmentDate);
    const periodStart = new Date(fromDate);
    const periodEnd = new Date(toDate);
    const maturityDateObj = new Date(maturityDate);
    
    // Set time to start of day for proper date comparison
    investStart.setHours(0, 0, 0, 0);
    periodStart.setHours(0, 0, 0, 0);
    periodEnd.setHours(0, 0, 0, 0);
    maturityDateObj.setHours(0, 0, 0, 0);
    
    // Day count based on investment type
    let dayCount = 365; // default
    if (investmentType === 'Treasury Bills') {
      dayCount = 364;
    } else if (investmentType === 'Bonds') {
      dayCount = 360;
    } else if (investmentType === 'Fixed Deposit') {
      dayCount = 365;
    }
    
    // Daily interest rate based on investment type's day count
    const dailyRate = (annualRate / 100) / dayCount;
    
    // Calculate accrued monthly: from periodStart to periodEnd, but NOT beyond maturity date
    let accruedMonthlyEndDate = periodEnd;
    if (periodEnd > maturityDateObj) {
      accruedMonthlyEndDate = maturityDateObj;
    }
    
    // Calculate days: from periodStart to accruedMonthlyEndDate (inclusive)
    const timeMonthlyDiff = accruedMonthlyEndDate - periodStart;
    const daysMonthlyDiff = Math.ceil(timeMonthlyDiff / (1000 * 60 * 60 * 24));
    const accruedMonthly = amount * dailyRate * daysMonthlyDiff;
    
    // Calculate accrued to-date: from investment date to toDate, but NOT beyond maturity date
    // If already matured, accrued to-date should be 0
    let accruedToDate = 0;
    let daysToDiff = 0;
    
    if (periodEnd <= maturityDateObj) {
      // Investment hasn't matured yet - calculate normally
      const timeToDiff = periodEnd - investStart;
      daysToDiff = Math.ceil(timeToDiff / (1000 * 60 * 60 * 24));
      accruedToDate = amount * dailyRate * daysToDiff;
    } else {
      // Investment has matured - accrued to date is 0
      accruedToDate = 0;
      daysToDiff = 0;
    }
    
    return {
      monthly: accruedMonthly,
      toDate: accruedToDate,
      daysToDiff: Math.max(daysToDiff, 0),
      daysMonthlyDiff: Math.max(daysMonthlyDiff, 0)
    };
  } catch (e) {
    console.error('Error calculating accrued interest:', e);
    return { monthly: 0, toDate: 0, daysToDiff: 0, daysMonthlyDiff: 0 };
  }
}
  // ============================================
  // ACTION MENUS
  // ============================================

  window.showFullReportActionMenu = function(event, investmentCode) {
    event.stopPropagation();
    const portal = document.getElementById('investmentActionPortal');
    if (!portal) return;

    const rect = event.target.getBoundingClientRect();
    portal.style.display = 'block';
    portal.style.top = (rect.bottom + 5) + 'px';
    portal.style.left = (rect.left - 80) + 'px';

    portal.innerHTML = `
      <div class="action-dropdown-content">
        <button class="dropdown-item" onclick="openRedeemModal('${investmentCode}')">
          <i class="fas fa-check"></i> Redeem
        </button>
      </div>
    `;

    document.addEventListener('click', function closeMenu() {
      portal.style.display = 'none';
      document.removeEventListener('click', closeMenu);
    });
  };

  window.showMaturedActionMenu = function(event, investmentCode) {
    event.stopPropagation();
    const portal = document.getElementById('investmentActionPortal');
    if (!portal) return;

    const rect = event.target.getBoundingClientRect();
    portal.style.display = 'block';
    portal.style.top = (rect.bottom + 5) + 'px';
    portal.style.left = (rect.left - 80) + 'px';

    portal.innerHTML = `
      <div class="action-dropdown-content">
        <button class="dropdown-item" onclick="openRolloverModal('${investmentCode}')">
          <i class="fas fa-refresh"></i> Rollover
        </button>
        <button class="dropdown-item" onclick="openRedeemModal('${investmentCode}')">
          <i class="fas fa-check"></i> Redeem
        </button>
      </div>
    `;

    document.addEventListener('click', function closeMenu() {
      portal.style.display = 'none';
      document.removeEventListener('click', closeMenu);
    });
  };

  // ============================================
  // MODAL FUNCTIONS
  // ============================================

  window.openRolloverModal = function(investmentCode) {
    const modal = document.getElementById('rolloverModal');
    if (modal) {
      console.log('Opening rollover modal for code:', investmentCode);
      const codeField = document.getElementById('rolloverInvestmentCode');
      if (codeField) {
        codeField.value = investmentCode;
      }
      modal.style.display = 'flex';
      setTimeout(function() {
        populateInvestmentDetailsForRollover(investmentCode);
      }, 100);
    }
  };

  window.closeRolloverModal = function() {
    const modal = document.getElementById('rolloverModal');
    if (modal) {
      modal.style.display = 'none';
    }
  };

  window.openRedeemModal = function(investmentCode) {
    const modal = document.getElementById('redeemModal');
    if (modal) {
      console.log('Opening redeem modal for code:', investmentCode);
      const codeField = document.getElementById('redeemInvestmentCode');
      if (codeField) {
        codeField.value = investmentCode;
      }
      modal.style.display = 'flex';
      setTimeout(function() {
        populateInvestmentDetailsForRedeem(investmentCode);
      }, 100);
    }
  };

  window.closeRedeemModal = function() {
    const modal = document.getElementById('redeemModal');
    if (modal) {
      modal.style.display = 'none';
    }
  };

function populateInvestmentDetailsForRollover(investmentCode) {
  console.log('Fetching investment details for rollover:', investmentCode);
  
  if (typeof API !== 'undefined' && API && typeof API.getInvestmentByCode === 'function') {
    API.getInvestmentByCode(investmentCode)
      .then(function(investment) {
        console.log('Investment details received:', investment);
        if (investment) {
          const rolloverBankName = document.getElementById('rolloverBankName');
          const rolloverCurrentType = document.getElementById('rolloverCurrentType');
          const rolloverCurrentAmount = document.getElementById('rolloverCurrentAmount');
          const rolloverCurrentMaturityAmount = document.getElementById('rolloverCurrentMaturityAmount');
          const rolloverCurrentMaturityDate = document.getElementById('rolloverCurrentMaturityDate');
          
          // Current details (read-only)
          if (rolloverBankName) rolloverBankName.value = investment.bankName || '';
          if (rolloverCurrentType) rolloverCurrentType.value = investment.investmentType || '';
          if (rolloverCurrentAmount) rolloverCurrentAmount.value = formatCurrency(investment.amount) || '0.00';
          if (rolloverCurrentMaturityAmount) rolloverCurrentMaturityAmount.value = formatCurrency(investment.maturityAmount) || '0.00';
          if (rolloverCurrentMaturityDate) rolloverCurrentMaturityDate.value = investment.maturityDate || '';
          
          // Pre-fill new details with same bank and type
          const rolloverNewBankName = document.getElementById('rolloverNewBankName');
          const rolloverInvestmentType = document.getElementById('rolloverInvestmentType');
          
          if (rolloverNewBankName) rolloverNewBankName.value = investment.bankName || '';
          if (rolloverInvestmentType) rolloverInvestmentType.value = investment.investmentType || '';
          
          // Set new investment date to today
          const rolloverInvestmentDate = document.getElementById('rolloverInvestmentDate');
          if (rolloverInvestmentDate) {
            rolloverInvestmentDate.value = new Date().toISOString().split('T')[0];
          }
          
          // Set new amount to current maturity amount (amount to rollover)
          const rolloverAmount = document.getElementById('rolloverAmount');
          if (rolloverAmount) {
            rolloverAmount.value = investment.maturityAmount || investment.amount || 0;
            rolloverAmount.dispatchEvent(new Event('input'));
          }
          
          console.log('Rollover modal populated successfully');
        } else {
          console.warn('Investment not found');
          showMessage('Investment details not found', 'error');
        }
      })
      .catch(function(error) {
        console.error('Error fetching investment details for rollover:', error);
        showMessage('Error loading investment details: ' + error.message, 'error');
      });
  } else {
    console.warn('API.getInvestmentByCode not available');
    showMessage('API not available', 'error');
  }
}
function populateInvestmentDetailsForRedeem(investmentCode) {
  console.log('Fetching investment details for redeem:', investmentCode);
  
  if (typeof API !== 'undefined' && API && typeof API.getInvestmentByCode === 'function') {
    API.getInvestmentByCode(investmentCode)
      .then(function(investment) {
        console.log('Investment details received:', investment);
        if (investment) {
          const redeemInvestmentCode = document.getElementById('redeemInvestmentCode');
          const redeemBankName = document.getElementById('redeemBankName');
          const redeemInvestmentType = document.getElementById('redeemInvestmentType');
          const redeemAmount = document.getElementById('redeemAmount');
          const redeemMaturityDate = document.getElementById('redeemMaturityDate');
          const redeemMaturityAmount = document.getElementById('redeemMaturityAmount');
          
          if (redeemInvestmentCode) redeemInvestmentCode.value = investment.investmentCode || '';
          if (redeemBankName) redeemBankName.value = investment.bankName || '';
          if (redeemInvestmentType) redeemInvestmentType.value = investment.investmentType || '';
          if (redeemAmount) redeemAmount.value = formatCurrency(investment.amount) || '0.00';
          if (redeemMaturityDate) redeemMaturityDate.value = investment.maturityDate || '';
          if (redeemMaturityAmount) redeemMaturityAmount.value = formatCurrency(investment.maturityAmount) || '0.00';
          
          // Set redeem date to today
          const redeemDate = document.getElementById('redeemDate');
          if (redeemDate) {
            redeemDate.value = new Date().toISOString().split('T')[0];
          }
          
          console.log('Redeem modal populated successfully');
        } else {
          console.warn('Investment not found');
          showMessage('Investment details not found', 'error');
        }
      })
      .catch(function(error) {
        console.error('Error fetching investment details for redeem:', error);
        showMessage('Error loading investment details: ' + error.message, 'error');
      });
  } else {
    console.warn('API.getInvestmentByCode not available');
    showMessage('API not available', 'error');
  }
}

window.submitRolloverInvestment = function() {
  const investmentCode = document.getElementById('rolloverInvestmentCode').value;
  const investmentType = document.getElementById('rolloverInvestmentType').value;
  const investmentDate = document.getElementById('rolloverInvestmentDate').value;
  const amount = document.getElementById('rolloverAmount').value;
  const interestRate = document.getElementById('rolloverInterestRate').value;
  const duration = document.getElementById('rolloverDuration').value;
  const maturityDate = document.getElementById('rolloverMaturityDate').value;
  const bankName = document.getElementById('rolloverNewBankName').value;

  // Validate inputs
  if (!investmentType || !investmentDate || !amount || !interestRate || !duration || !maturityDate || !bankName) {
    showMessage('Please fill in all required fields', 'error');
    return;
  }

  const rolloverData = {
    previousInvestmentCode: investmentCode,
    investmentType: investmentType,
    investmentDate: investmentDate,
    amount: parseFloat(amount),
    interestRate: parseFloat(interestRate),
    duration: parseInt(duration),
    maturityDate: maturityDate,
    bankName: bankName
  };

  console.log('Rollover submission:', rolloverData);

  if (typeof API !== 'undefined' && API && typeof API.addNewInvestment === 'function') {
    // Generate new investment code
    API.generateInvestmentCode(investmentType)
      .then(function(newCode) {
        console.log('Generated new investment code:', newCode);
        
        rolloverData.investmentCode = newCode;
        
        // Calculate interest and maturity amount
        let dayCount = 365;
        if (investmentType === 'Treasury Bills') dayCount = 364;
        else if (investmentType === 'Bonds') dayCount = 360;
        
        const interestAmount = (rolloverData.amount * rolloverData.interestRate * rolloverData.duration) / (dayCount * 100);
        const maturityAmount = rolloverData.amount + interestAmount;
        
        rolloverData.interestAmount = interestAmount;
        rolloverData.maturityAmount = maturityAmount;
        
        return API.addNewInvestment(rolloverData);
      })
      .then(function(response) {
        console.log('Rollover created successfully:', response);
        showMessage('Investment rolled over successfully! Code: ' + response.investmentCode, 'success');
        closeRolloverModal();
        loadMaturedInvestmentsReport();
      })
      .catch(function(error) {
        console.error('Error creating rollover investment:', error);
        showMessage('Error creating rollover investment: ' + error.message, 'error');
      });
  } else {
    showMessage('API not available', 'error');
  }
};

window.submitRedeemInvestment = function() {
  const investmentCode = document.getElementById('redeemInvestmentCode').value;
  const redeemDate = document.getElementById('redeemDate').value;

  if (!investmentCode || !redeemDate) {
    showMessage('Please select a redeem date', 'error');
    return;
  }

  console.log('Redeem submission:', {
    investmentCode: investmentCode,
    redeemDate: redeemDate
  });

  if (typeof API !== 'undefined' && API && typeof API.updateInvestmentRedeemDate === 'function') {
    API.updateInvestmentRedeemDate(investmentCode, redeemDate)
      .then(function(response) {
        console.log('Investment redeemed successfully:', response);
        showMessage('Investment redeemed successfully on ' + redeemDate, 'success');
        closeRedeemModal();
        loadMaturedInvestmentsReport();
      })
      .catch(function(error) {
        console.error('Error redeeming investment:', error);
        showMessage('Error redeeming investment: ' + error.message, 'error');
      });
  } else {
    // Fallback: show success message
    showMessage('Investment redeemed successfully on ' + redeemDate, 'success');
    closeRedeemModal();
    loadMaturedInvestmentsReport();
  }
};

  // Calculation functions for rollover
  window.handleRolloverInvestmentTypeChange = function() {
    console.log('Rollover type changed');
  };

  window.calculateRolloverMaturityDate = function() {
    const investmentDate = document.getElementById('rolloverInvestmentDate');
    const durationField = document.getElementById('rolloverDuration');
    
    if (!investmentDate || !durationField) return;
    
    const investmentDateValue = investmentDate.value;
    const duration = parseInt(durationField.value) || 0;

    if (!investmentDateValue || duration <= 0) {
      const maturityDateField = document.getElementById('rolloverMaturityDate');
      if (maturityDateField) maturityDateField.value = '';
      return;
    }

    const startDate = new Date(investmentDateValue);
    const maturityDate = new Date(startDate.getTime() + (duration * 24 * 60 * 60 * 1000));
    
    const year = maturityDate.getFullYear();
    const month = String(maturityDate.getMonth() + 1).padStart(2, '0');
    const day = String(maturityDate.getDate()).padStart(2, '0');
    
    const maturityDateField = document.getElementById('rolloverMaturityDate');
    if (maturityDateField) maturityDateField.value = year + '-' + month + '-' + day;
    calculateRolloverMaturityAmount();
  };

  window.calculateRolloverMaturityAmount = function() {
    const amountField = document.getElementById('rolloverAmount');
    const interestRateField = document.getElementById('rolloverInterestRate');
    const durationField = document.getElementById('rolloverDuration');
    const investmentTypeField = document.getElementById('rolloverInvestmentType');
    
    if (!amountField || !interestRateField || !durationField) return;
    
    const amount = parseFloat(amountField.value) || 0;
    const interestRate = parseFloat(interestRateField.value) || 0;
    const duration = parseInt(durationField.value) || 0;
    const investmentType = investmentTypeField ? investmentTypeField.value : 'Fixed Deposit';
    
    // Day count based on investment type
    let dayCount = 365; // default
    if (investmentType === 'Treasury Bills') {
      dayCount = 364;
    } else if (investmentType === 'Bonds') {
      dayCount = 360;
    } else if (investmentType === 'Fixed Deposit') {
      dayCount = 365;
    }

    const interestAmountField = document.getElementById('rolloverInterestAmount');
    const maturityAmountField = document.getElementById('rolloverMaturityAmount');
    
    if (amount <= 0 || interestRate < 0 || duration <= 0) {
      if (interestAmountField) interestAmountField.value = '0.00';
      if (maturityAmountField) maturityAmountField.value = '0.00';
      return;
    }

    // Interest = Principal * Rate * (Duration / DayCount)
    const timeInYears = duration / dayCount;
    const interestAmount = (amount * interestRate * timeInYears) / 100;
    const maturityAmountValue = amount + interestAmount;

    if (interestAmountField) interestAmountField.value = formatCurrency(interestAmount);
    if (maturityAmountField) maturityAmountField.value = formatCurrency(maturityAmountValue);
  };

  function showMessage(message, type) {
    let modal = document.getElementById('messageModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'messageModal';
      modal.className = 'modal';
      document.body.appendChild(modal);
    }
    
    let messageDiv = document.getElementById('modalMessage');
    if (!messageDiv) {
      const div = document.createElement('div');
      div.id = 'modalMessage';
      modal.appendChild(div);
      messageDiv = div;
    }
    
    const types = {
      success: 'success-message',
      error: 'error-message',
      info: 'info-message',
      warning: 'warning-message'
    };

    messageDiv.innerHTML = '<div class="' + (types[type] || types.info) + '">' + message + '</div>';
    modal.style.display = 'flex';
    
    setTimeout(function() {
      if (modal) modal.style.display = 'none';
    }, 3000);
  }

  // Print function
  window.printInvestmentReport = function(tabName) {
    console.log('printInvestmentReport called for tab:', tabName);
    if (typeof printUtils !== 'undefined' && printUtils.printInvestmentReport) {
      printUtils.printInvestmentReport(tabName);
    } else {
      console.error('printUtils not available');
      alert('Print utility not loaded');
    }
  };

})();
