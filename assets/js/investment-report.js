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

    // Full Report
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
    event.target.classList.add('active');

    // Hide all control groups
    const controlGroups = document.querySelectorAll('.control-group');
    controlGroups.forEach(function(group) {
      group.style.display = 'none';
    });

    // Show appropriate control group
    if (tabName === 'fullReport') {
      const fullControls = document.getElementById('fullReportControls');
      if (fullControls) fullControls.style.display = 'flex';
      loadFullInvestmentReport();
    } else if (tabName === 'interestReport') {
      const interestControls = document.getElementById('interestControls');
      if (interestControls) interestControls.style.display = 'flex';
      loadInterestReport();
    } else if (tabName === 'maturedReport') {
      const maturedControls = document.getElementById('maturedControls');
      if (maturedControls) maturedControls.style.display = 'flex';
      loadMaturedInvestmentsReport();
    } else if (tabName === 'purchaseReport') {
      const purchaseControls = document.getElementById('purchaseControls');
      if (purchaseControls) purchaseControls.style.display = 'flex';
      loadPurchaseReport();
    }
  };

  // ============================================
  // LOAD FULL INVESTMENT REPORT
  // ============================================

  window.loadFullInvestmentReport = function() {
    console.log('Loading full investment report...');
    
    if (typeof API !== 'undefined' && API && typeof API.getAllInvestments === 'function') {
      API.getAllInvestments()
        .then(function(investments) {
          console.log('All investments loaded:', investments);
          const reportType = document.getElementById('reportTypeSelect').value || 'byType';
          displayFullReport(investments, reportType);
        })
        .catch(function(error) {
          console.error('Error loading investments:', error);
          showReportError('Error loading investments: ' + error.message);
        });
    } else {
      console.warn('API not available');
      showReportError('API not available');
    }
  };

  window.handleReportTypeChange = function() {
    const reportType = document.getElementById('reportTypeSelect').value;
    if (typeof API !== 'undefined' && API && typeof API.getAllInvestments === 'function') {
      API.getAllInvestments()
        .then(function(investments) {
          displayFullReport(investments, reportType);
        })
        .catch(function(error) {
          console.error('Error:', error);
        });
    }
  };

  function displayFullReport(investments, groupBy) {
    const container = document.getElementById('fullReportContainer');
    if (!container) return;

    if (!investments || investments.length === 0) {
      container.innerHTML = '<div class="empty-report">No investments found</div>';
      return;
    }

    let groupedData = {};
    let totalAmount = 0;
    let totalInterest = 0;
    let totalMaturity = 0;

    // Group investments
    investments.forEach(function(inv) {
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
    });

    // Build HTML
    let html = '';
    
    for (const group in groupedData) {
      const items = groupedData[group];
      let subtotalAmount = 0;
      let subtotalInterest = 0;
      let subtotalMaturity = 0;

      items.forEach(function(item) {
        subtotalAmount += item.amount;
        subtotalInterest += item.interestAmount;
        subtotalMaturity += item.maturityAmount;
      });

      html += '<div class="grouped-report">';
      html += '<div class="group-title">' + group + '</div>';
      html += '<div class="group-table-wrapper">';
      html += '<table class="group-table">';
      html += '<thead><tr>';
      html += '<th>Code</th><th>Bank</th><th>Amount</th><th>Rate (%)</th>';
      html += '<th>Days</th><th>Inv Date</th><th>Maturity Date</th>';
      html += '<th>Interest</th><th>Maturity Amt</th>';
      html += '</tr></thead>';
      html += '<tbody>';

      items.forEach(function(item) {
        html += '<tr>';
        html += '<td>' + (item.investmentCode || '') + '</td>';
        html += '<td>' + (item.bankName || '') + '</td>';
        html += '<td>' + formatCurrency(item.amount) + '</td>';
        html += '<td>' + (item.interestRate || 0).toFixed(2) + '</td>';
        html += '<td>' + (item.duration || 0) + '</td>';
        html += '<td>' + (item.investmentDate || '') + '</td>';
        html += '<td>' + (item.maturityDate || '') + '</td>';
        html += '<td>' + formatCurrency(item.interestAmount) + '</td>';
        html += '<td>' + formatCurrency(item.maturityAmount) + '</td>';
        html += '</tr>';
      });

      html += '<tr class="subtotal-row">';
      html += '<td colspan="2">Subtotal</td>';
      html += '<td>' + formatCurrency(subtotalAmount) + '</td>';
      html += '<td>-</td><td>-</td><td>-</td><td>-</td>';
      html += '<td>' + formatCurrency(subtotalInterest) + '</td>';
      html += '<td>' + formatCurrency(subtotalMaturity) + '</td>';
      html += '</tr>';

      html += '</tbody></table></div></div>';
    }

    // Grand total
    html += '<div class="grand-total-report">';
    html += '<table class="group-table"><tbody>';
    html += '<tr class="grand-total-row">';
    html += '<td colspan="2">GRAND TOTAL</td>';
    html += '<td>' + formatCurrency(totalAmount) + '</td>';
    html += '<td>-</td><td>-</td><td>-</td><td>-</td>';
    html += '<td>' + formatCurrency(totalInterest) + '</td>';
    html += '<td>' + formatCurrency(totalMaturity) + '</td>';
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

    if (typeof API !== 'undefined' && API && typeof API.getInvestmentsByDateRange === 'function') {
      API.getInvestmentsByDateRange(fromDate, toDate)
        .then(function(investments) {
          console.log('Investments loaded:', investments);
          const groupBy = document.getElementById('interestGroupSelect').value || 'byType';
          displayInterestReport(investments, groupBy);
        })
        .catch(function(error) {
          console.error('Error:', error);
          showReportError('Error loading report');
        });
    }
  };

  function displayInterestReport(investments, groupBy) {
    const container = document.getElementById('interestReportContainer');
    if (!container) return;

    if (!investments || investments.length === 0) {
      container.innerHTML = '<div class="empty-report">No investments found for selected period</div>';
      return;
    }

    let groupedData = {};
    let totalInterest = 0;

    investments.forEach(function(inv) {
      let groupKey = groupBy === 'byBank' ? inv.bankName : inv.investmentType;
      
      if (!groupedData[groupKey]) {
        groupedData[groupKey] = [];
      }
      groupedData[groupKey].push(inv);
      totalInterest += inv.interestAmount;
    });

    let html = '';
    
    for (const group in groupedData) {
      const items = groupedData[group];
      let subtotalInterest = 0;

      items.forEach(function(item) {
        subtotalInterest += item.interestAmount;
      });

      html += '<div class="grouped-report">';
      html += '<div class="group-title">' + group + '</div>';
      html += '<div class="group-table-wrapper">';
      html += '<table class="group-table">';
      html += '<thead><tr>';
      html += '<th>Code</th><th>Bank</th><th>Amount</th><th>Rate</th>';
      html += '<th>Days</th><th>Interest</th>';
      html += '</tr></thead>';
      html += '<tbody>';

      items.forEach(function(item) {
        html += '<tr>';
        html += '<td>' + (item.investmentCode || '') + '</td>';
        html += '<td>' + (item.bankName || '') + '</td>';
        html += '<td>' + formatCurrency(item.amount) + '</td>';
        html += '<td>' + (item.interestRate || 0).toFixed(2) + '%</td>';
        html += '<td>' + (item.duration || 0) + '</td>';
        html += '<td>' + formatCurrency(item.interestAmount) + '</td>';
        html += '</tr>';
      });

      html += '<tr class="subtotal-row">';
      html += '<td colspan="5">Subtotal</td>';
      html += '<td>' + formatCurrency(subtotalInterest) + '</td>';
      html += '</tr>';
      html += '</tbody></table></div></div>';
    }

    html += '<div class="grand-total-report">';
    html += '<table class="group-table"><tbody>';
    html += '<tr class="grand-total-row">';
    html += '<td colspan="5">TOTAL INTEREST</td>';
    html += '<td>' + formatCurrency(totalInterest) + '</td>';
    html += '</tr>';
    html += '</tbody></table></div>';

    container.innerHTML = html;
  }

  // ============================================
  // LOAD MATURED INVESTMENTS
  // ============================================

  window.loadMaturedInvestmentsReport = function() {
    const today = new Date().toISOString().split('T')[0];
    
    console.log('Loading matured investments as at:', today);

    if (typeof API !== 'undefined' && API && typeof API.getMaturedInvestments === 'function') {
      API.getMaturedInvestments(today)
        .then(function(investments) {
          console.log('Matured investments loaded:', investments);
          displayMaturedReport(investments);
        })
        .catch(function(error) {
          console.error('Error:', error);
          showReportError('Error loading matured investments');
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
      html += '<td>' + formatCurrency(item.amount) + '</td>';
      html += '<td>' + (item.interestRate || 0).toFixed(2) + '%</td>';
      html += '<td>' + (item.duration || 0) + '</td>';
      html += '<td>' + (item.investmentDate || '') + '</td>';
      html += '<td>' + (item.maturityDate || '') + '</td>';
      html += '<td>' + formatCurrency(item.maturityAmount) + '</td>';
      html += '<td><button class="action-btn" onclick="showMaturedActionMenu(event, \'' + (item.investmentCode || '') + '\')"><i class="fas fa-ellipsis-v"></i></button></td>';
      html += '</tr>';
    });

    tbody.innerHTML = html;
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
          showReportError('Error loading purchase report');
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
    let total = 0;

    investments.forEach(function(item) {
      html += '<tr>';
      html += '<td>' + (item.investmentCode || '') + '</td>';
      html += '<td>' + (item.bankName || '') + '</td>';
      html += '<td>' + (item.investmentType || '') + '</td>';
      html += '<td>' + formatCurrency(item.amount) + '</td>';
      html += '<td>' + (item.interestRate || 0).toFixed(2) + '%</td>';
      html += '<td>' + (item.duration || 0) + '</td>';
      html += '<td>' + (item.investmentDate || '') + '</td>';
      html += '</tr>';
      total += item.amount;
    });

    html += '<tr class="subtotal-row">';
    html += '<td colspan="3">TOTAL</td>';
    html += '<td>' + formatCurrency(total) + '</td>';
    html += '<td colspan="3"></td>';
    html += '</tr>';

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

  function showReportError(message) {
    const container = document.getElementById('fullReportContainer') || document.getElementById('interestReportContainer');
    if (container) {
      container.innerHTML = '<div class="error-report">' + message + '</div>';
    }
  }

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

  window.openRolloverModal = function(investmentCode) {
    const modal = document.getElementById('rolloverModal');
    if (modal) {
      modal.style.display = 'flex';
      document.getElementById('rolloverInvestmentCode').value = investmentCode;
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
      modal.style.display = 'flex';
      document.getElementById('redeemInvestmentCode').value = investmentCode;
    }
  };

  window.closeRedeemModal = function() {
    const modal = document.getElementById('redeemModal');
    if (modal) {
      modal.style.display = 'none';
    }
  };

  window.submitRolloverInvestment = function() {
    console.log('Rollover submission logic here');
    closeRolloverModal();
  };

  window.submitRedeemInvestment = function() {
    console.log('Redeem submission logic here');
    closeRedeemModal();
  };

  // Calculation functions for rollover
  window.handleRolloverInvestmentTypeChange = function() {
    // Add type change logic if needed
  };

  window.calculateRolloverMaturityDate = function() {
    // Add date calculation logic
  };

  window.calculateRolloverMaturityAmount = function() {
    // Add amount calculation logic
  };

})();

