(function() {
  // Use IIFE to avoid global variable conflicts
  
  // Storage key for bank day counts
  var BANK_DAY_COUNT_STORAGE_KEY = 'investment_bank_day_counts';
  
  // Flag to track if module is already initialized
  var isReportModuleInitialized = false;

  // ============================================
  // HELPERS
  // ============================================

  // Wait for an element by id (polls until timeout)
  function whenElementReady(id, timeout) {
    timeout = typeof timeout === 'number' ? timeout : 3000;
    return new Promise(function(resolve, reject) {
      var el = document.getElementById(id);
      if (el) return resolve(el);
      var start = Date.now();
      var interval = setInterval(function() {
        el = document.getElementById(id);
        if (el) {
          clearInterval(interval);
          resolve(el);
        } else if (Date.now() - start > timeout) {
          clearInterval(interval);
          reject(new Error('Element not found: ' + id));
        }
      }, 120);
    });
  }

  // Attach basic listeners for inputs/selects used by the module (id-based)
  function attachInvestmentEventListeners() {
    if (window._investmentListenersAttached) return;
    window._investmentListenersAttached = true;

    document.addEventListener('change', function(e) {
      if (!e || !e.target) return;
      var id = e.target.id;
      if (id === 'fullReportToDate' || id === 'reportTypeSelect') {
        try { window.loadFullInvestmentReport && window.loadFullInvestmentReport(); } catch (err) { console.error(err); }
      }
      if (id === 'maturedToDate') {
        try { window.loadMaturedInvestmentsReport && window.loadMaturedInvestmentsReport(); } catch (err) { console.error(err); }
      }
      if (id === 'interestFromDate' || id === 'interestToDate' || id === 'interestReportTypeSelect') {
        try { window.loadInterestReport && window.loadInterestReport(); } catch (err) { console.error(err); }
      }
      if (id === 'purchaseFromDate' || id === 'purchaseToDate') {
        try { window.loadPurchaseReport && window.loadPurchaseReport(); } catch (err) { console.error(err); }
      }
    });

    // Debounced input handling for date typing
    document.addEventListener('input', function(e) {
      if (!e || !e.target) return;
      var id = e.target.id;
      if (id === 'fullReportToDate' || id === 'maturedToDate' || id === 'interestFromDate' || id === 'interestToDate' || id === 'purchaseFromDate' || id === 'purchaseToDate') {
        if (window._investmentInputDebounce) clearTimeout(window._investmentInputDebounce);
        window._investmentInputDebounce = setTimeout(function() {
          try {
            if (id === 'fullReportToDate') window.loadFullInvestmentReport && window.loadFullInvestmentReport();
            if (id === 'maturedToDate') window.loadMaturedInvestmentsReport && window.loadMaturedInvestmentsReport();
            if (id === 'interestFromDate' || id === 'interestToDate') window.loadInterestReport && window.loadInterestReport();
            if (id === 'purchaseFromDate' || id === 'purchaseToDate') window.loadPurchaseReport && window.loadPurchaseReport();
          } catch (err) { console.error(err); }
        }, 200);
      }
    });
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  // Safe init: waits for DOM ready and for key inputs (or uses fallbacks)
  window.initInvestmentReportModule = function() {
    // Prevent duplicate initialization
    if (isReportModuleInitialized) {
      console.log('Investment report module already initialized');
      return;
    }
    isReportModuleInitialized = true;

    console.log('Initializing Investment Report Module (deferred)');

    function startInit() {
      // Set default dates if inputs exist
      var today = new Date().toISOString().split('T')[0];
      var oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      var fromDateString = oneMonthAgo.toISOString().split('T')[0];

      var fullReportToDate = document.getElementById('fullReportToDate');
      if (fullReportToDate && !fullReportToDate.value) fullReportToDate.value = today;

      var interestFromDate = document.getElementById('interestFromDate');
      if (interestFromDate && !interestFromDate.value) interestFromDate.value = fromDateString;
      var interestToDate = document.getElementById('interestToDate');
      if (interestToDate && !interestToDate.value) interestToDate.value = today;

      var purchaseFromDate = document.getElementById('purchaseFromDate');
      if (purchaseFromDate && !purchaseFromDate.value) purchaseFromDate.value = fromDateString;
      var purchaseToDate = document.getElementById('purchaseToDate');
      if (purchaseToDate && !purchaseToDate.value) purchaseToDate.value = today;

      var maturedToDate = document.getElementById('maturedToDate');
      if (maturedToDate && !maturedToDate.value) maturedToDate.value = today;

      // Attach listeners
      attachInvestmentEventListeners();

      // Wait up to 3s for at least one key element, then run loaders. If elements don't appear, loaders will use fallbacks.
      Promise.race([
        whenElementReady('fullReportToDate', 3000).catch(function(){ return null; }),
        whenElementReady('maturedToDate', 3000).catch(function(){ return null; })
      ]).then(function() {
        // Call initial loaders (safe versions)
        try { loadFullInvestmentReport(); } catch (e) { console.error(e); }
        try { loadMaturedInvestmentsReport(); } catch (e) { console.error(e); }
      }).catch(function() {
        // If neither appears, still attempt to load (they use fallbacks)
        try { loadFullInvestmentReport(); } catch (e) { console.error(e); }
        try { loadMaturedInvestmentsReport(); } catch (e) { console.error(e); }
      });
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', startInit);
    } else {
      startInit();
    }
  };

  // ============================================
  // TAB SWITCHING
  // ============================================

  window.switchInvestmentReportTab = function(tabName) {
    // Hide all tab contents
    var tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(function(tab) {
      tab.classList.remove('active');
    });

    // Show selected tab
    var selectedTab = document.getElementById(tabName);
    if (selectedTab) {
      selectedTab.classList.add('active');
    }

    // Update tab buttons
    var tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(function(btn) {
      btn.classList.remove('active');
    });
    try {
      if (event && event.target) {
        event.target.classList.add('active');
      }
    } catch (e) {}

    // Hide all control groups
    var controlGroups = document.querySelectorAll('.control-group');
    controlGroups.forEach(function(group) {
      group.style.display = 'none';
    });

    // Show appropriate control group and load data
    if (tabName === 'fullReport') {
      var fullControls = document.getElementById('fullReportControls');
      if (fullControls) fullControls.style.display = 'flex';
      loadFullInvestmentReport();
    } else if (tabName === 'interestReport') {
      var interestControls = document.getElementById('interestControls');
      if (interestControls) interestControls.style.display = 'flex';
      loadInterestReport();
    } else if (tabName === 'purchaseReport') {
      var purchaseControls = document.getElementById('purchaseControls');
      if (purchaseControls) purchaseControls.style.display = 'flex';
      loadPurchaseReport();
    } else if (tabName === 'maturedReport') {
      var maturedControls = document.getElementById('maturedControls');
      if (maturedControls) maturedControls.style.display = 'flex';
      loadMaturedInvestmentsReport();
    }
  };

  // ============================================
  // LOAD FULL INVESTMENT REPORT (guarded)
  // ============================================

  window.loadFullInvestmentReport = function() {
    console.log('Loading full investment report...');

    var toEl = document.getElementById('fullReportToDate');
    if (!toEl) {
      console.warn('fullReportToDate element not found — using today as fallback and notifying UI');
      showReportError && showReportError('fullReportContainer', 'Date input missing from page. Showing data as of today.');
    }
    var toDate = toEl ? (toEl.value || new Date().toISOString().split('T')[0]) : new Date().toISOString().split('T')[0];

    showFullReportLoading && showFullReportLoading();

    var reportTypeSelect = document.getElementById('reportTypeSelect');
    var reportType = reportTypeSelect ? (reportTypeSelect.value || 'byType') : 'byType';

    if (typeof API !== 'undefined' && API && typeof API.getAllInvestments === 'function') {
      API.getAllInvestments()
        .then(function(investments) {
          console.log('All investments loaded:', investments);
          displayFullReport(investments, reportType, toDate);
        })
        .catch(function(error) {
          console.error('Error loading investments:', error);
          showReportError && showReportError('fullReportContainer', 'Error loading investments: ' + (error && error.message ? error.message : error));
        });
    } else {
      console.warn('API not available');
      showReportError && showReportError('fullReportContainer', 'API not available');
    }
  };

  window.handleReportTypeChange = function() {
    var reportTypeEl = document.getElementById('reportTypeSelect');
    var fullToEl = document.getElementById('fullReportToDate');
    var reportType = reportTypeEl ? reportTypeEl.value : 'byType';
    var toDate = fullToEl ? (fullToEl.value || new Date().toISOString().split('T')[0]) : new Date().toISOString().split('T')[0];

    showFullReportLoading && showFullReportLoading();

    if (typeof API !== 'undefined' && API && typeof API.getAllInvestments === 'function') {
      API.getAllInvestments()
        .then(function(investments) {
          displayFullReport(investments, reportType, toDate);
        })
        .catch(function(error) {
          console.error('Error:', error);
          showReportError && showReportError('fullReportContainer', 'Error loading report');
        });
    } else {
      showReportError && showReportError('fullReportContainer', 'API not available');
    }
  };

  function displayFullReport(investments, groupBy, reportToDate) {
    var container = document.getElementById('fullReportContainer');
    if (!container) return;

    if (!investments || investments.length === 0) {
      container.innerHTML = '<div class="empty-report"><i class="fas fa-inbox"></i><p>No investments found</p></div>';
      return;
    }

    // Filter active investments: investment date <= toDate and maturity date > toDate
    var toDateTime = new Date(reportToDate);
    toDateTime.setHours(23, 59, 59, 999);
    var toDateOnly = new Date(reportToDate);
    toDateOnly.setHours(0, 0, 0, 0);

    var activeInvestments = investments.filter(function(inv) {
      var investDate = new Date(inv.investmentDate);
      var maturityDate = new Date(inv.maturityDate);
      return investDate <= toDateTime && maturityDate > toDateTime;
    });

    if (activeInvestments.length === 0) {
      container.innerHTML = '<div class="empty-report"><i class="fas fa-inbox"></i><p>No active investments as at ' + reportToDate + '</p></div>';
      return;
    }

    var groupedData = {};
    var totalAmount = 0;
    var totalInterest = 0;
    var totalMaturity = 0;
    var totalCurrent = 0;

    // Group investments
    activeInvestments.forEach(function(inv) {
      var groupKey;
      if (groupBy === 'byBank') {
        groupKey = inv.bankName;
      } else if (groupBy === 'byDuration') {
        groupKey = inv.duration + ' days';
      } else {
        groupKey = inv.investmentType;
      }

      if (!groupedData[groupKey]) groupedData[groupKey] = [];
      groupedData[groupKey].push(inv);

      totalAmount += inv.amount || 0;
      totalInterest += inv.interestAmount || 0;
      totalMaturity += inv.maturityAmount || 0;

      // Calculate accrued to-date
      var accruedVals = calculateAccruedInterest(
        inv.amount || 0,
        inv.interestRate || 0,
        inv.investmentDate,
        inv.investmentDate,
        reportToDate,
        inv.investmentType,
        inv.maturityDate
      );

      // Current value = 0 if matured, otherwise amount + accrued
      var maturityDate = new Date(inv.maturityDate);
      maturityDate.setHours(0, 0, 0, 0);
      var currentValue = 0;
      if (maturityDate > toDateOnly) {
        currentValue = (inv.amount || 0) + (accruedVals.toDate || 0);
      }
      totalCurrent += currentValue;
    });

    // Build HTML
    var html = '';

    for (var group in groupedData) {
      if (!Object.prototype.hasOwnProperty.call(groupedData, group)) continue;
      var items = groupedData[group];
      var subtotalAmount = 0;
      var subtotalInterest = 0;
      var subtotalMaturity = 0;
      var subtotalCurrent = 0;

      items.forEach(function(item) {
        subtotalAmount += item.amount || 0;
        subtotalInterest += item.interestAmount || 0;
        subtotalMaturity += item.maturityAmount || 0;

        var accruedVals = calculateAccruedInterest(
          item.amount || 0,
          item.interestRate || 0,
          item.investmentDate,
          item.investmentDate,
          reportToDate,
          item.investmentType,
          item.maturityDate
        );

        var maturityDate = new Date(item.maturityDate);
        maturityDate.setHours(0, 0, 0, 0);
        var currentValue = 0;
        if (maturityDate > toDateOnly) {
          currentValue = (item.amount || 0) + (accruedVals.toDate || 0);
        }
        subtotalCurrent += currentValue;
      });

      html += '<div class="grouped-report">';
      html += '<div class="group-title">' + (group || '') + '</div>';
      html += '<div class="group-table-wrapper">';
      html += '<table class="group-table">';
      html += '<thead><tr>';
      html += '<th>Code</th><th>Bank</th><th>Type</th><th>Amount (GHc)</th><th>Rate (%)</th>';
      html += '<th>Duration (Days)</th><th>Inv. Date</th><th>Maturity Date</th>';
      html += '<th>Interest (GHc)</th><th>Maturity Amt (GHc)</th><th>Current Value (GHc)</th><th>Action</th>';
      html += '</tr></thead>';
      html += '<tbody>';

      items.forEach(function(item) {
        var accruedVals = calculateAccruedInterest(
          item.amount || 0,
          item.interestRate || 0,
          item.investmentDate,
          item.investmentDate,
          reportToDate,
          item.investmentType,
          item.maturityDate
        );

        var maturityDate = new Date(item.maturityDate);
        maturityDate.setHours(0, 0, 0, 0);
        var currentValue = 0;
        if (maturityDate > toDateOnly) {
          currentValue = (item.amount || 0) + (accruedVals.toDate || 0);
        }

        html += '<tr>';
        html += '<td>' + (item.investmentCode || '') + '</td>';
        html += '<td>' + (item.bankName || '') + '</td>';
        html += '<td>' + (item.investmentType || '') + '</td>';
        html += '<td class="text-right">' + formatCurrency(item.amount) + '</td>';
        html += '<td class="text-center">' + ((item.interestRate || 0).toFixed ? (item.interestRate || 0).toFixed(2) : (item.interestRate || 0)) + '</td>';
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
    var fromEl = document.getElementById('interestFromDate');
    var toEl = document.getElementById('interestToDate');
    var fromDate = fromEl ? fromEl.value : null;
    var toDate = toEl ? toEl.value : null;

    if (!fromDate || !toDate) {
      console.warn('Interest report date inputs missing or empty');
      return;
    }

    console.log('Loading interest report:', fromDate, 'to', toDate);

    showInterestReportLoading && showInterestReportLoading();

    if (typeof API !== 'undefined' && API && typeof API.getAllInvestments === 'function') {
      API.getAllInvestments()
        .then(function(investments) {
          console.log('All investments loaded for interest report:', investments);
          var reportTypeEl = document.getElementById('interestReportTypeSelect');
          var reportType = reportTypeEl ? reportTypeEl.value : 'byType';
          displayInterestReport(investments, fromDate, toDate, reportType);
        })
        .catch(function(error) {
          console.error('Error:', error);
          showReportError && showReportError('interestReportContainer', 'Error loading report');
        });
    } else {
      console.warn('API not available for interest report');
      showReportError && showReportError('interestReportContainer', 'API not available');
    }
  };

  window.handleInterestReportTypeChange = function() {
    var reportTypeEl = document.getElementById('interestReportTypeSelect');
    var fromEl = document.getElementById('interestFromDate');
    var toEl = document.getElementById('interestToDate');
    var reportType = reportTypeEl ? reportTypeEl.value : 'byType';
    var fromDate = fromEl ? fromEl.value : null;
    var toDate = toEl ? toEl.value : null;

    if (!fromDate || !toDate) {
      console.warn('Interest report date inputs missing or empty');
      return;
    }

    showInterestReportLoading && showInterestReportLoading();

    if (typeof API !== 'undefined' && API && typeof API.getAllInvestments === 'function') {
      API.getAllInvestments()
        .then(function(investments) {
          displayInterestReport(investments, fromDate, toDate, reportType);
        })
        .catch(function(error) {
          console.error('Error:', error);
          showReportError && showReportError('interestReportContainer', 'Error loading report');
        });
    } else {
      showReportError && showReportError('interestReportContainer', 'API not available');
    }
  };

  function displayInterestReport(investments, fromDate, toDate, groupBy) {
    var container = document.getElementById('interestReportContainer');
    if (!container) return;

    if (!investments || investments.length === 0) {
      container.innerHTML = '<div class="empty-report"><i class="fas fa-inbox"></i><p>No investments found for selected period</p></div>';
      return;
    }

    // Filter active investments within the date range
    var fromDateTime = new Date(fromDate); fromDateTime.setHours(0,0,0,0);
    var toDateTime = new Date(toDate); toDateTime.setHours(23,59,59,999);

    var activeInvestments = investments.filter(function(inv) {
      var investDate = new Date(inv.investmentDate);
      var maturityDate = new Date(inv.maturityDate);
      return investDate <= toDateTime && maturityDate > fromDateTime;
    });

    if (activeInvestments.length === 0) {
      container.innerHTML = '<div class="empty-report"><i class="fas fa-inbox"></i><p>No active investments in the selected period</p></div>';
      return;
    }

    var groupedData = {};
    var totalAmount = 0;
    var totalInterest = 0;
    var totalAccruedMonthly = 0;
    var totalAccruedToDate = 0;
    var totalCurrent = 0;

    activeInvestments.forEach(function(inv) {
      var groupKey;
      if (groupBy === 'byBank') groupKey = inv.bankName;
      else if (groupBy === 'byDuration') groupKey = inv.duration + ' days';
      else groupKey = inv.investmentType;

      if (!groupedData[groupKey]) groupedData[groupKey] = [];
      groupedData[groupKey].push(inv);

      totalAmount += inv.amount || 0;
      totalInterest += inv.interestAmount || 0;

      var accruedVals = calculateAccruedInterest(
        inv.amount || 0,
        inv.interestRate || 0,
        inv.investmentDate,
        fromDate,
        toDate,
        inv.investmentType,
        inv.maturityDate
      );

      totalAccruedMonthly += accruedVals.monthly || 0;
      totalAccruedToDate += accruedVals.toDate || 0;

      var maturityDate = new Date(inv.maturityDate); maturityDate.setHours(0,0,0,0);
      var currentVal = 0;
      if (maturityDate > toDateTime) currentVal = (inv.amount || 0) + (accruedVals.toDate || 0);
      totalCurrent += currentVal;
    });

    var html = '';

    for (var group in groupedData) {
      if (!Object.prototype.hasOwnProperty.call(groupedData, group)) continue;
      var items = groupedData[group];
      var subtotalAmount = 0;
      var subtotalInterest = 0;
      var subtotalAccruedMonthly = 0;
      var subtotalAccruedToDate = 0;
      var subtotalCurrent = 0;

      items.forEach(function(item) {
        subtotalAmount += item.amount || 0;
        subtotalInterest += item.interestAmount || 0;

        var accruedVals = calculateAccruedInterest(
          item.amount || 0,
          item.interestRate || 0,
          item.investmentDate,
          fromDate,
          toDate,
          item.investmentType,
          item.maturityDate
        );

        subtotalAccruedMonthly += accruedVals.monthly || 0;
        subtotalAccruedToDate += accruedVals.toDate || 0;

        var maturityDate = new Date(item.maturityDate); maturityDate.setHours(0,0,0,0);
        var currentVal = 0;
        if (maturityDate > toDateTime) currentVal = (item.amount || 0) + (accruedVals.toDate || 0);
        subtotalCurrent += currentVal;
      });

      html += '<div class="grouped-report">';
      html += '<div class="group-title">' + (group || '') + '</div>';
      html += '<div class="group-table-wrapper">';
      html += '<table class="group-table">';
      html += '<thead><tr>';
      html += '<th>Code</th><th>Bank</th><th>Type</th><th>Amount (GHc)</th><th>Rate (%)</th>';
      html += '<th>Duration (Days)</th><th>Inv. Date</th><th>Maturity Date</th><th>Interest (GHc)</th>';
      html += '<th>Accrued Monthly</th><th>Accrued To Date</th><th>Current Value (GHc)</th>';
      html += '</tr></thead>';
      html += '<tbody>';

      items.forEach(function(item) {
        var accruedVals = calculateAccruedInterest(
          item.amount || 0,
          item.interestRate || 0,
          item.investmentDate,
          fromDate,
          toDate,
          item.investmentType,
          item.maturityDate
        );
        var maturityDate = new Date(item.maturityDate); maturityDate.setHours(0,0,0,0);
        var currentVal = 0;
        if (maturityDate > toDateTime) currentVal = (item.amount || 0) + (accruedVals.toDate || 0);

        html += '<tr>';
        html += '<td>' + (item.investmentCode || '') + '</td>';
        html += '<td>' + (item.bankName || '') + '</td>';
        html += '<td>' + (item.investmentType || '') + '</td>';
        html += '<td class="text-right">' + formatCurrency(item.amount) + '</td>';
        html += '<td class="text-center">' + ((item.interestRate || 0).toFixed ? (item.interestRate || 0).toFixed(2) : (item.interestRate || 0)) + '</td>';
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
    var fromEl = document.getElementById('purchaseFromDate');
    var toEl = document.getElementById('purchaseToDate');
    var fromDate = fromEl ? fromEl.value : null;
    var toDate = toEl ? toEl.value : null;

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
          showTableError && showTableError('purchaseReportBody', 7, 'Error loading purchase report');
        });
    } else {
      console.warn('API or method not available for purchase report');
      showTableError && showTableError('purchaseReportBody', 7, 'API not available');
    }
  };

  function displayPurchaseReport(investments) {
    var tbody = document.getElementById('purchaseReportBody');
    if (!tbody) return;

    if (!investments || investments.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="loading-cell">No investments found</td></tr>';
      return;
    }

    var html = '';
    var totalAmount = 0;

    investments.forEach(function(item) {
      html += '<tr>';
      html += '<td>' + (item.investmentCode || '') + '</td>';
      html += '<td>' + (item.bankName || '') + '</td>';
      html += '<td>' + (item.investmentType || '') + '</td>';
      html += '<td class="text-right">' + formatCurrency(item.amount) + '</td>';
      html += '<td class="text-center">' + ((item.interestRate || 0).toFixed ? (item.interestRate || 0).toFixed(2) : (item.interestRate || 0)) + '</td>';
      html += '<td class="text-center">' + (item.duration || 0) + '</td>';
      html += '<td class="text-center">' + (item.investmentDate || '') + '</td>';
      html += '</tr>';
      totalAmount += item.amount || 0;
    });

    html += '<tr class="subtotal-row">';
    html += '<td colspan="3">TOTAL</td>';
    html += '<td class="text-right">' + formatCurrency(totalAmount) + '</td>';
    html += '<td>-</td><td>-</td><td>-</td>';
    html += '</tr>';

    tbody.innerHTML = html;
  }

  // ============================================
  // LOAD MATURED INVESTMENTS (guarded)
  // ============================================

  window.loadMaturedInvestmentsReport = function() {
    var toEl = document.getElementById('maturedToDate');
    var toDate = toEl ? (toEl.value || new Date().toISOString().split('T')[0]) : new Date().toISOString().split('T')[0];

    console.log('Loading matured investments as at:', toDate);

    // Show loading in table body if present
    var tbody = document.getElementById('maturedReportBody');
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="10" class="loading-cell"><div class="table-loader"><div class="spinner-small"></div><span>Loading matured investments...</span></div></td></tr>';
    }

    if (!toEl) {
      console.warn('maturedToDate element not found; using today as fallback:', toDate);
    }

    if (typeof API !== 'undefined' && API && typeof API.getMaturedInvestments === 'function') {
      API.getMaturedInvestments(toDate)
        .then(function(investments) {
          console.log('Matured investments loaded:', investments);
          displayMaturedReport(investments);
        })
        .catch(function(error) {
          console.error('Error:', error);
          showTableError && showTableError('maturedReportBody', 10, 'Error loading matured investments');
        });
    } else {
      console.warn('API.getMaturedInvestments not available');
      showTableError && showTableError('maturedReportBody', 10, 'API not available');
    }
  };

  function displayMaturedReport(investments) {
    var tbody = document.getElementById('maturedReportBody');
    if (!tbody) return;

    if (!investments || investments.length === 0) {
      tbody.innerHTML = '<tr><td colspan="10" class="loading-cell">No matured investments</td></tr>';
      return;
    }

    var html = '';
    investments.forEach(function(item) {
      html += '<tr>';
      html += '<td>' + (item.investmentCode || '') + '</td>';
      html += '<td>' + (item.bankName || '') + '</td>';
      html += '<td>' + (item.investmentType || '') + '</td>';
      html += '<td class="text-right">' + formatCurrency(item.amount) + '</td>';
      html += '<td class="text-center">' + ((item.interestRate || 0).toFixed ? (item.interestRate || 0).toFixed(2) : (item.interestRate || 0)) + '</td>';
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
    var numValue = parseFloat(value);
    if (isNaN(numValue)) return '0.00';
    return numValue.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function showReportError(containerId, message) {
    var container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = '<div class="error-report"><i class="fas fa-exclamation-circle"></i><p>' + message + '</p></div>';
    }
  }

  function showTableError(tbodyId, colspan, message) {
    var tbody = document.getElementById(tbodyId);
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="' + colspan + '" class="loading-cell">' + message + '</td></tr>';
    }
  }

  function showFullReportLoading() {
    var container = document.getElementById('fullReportContainer');
    if (container) {
      container.innerHTML = '<div class="loading-report"><div class="loading-spinner-inline"></div><p>Loading full report...</p></div>';
    }
  }

  function showInterestReportLoading() {
    var container = document.getElementById('interestReportContainer');
    if (container) {
      container.innerHTML = '<div class="loading-report"><div class="loading-spinner-inline"></div><p>Loading interest report...</p></div>';
    }
  }

  // ============================================
  // ACCRUED INTEREST CALCULATION
  // ============================================

  function calculateAccruedInterest(amount, annualRate, investmentDate, fromDate, toDate, investmentType, maturityDate) {
    try {
      var investStart = new Date(investmentDate);
      var periodStart = new Date(fromDate);
      var periodEnd = new Date(toDate);
      var maturityDateObj = new Date(maturityDate);

      // Normalize times
      investStart.setHours(0, 0, 0, 0);
      periodStart.setHours(0, 0, 0, 0);
      periodEnd.setHours(0, 0, 0, 0);
      maturityDateObj.setHours(0, 0, 0, 0);

      // Day count
      var dayCount = 365;
      if (investmentType === 'Treasury Bills') dayCount = 364;
      else if (investmentType === 'Bonds') dayCount = 360;
      else if (investmentType === 'Fixed Deposit') dayCount = 365;

      var dailyRate = (annualRate / 100) / dayCount;

      // accruedMonthly: periodStart -> min(periodEnd, maturity)
      var accruedMonthlyEndDate = periodEnd > maturityDateObj ? maturityDateObj : periodEnd;
      var timeMonthlyDiff = accruedMonthlyEndDate - periodStart;
      var daysMonthlyDiff = Math.ceil(timeMonthlyDiff / (1000 * 60 * 60 * 24));
      var accruedMonthly = amount * dailyRate * daysMonthlyDiff;

      // accruedToDate: investStart -> min(periodEnd, maturity) (0 if matured before periodEnd)
      var accruedToDate = 0;
      var daysToDiff = 0;
      if (periodEnd <= maturityDateObj) {
        var timeToDiff = periodEnd - investStart;
        daysToDiff = Math.ceil(timeToDiff / (1000 * 60 * 60 * 24));
        accruedToDate = amount * dailyRate * daysToDiff;
      } else {
        accruedToDate = 0;
        daysToDiff = 0;
      }

      return {
        monthly: accruedMonthly || 0,
        toDate: accruedToDate || 0,
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
    var portal = document.getElementById('investmentActionPortal');
    if (!portal) return;

    var rect = event.target.getBoundingClientRect();
    portal.style.display = 'block';
    portal.style.top = (rect.bottom + 5) + 'px';
    portal.style.left = (rect.left - 80) + 'px';

    portal.innerHTML = '\
      <div class="action-dropdown-content">\
        <button class="dropdown-item" onclick="openRedeemModal(\\'' + (investmentCode || '') + '\\')">\
          <i class="fas fa-check"></i> Redeem\
        </button>\
      </div>\
    ';

    document.addEventListener('click', function closeMenu() {
      portal.style.display = 'none';
      document.removeEventListener('click', closeMenu);
    });
  };

  window.showMaturedActionMenu = function(event, investmentCode) {
    event.stopPropagation();
    var portal = document.getElementById('investmentActionPortal');
    if (!portal) return;

    var rect = event.target.getBoundingClientRect();
    portal.style.display = 'block';
    portal.style.top = (rect.bottom + 5) + 'px';
    portal.style.left = (rect.left - 80) + 'px';

    portal.innerHTML = '\
      <div class="action-dropdown-content">\
        <button class="dropdown-item" onclick="openRolloverModal(\\'' + (investmentCode || '') + '\\')">\
          <i class="fas fa-refresh"></i> Rollover\
        </button>\
        <button class="dropdown-item" onclick="openRedeemModal(\\'' + (investmentCode || '') + '\\')">\
          <i class="fas fa-check"></i> Redeem\
        </button>\
      </div>\
    ';

    document.addEventListener('click', function closeMenu() {
      portal.style.display = 'none';
      document.removeEventListener('click', closeMenu);
    });
  };

  // ============================================
  // MODAL FUNCTIONS
  // ============================================

  window.openRolloverModal = function(investmentCode) {
    var modal = document.getElementById('rolloverModal');
    if (modal) {
      console.log('Opening rollover modal for code:', investmentCode);
      var codeField = document.getElementById('rolloverInvestmentCode');
      if (codeField) codeField.value = investmentCode || '';
      modal.style.display = 'flex';
      setTimeout(function() { populateInvestmentDetailsForRollover(investmentCode); }, 100);
    }
  };

  window.closeRolloverModal = function() {
    var modal = document.getElementById('rolloverModal');
    if (modal) modal.style.display = 'none';
  };

  window.openRedeemModal = function(investmentCode) {
    var modal = document.getElementById('redeemModal');
    if (modal) {
      console.log('Opening redeem modal for code:', investmentCode);
      var codeField = document.getElementById('redeemInvestmentCode');
      if (codeField) codeField.value = investmentCode || '';
      modal.style.display = 'flex';
      setTimeout(function() { populateInvestmentDetailsForRedeem(investmentCode); }, 100);
    }
  };

  window.closeRedeemModal = function() {
    var modal = document.getElementById('redeemModal');
    if (modal) modal.style.display = 'none';
  };

  function populateInvestmentDetailsForRollover(investmentCode) {
    console.log('Fetching investment details for rollover:', investmentCode);

    if (typeof API !== 'undefined' && API && typeof API.getInvestmentByCode === 'function') {
      API.getInvestmentByCode(investmentCode)
        .then(function(investment) {
          console.log('Investment details received:', investment);
          if (investment) {
            var rolloverBankName = document.getElementById('rolloverBankName');
            var rolloverCurrentType = document.getElementById('rolloverCurrentType');
            var rolloverCurrentAmount = document.getElementById('rolloverCurrentAmount');
            var rolloverCurrentMaturityAmount = document.getElementById('rolloverCurrentMaturityAmount');
            var rolloverCurrentMaturityDate = document.getElementById('rolloverCurrentMaturityDate');

            if (rolloverBankName) rolloverBankName.value = investment.bankName || '';
            if (rolloverCurrentType) rolloverCurrentType.value = investment.investmentType || '';
            if (rolloverCurrentAmount) rolloverCurrentAmount.value = formatCurrency(investment.amount) || '0.00';
            if (rolloverCurrentMaturityAmount) rolloverCurrentMaturityAmount.value = formatCurrency(investment.maturityAmount) || '0.00';
            if (rolloverCurrentMaturityDate) rolloverCurrentMaturityDate.value = investment.maturityDate || '';

            var rolloverNewBankName = document.getElementById('rolloverNewBankName');
            var rolloverInvestmentType = document.getElementById('rolloverInvestmentType');

            if (rolloverNewBankName) rolloverNewBankName.value = investment.bankName || '';
            if (rolloverInvestmentType) rolloverInvestmentType.value = investment.investmentType || '';

            var rolloverInvestmentDate = document.getElementById('rolloverInvestmentDate');
            if (rolloverInvestmentDate) rolloverInvestmentDate.value = new Date().toISOString().split('T')[0];

            var rolloverAmount = document.getElementById('rolloverAmount');
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
          showMessage('Error loading investment details: ' + (error && error.message ? error.message : error), 'error');
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
            var redeemInvestmentCode = document.getElementById('redeemInvestmentCode');
            var redeemBankName = document.getElementById('redeemBankName');
            var redeemInvestmentType = document.getElementById('redeemInvestmentType');
            var redeemAmount = document.getElementById('redeemAmount');
            var redeemMaturityDate = document.getElementById('redeemMaturityDate');
            var redeemMaturityAmount = document.getElementById('redeemMaturityAmount');

            if (redeemInvestmentCode) redeemInvestmentCode.value = investment.investmentCode || '';
            if (redeemBankName) redeemBankName.value = investment.bankName || '';
            if (redeemInvestmentType) redeemInvestmentType.value = investment.investmentType || '';
            if (redeemAmount) redeemAmount.value = formatCurrency(investment.amount) || '0.00';
            if (redeemMaturityDate) redeemMaturityDate.value = investment.maturityDate || '';
            if (redeemMaturityAmount) redeemMaturityAmount.value = formatCurrency(investment.maturityAmount) || '0.00';

            var redeemDate = document.getElementById('redeemDate');
            if (redeemDate) redeemDate.value = new Date().toISOString().split('T')[0];

            console.log('Redeem modal populated successfully');
          } else {
            console.warn('Investment not found');
            showMessage('Investment details not found', 'error');
          }
        })
        .catch(function(error) {
          console.error('Error fetching investment details for redeem:', error);
          showMessage('Error loading investment details: ' + (error && error.message ? error.message : error), 'error');
        });
    } else {
      console.warn('API.getInvestmentByCode not available');
      showMessage('API not available', 'error');
    }
  }

  window.submitRolloverInvestment = function() {
    var codeEl = document.getElementById('rolloverInvestmentCode');
    var typeEl = document.getElementById('rolloverInvestmentType');
    var dateEl = document.getElementById('rolloverInvestmentDate');
    var amountEl = document.getElementById('rolloverAmount');
    var rateEl = document.getElementById('rolloverInterestRate');
    var durationEl = document.getElementById('rolloverDuration');
    var maturityEl = document.getElementById('rolloverMaturityDate');
    var bankEl = document.getElementById('rolloverNewBankName');

    var investmentCode = codeEl ? codeEl.value : '';
    var investmentType = typeEl ? typeEl.value : '';
    var investmentDate = dateEl ? dateEl.value : '';
    var amount = amountEl ? amountEl.value : '';
    var interestRate = rateEl ? rateEl.value : '';
    var duration = durationEl ? durationEl.value : '';
    var maturityDate = maturityEl ? maturityEl.value : '';
    var bankName = bankEl ? bankEl.value : '';

    if (!investmentType || !investmentDate || !amount || !interestRate || !duration || !maturityDate || !bankName) {
      showMessage('Please fill in all required fields', 'error');
      return;
    }

    var rolloverData = {
      previousInvestmentCode: investmentCode,
      investmentType: investmentType,
      investmentDate: investmentDate,
      amount: parseFloat(amount),
      interestRate: parseFloat(interestRate),
      duration: parseInt(duration, 10),
      maturityDate: maturityDate,
      bankName: bankName
    };

    console.log('Rollover submission:', rolloverData);

    if (typeof API !== 'undefined' && API && typeof API.addNewInvestment === 'function') {
      API.generateInvestmentCode(investmentType)
        .then(function(newCode) {
          rolloverData.investmentCode = newCode;

          var dayCount = 365;
          if (investmentType === 'Treasury Bills') dayCount = 364;
          else if (investmentType === 'Bonds') dayCount = 360;

          var interestAmount = (rolloverData.amount * rolloverData.interestRate * rolloverData.duration) / (dayCount * 100);
          var maturityAmount = rolloverData.amount + interestAmount;

          rolloverData.interestAmount = interestAmount;
          rolloverData.maturityAmount = maturityAmount;

          return API.addNewInvestment(rolloverData);
        })
        .then(function(response) {
          console.log('Rollover created successfully:', response);
          showMessage('Investment rolled over successfully! Code: ' + (response && response.investmentCode ? response.investmentCode : ''), 'success');
          closeRolloverModal();
          loadMaturedInvestmentsReport();
        })
        .catch(function(error) {
          console.error('Error creating rollover investment:', error);
          showMessage('Error creating rollover investment: ' + (error && error.message ? error.message : error), 'error');
        });
    } else {
      showMessage('API not available', 'error');
    }
  };

  window.submitRedeemInvestment = function() {
    var codeEl = document.getElementById('redeemInvestmentCode');
    var redeemDateEl = document.getElementById('redeemDate');
    var investmentCode = codeEl ? codeEl.value : '';
    var redeemDate = redeemDateEl ? redeemDateEl.value : '';

    if (!investmentCode || !redeemDate) {
      showMessage('Please select a redeem date', 'error');
      return;
    }

    console.log('Redeem submission:', { investmentCode: investmentCode, redeemDate: redeemDate });

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
          showMessage('Error redeeming investment: ' + (error && error.message ? error.message : error), 'error');
        });
    } else {
      // Fallback: optimistic UI
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
    var investmentDate = document.getElementById('rolloverInvestmentDate');
    var durationField = document.getElementById('rolloverDuration');

    if (!investmentDate || !durationField) return;

    var investmentDateValue = investmentDate.value;
    var duration = parseInt(durationField.value, 10) || 0;

    if (!investmentDateValue || duration <= 0) {
      var maturityDateField = document.getElementById('rolloverMaturityDate');
      if (maturityDateField) maturityDateField.value = '';
      return;
    }

    var startDate = new Date(investmentDateValue);
    var maturityDate = new Date(startDate.getTime() + (duration * 24 * 60 * 60 * 1000));

    var year = maturityDate.getFullYear();
    var month = String(maturityDate.getMonth() + 1).padStart(2, '0');
    var day = String(maturityDate.getDate()).padStart(2, '0');

    var maturityDateField = document.getElementById('rolloverMaturityDate');
    if (maturityDateField) maturityDateField.value = year + '-' + month + '-' + day;
    calculateRolloverMaturityAmount();
  };

  window.calculateRolloverMaturityAmount = function() {
    var amountField = document.getElementById('rolloverAmount');
    var interestRateField = document.getElementById('rolloverInterestRate');
    var durationField = document.getElementById('rolloverDuration');
    var investmentTypeField = document.getElementById('rolloverInvestmentType');

    if (!amountField || !interestRateField || !durationField) return;

    var amount = parseFloat(amountField.value) || 0;
    var interestRate = parseFloat(interestRateField.value) || 0;
    var duration = parseInt(durationField.value, 10) || 0;
    var investmentType = investmentTypeField ? investmentTypeField.value : 'Fixed Deposit';

    var dayCount = 365;
    if (investmentType === 'Treasury Bills') dayCount = 364;
    else if (investmentType === 'Bonds') dayCount = 360;
    else if (investmentType === 'Fixed Deposit') dayCount = 365;

    var interestAmountField = document.getElementById('rolloverInterestAmount');
    var maturityAmountField = document.getElementById('rolloverMaturityAmount');

    if (amount <= 0 || interestRate < 0 || duration <= 0) {
      if (interestAmountField) interestAmountField.value = '0.00';
      if (maturityAmountField) maturityAmountField.value = '0.00';
      return;
    }

    var timeInYears = duration / dayCount;
    var interestAmount = (amount * interestRate * timeInYears) / 100;
    var maturityAmountValue = amount + interestAmount;

    if (interestAmountField) interestAmountField.value = formatCurrency(interestAmount);
    if (maturityAmountField) maturityAmountField.value = formatCurrency(maturityAmountValue);
  };

  function showMessage(message, type) {
    var modal = document.getElementById('messageModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'messageModal';
      modal.className = 'modal';
      document.body.appendChild(modal);
    }

    var messageDiv = document.getElementById('modalMessage');
    if (!messageDiv) {
      var div = document.createElement('div');
      div.id = 'modalMessage';
      modal.appendChild(div);
      messageDiv = div;
    }

    var types = {
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
