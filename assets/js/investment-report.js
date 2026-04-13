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

    // Matured Report
    const maturedToDate = document.getElementById('maturedToDate');
    if (maturedToDate) maturedToDate.value = today;

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
          showReportError('fullReportContainer', 'Error loading investments: ' + error.message);
        });
    } else {
      console.warn('API not available');
      showReportError('fullReportContainer', 'API not available');
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
          showReportError('fullReportContainer', 'Error loading report');
        });
    }
  };

  function displayFullReport(investments, groupBy) {
    const container = document.getElementById('fullReportContainer');
    if (!container) return;

    if (!investments || investments.length === 0) {
      container.innerHTML = '<div class="empty-report"><i class="fas fa-inbox"></i><p>No investments found</p></div>';
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
      html += '<th>Code</th><th>Bank</th><th>Type</th><th>Amount (GHc)</th><th>Rate (%)</th>';
      html += '<th>Duration (Days)</th><th>Inv. Date</th><th>Maturity Date</th>';
      html += '<th>Interest (GHc)</th><th>Maturity Amt (GHc)</th><th>Accrued Monthly</th><th>Accrued To Date</th>';
      html += '</tr></thead>';
      html += '<tbody>';

      items.forEach(function(item) {
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
        html += '<td class="text-right">' + formatCurrency(item.accruedMonthly || 0) + '</td>';
        html += '<td class="text-right">' + formatCurrency(item.accruedToDate || 0) + '</td>';
        html += '</tr>';
      });

      html += '<tr class="subtotal-row">';
      html += '<td colspan="3">Subtotal</td>';
      html += '<td class="text-right">' + formatCurrency(subtotalAmount) + '</td>';
      html += '<td>-</td><td>-</td><td>-</td><td>-</td>';
      html += '<td class="text-right">' + formatCurrency(subtotalInterest) + '</td>';
      html += '<td class="text-right">' + formatCurrency(subtotalMaturity) + '</td>';
      html += '<td>-</td><td>-</td>';
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
    html += '<td>-</td><td>-</td>';
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
          showReportError('interestReportContainer', 'Error loading report');
        });
    }
  };

  function displayInterestReport(investments, groupBy) {
    const container = document.getElementById('interestReportContainer');
    if (!container) return;

    if (!investments || investments.length === 0) {
      container.innerHTML = '<div class="empty-report"><i class="fas fa-inbox"></i><p>No investments found for selected period</p></div>';
      return;
    }

    let groupedData = {};
    let totalAmount = 0;
    let totalInterest = 0;

    investments.forEach(function(inv) {
      let groupKey = groupBy === 'byBank' ? inv.bankName : inv.investmentType;
      
      if (!groupedData[groupKey]) {
        groupedData[groupKey] = [];
      }
      groupedData[groupKey].push(inv);
      totalAmount += inv.amount;
      totalInterest += inv.interestAmount;
    });

    let html = '';
    
    for (const group in groupedData) {
      const items = groupedData[group];
      let subtotalAmount = 0;
      let subtotalInterest = 0;

      items.forEach(function(item) {
        subtotalAmount += item.amount;
        subtotalInterest += item.interestAmount;
      });

      html += '<div class="grouped-report">';
      html += '<div class="group-title">' + group + '</div>';
      html += '<div class="group-table-wrapper">';
      html += '<table class="group-table">';
      html += '<thead><tr>';
      html += '<th>Code</th><th>Bank</th><th>Type</th><th>Amount (GHc)</th><th>Rate (%)</th>';
      html += '<th>Duration (Days)</th><th>Inv. Date</th><th>Maturity Date</th><th>Interest (GHc)</th>';
      html += '</tr></thead>';
      html += '<tbody>';

      items.forEach(function(item) {
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
        html += '</tr>';
      });

      html += '<tr class="subtotal-row">';
      html += '<td colspan="3">Subtotal</td>';
      html += '<td class="text-right">' + formatCurrency(subtotalAmount) + '</td>';
      html += '<td>-</td><td>-</td><td>-</td><td>-</td>';
      html += '<td class="text-right">' + formatCurrency(subtotalInterest) + '</td>';
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
    html += '</tr>';
    html += '</tbody></table></div>';

    container.innerHTML = html;
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
      // Load investment details here if needed
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
      // Load investment details here if needed
    }
  };

  window.closeRedeemModal = function() {
    const modal = document.getElementById('redeemModal');
    if (modal) {
      modal.style.display = 'none';
    }
  };

  window.submitRolloverInvestment = function() {
    const investmentCode = document.getElementById('rolloverInvestmentCode').value;
    const investmentType = document.getElementById('rolloverInvestmentType').value;
    const investmentDate = document.getElementById('rolloverInvestmentDate').value;
    const amount = document.getElementById('rolloverAmount').value;
    const interestRate = document.getElementById('rolloverInterestRate').value;
    const duration = document.getElementById('rolloverDuration').value;
    const maturityDate = document.getElementById('rolloverMaturityDate').value;

    console.log('Rollover submission:', {
      investmentCode: investmentCode,
      investmentType: investmentType,
      investmentDate: investmentDate,
      amount: amount,
      interestRate: interestRate,
      duration: duration,
      maturityDate: maturityDate
    });

    // TODO: Implement rollover logic with API call
    showMessage('Rollover investment submitted successfully!', 'success');
    closeRolloverModal();
    loadMaturedInvestmentsReport();
  };

  window.submitRedeemInvestment = function() {
    const investmentCode = document.getElementById('redeemInvestmentCode').value;
    const redeemDate = document.getElementById('redeemDate').value;

    console.log('Redeem submission:', {
      investmentCode: investmentCode,
      redeemDate: redeemDate
    });

    // TODO: Implement redeem logic with API call
    showMessage('Investment redeemed successfully!', 'success');
    closeRedeemModal();
    loadMaturedInvestmentsReport();
  };

  // Calculation functions for rollover
  window.handleRolloverInvestmentTypeChange = function() {
    // Add type change logic if needed
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
    
    if (!amountField || !interestRateField || !durationField) return;
    
    const amount = parseFloat(amountField.value) || 0;
    const interestRate = parseFloat(interestRateField.value) || 0;
    const duration = parseInt(durationField.value) || 0;
    
    // Default day count for calculations
    const dayCount = 365;

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

})();
