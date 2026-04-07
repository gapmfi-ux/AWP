/* ============================================
   INVESTMENT REPORT MODULE JAVASCRIPT
   ============================================ */

// Global variables
let allInvestments = [];
let currentReportTab = 'purchaseReport';
let currentReportType = '';
let investmentToRollover = null;

// ============================================
// INITIALIZATION
// ============================================

function initInvestmentReportModule() {
  // Wait for DOM to be fully loaded
  setTimeout(() => {
    const today = new Date().toISOString().split('T')[0];
    const startOfYear = getStartOfYear();
    
    const purchaseFromDate = document.getElementById('purchaseFromDate');
    const purchaseToDate = document.getElementById('purchaseToDate');
    const fullReportToDate = document.getElementById('fullReportToDate');
    const interestFromDate = document.getElementById('interestFromDate');
    const interestToDate = document.getElementById('interestToDate');
    
    if (purchaseFromDate) purchaseFromDate.value = startOfYear;
    if (purchaseToDate) purchaseToDate.value = today;
    if (fullReportToDate) fullReportToDate.value = today;
    if (interestFromDate) interestFromDate.value = startOfYear;
    if (interestToDate) interestToDate.value = today;

    loadPurchaseReport();
  }, 100);

  document.addEventListener('click', function(event) {
    const portal = document.getElementById('investmentActionPortal');
    if (portal && portal.style.display === 'block') {
      if (!portal.contains(event.target) && !event.target.classList.contains('action-btn')) {
        closeInvestmentActionDropdown();
      }
    }
  });

  window.addEventListener('click', function(event) {
    const modal = document.getElementById('rolloverModal');
    if (modal && event.target === modal) {
      closeRolloverModal();
    }
  });
}

function getStartOfYear() {
  const today = new Date();
  const startOfYear = new Date(today.getFullYear(), 0, 1);
  return startOfYear.toISOString().split('T')[0];
}

// ============================================
// REPORT FUNCTIONS
// ============================================

function switchInvestmentReportTab(tabName) {
  const tabs = document.querySelectorAll('.tab-content');
  const btns = document.querySelectorAll('.tab-btn');
  
  tabs.forEach(tab => {
    tab.classList.remove('active');
  });
  btns.forEach(btn => {
    btn.classList.remove('active');
  });

  const selectedTab = document.getElementById(tabName);
  if (selectedTab) selectedTab.classList.add('active');
  
  if (event && event.target) {
    const btnElement = event.target.closest('.tab-btn');
    if (btnElement) btnElement.classList.add('active');
  }

  const purchaseControls = document.getElementById('purchaseControls');
  const fullReportControls = document.getElementById('fullReportControls');
  const interestControls = document.getElementById('interestControls');
  const maturedControls = document.getElementById('maturedControls');

  if (purchaseControls) purchaseControls.style.display = 'none';
  if (fullReportControls) fullReportControls.style.display = 'none';
  if (interestControls) interestControls.style.display = 'none';
  if (maturedControls) maturedControls.style.display = 'none';

  if (tabName === 'purchaseReport') {
    if (purchaseControls) purchaseControls.style.display = 'flex';
    loadPurchaseReport();
  } else if (tabName === 'fullReport') {
    if (fullReportControls) fullReportControls.style.display = 'flex';
    const reportTypeSelect = document.getElementById('reportTypeSelect');
    if (reportTypeSelect && reportTypeSelect.value === '') {
      reportTypeSelect.value = 'byType';
    }
    loadFullInvestmentReport();
  } else if (tabName === 'interestReport') {
    if (interestControls) interestControls.style.display = 'flex';
    loadInterestReport();
  } else if (tabName === 'maturedReport') {
    if (maturedControls) maturedControls.style.display = 'flex';
    loadMaturedInvestments();
  }
}

function loadPurchaseReport() {
  const fromDateInput = document.getElementById('purchaseFromDate');
  const toDateInput = document.getElementById('purchaseToDate');
  
  if (!fromDateInput || !toDateInput) return;

  const fromDate = fromDateInput.value;
  const toDate = toDateInput.value;

  if (!fromDate || !toDate) {
    showInvestmentEmptyState('purchaseReportBody', 'Please select date range', 7);
    return;
  }

  showInvestmentLoadingSpinner('purchaseReportBody', 7);
  
  google.script.run
    .withSuccessHandler(function(response) {
      if (response && !response.error) {
        allInvestments = response;
        renderPurchaseReportTable(response);
      } else {
        showInvestmentEmptyState('purchaseReportBody', 'Error loading report', 7);
      }
    })
    .withFailureHandler(function(error) {
      console.error('Error loading purchase report:', error);
      showInvestmentEmptyState('purchaseReportBody', 'Error loading report', 7);
    })
    .getInvestmentsByDateRange(fromDate, toDate);
}

function renderPurchaseReportTable(data) {
  const tbody = document.getElementById('purchaseReportBody');
  if (!tbody) return;

  if (!data || data.length === 0) {
    showInvestmentEmptyState('purchaseReportBody', 'No investments found', 7);
    return;
  }

  tbody.innerHTML = data.map(row => `
    <tr>
      <td>${escapeHtml(row.investmentCode || '')}</td>
      <td>${escapeHtml(row.bankName || '')}</td>
      <td>${escapeHtml(row.investmentType || '')}</td>
      <td>${formatCurrency(row.amount)}</td>
      <td>${row.interestRate ? row.interestRate.toFixed(2) + '%' : '0.00%'}</td>
      <td>${row.duration || 0}</td>
      <td>${row.investmentDate || ''}</td>
    </tr>
  `).join('');
}

function handleReportTypeChange() {
  const reportTypeSelect = document.getElementById('reportTypeSelect');
  if (!reportTypeSelect) return;
  
  const reportType = reportTypeSelect.value;
  if (!reportType) {
    return;
  }
  currentReportType = reportType;
  loadFullInvestmentReport();
}

function loadFullInvestmentReport() {
  const toDateInput = document.getElementById('fullReportToDate');
  const reportTypeSelect = document.getElementById('reportTypeSelect');
  
  if (!toDateInput || !reportTypeSelect) return;
  
  const toDate = toDateInput.value;
  const reportType = reportTypeSelect.value;

  if (!toDate || !reportType) {
    const fullReportContainer = document.getElementById('fullReportContainer');
    if (fullReportContainer) {
      fullReportContainer.innerHTML = '<p style="text-align: center; color: #a0aec0; padding: 30px;">Please select date and report type</p>';
    }
    return;
  }

  showInvestmentLoadingSpinner('fullReportContainer');

  // Use a WIDE date range to get ALL investments (10 years back and forward)
  const startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - 10);
  const endDate = new Date();
  endDate.setFullYear(endDate.getFullYear() + 10);
  
  const fromDate = startDate.toISOString().split('T')[0];
  const toDateEnd = endDate.toISOString().split('T')[0];

  google.script.run
    .withSuccessHandler(function(response) {
      if (response && !response.error) {
        allInvestments = response;
        
        // Filter investments active on the As At date (supports backdating)
        const asAtDate = new Date(toDate);
        asAtDate.setHours(0, 0, 0, 0);
        const activeInvestments = filterActiveInvestmentsAsAt(allInvestments, asAtDate);
        
        if (reportType === 'byType') {
          renderByInvestmentType(activeInvestments, toDate);
        } else if (reportType === 'byBank') {
          renderByBank(activeInvestments, toDate);
        } else if (reportType === 'byDuration') {
          renderByDuration(activeInvestments, toDate);
        }
      } else {
        const fullReportContainer = document.getElementById('fullReportContainer');
        if (fullReportContainer) {
          fullReportContainer.innerHTML = '<p style="text-align: center; color: #a0aec0; padding: 30px;">Error loading report</p>';
        }
      }
    })
    .withFailureHandler(function(error) {
      console.error('Error loading full report:', error);
      const fullReportContainer = document.getElementById('fullReportContainer');
      if (fullReportContainer) {
        fullReportContainer.innerHTML = '<p style="text-align: center; color: #a0aec0; padding: 30px;">Error loading report</p>';
      }
    })
    .getInvestmentsByDateRange(fromDate, toDateEnd);
}

// Filter investments active on a specific date (supports backdating)
function filterActiveInvestmentsAsAt(investments, asAtDate) {
  if (!investments || !Array.isArray(investments)) return [];
  
  return investments.filter(inv => {
    const investmentDate = new Date(inv.investmentDate);
    const maturityDate = new Date(inv.maturityDate);
    investmentDate.setHours(0, 0, 0, 0);
    maturityDate.setHours(0, 0, 0, 0);
    
    return investmentDate <= asAtDate && maturityDate > asAtDate;
  });
}

// Calculate accrued interest up to a specific date
function calculateAccruedToDate(amount, rate, investmentDate, maturityDate, asAtDate) {
  const investDate = new Date(investmentDate);
  const maturity = new Date(maturityDate);
  const asAt = new Date(asAtDate);
  
  investDate.setHours(0, 0, 0, 0);
  maturity.setHours(0, 0, 0, 0);
  asAt.setHours(0, 0, 0, 0);
  
  if (asAt < investDate) return 0;
  
  const effectiveEndDate = asAt < maturity ? asAt : maturity;
  if (effectiveEndDate < investDate) return 0;
  
  const daysDiff = Math.ceil((effectiveEndDate - investDate) / (1000 * 3600 * 24));
  if (daysDiff <= 0) return 0;
  
  const timeInYears = daysDiff / 365;
  const accruedInterest = (amount * rate / 100) * timeInYears;
  return accruedInterest;
}

function calculateDaysInRange(startDate, endDate, rangeStart, rangeEnd) {
  const effectiveStart = new Date(Math.max(startDate.getTime(), rangeStart.getTime()));
  const effectiveEnd = new Date(Math.min(endDate.getTime(), rangeEnd.getTime()));
  
  if (effectiveStart >= effectiveEnd) return 0;
  
  const timeDiff = effectiveEnd.getTime() - effectiveStart.getTime();
  return Math.ceil(timeDiff / (1000 * 3600 * 24));
}

// ============================================
// RENDER FUNCTIONS
// ============================================

function renderByInvestmentType(data, toDate) {
  const container = document.getElementById('fullReportContainer');
  if (!container) return;

  const toDateObj = new Date(toDate);
  toDateObj.setHours(0, 0, 0, 0);

  const grouped = {};
  data.forEach(item => {
    if (!grouped[item.investmentType]) {
      grouped[item.investmentType] = [];
    }
    grouped[item.investmentType].push(item);
  });

  if (Object.keys(grouped).length === 0) {
    container.innerHTML = '<p style="text-align: center; color: #a0aec0; padding: 30px;">No active investments found for the selected date</p>';
    return;
  }

  let grandTotalAmount = 0;
  let grandTotalInterest = 0;
  let grandTotalMaturityAmount = 0;
  let grandTotalCurrentValue = 0;

  let html = '';
  Object.keys(grouped).forEach(type => {
    const items = grouped[type];
    
    let subtotalAmount = 0;
    let subtotalInterest = 0;
    let subtotalMaturityAmount = 0;
    let subtotalCurrentValue = 0;

    items.forEach(row => {
      const amount = parseFloat(row.amount) || 0;
      const interestAmount = parseFloat(row.interestAmount) || 0;
      const maturityAmount = parseFloat(row.maturityAmount) || 0;
      const rate = parseFloat(row.interestRate) || 0;
      
      const accruedToDate = calculateAccruedToDate(amount, rate, row.investmentDate, row.maturityDate, toDate);
      const currentValue = amount + accruedToDate;

      subtotalAmount += amount;
      subtotalInterest += interestAmount;
      subtotalMaturityAmount += maturityAmount;
      subtotalCurrentValue += currentValue;
    });

    grandTotalAmount += subtotalAmount;
    grandTotalInterest += subtotalInterest;
    grandTotalMaturityAmount += subtotalMaturityAmount;
    grandTotalCurrentValue += subtotalCurrentValue;

    html += `
      <div class="grouped-report">
        <div class="group-title">${escapeHtml(type)}</div>
        <div class="group-table-wrapper">
          <table class="group-table">
            <thead>
              <tr>
                <th>Investment Code</th>
                <th>Bank Name</th>
                <th>Amount (GHc)</th>
                <th>Interest Rate (%)</th>
                <th>Duration (Days)</th>
                <th>Investment Date</th>
                <th>Interest Amount</th>
                <th>Maturity Date</th>
                <th>Maturity Amount</th>
                <th>Current Value</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(row => {
                const amount = parseFloat(row.amount) || 0;
                const interestAmount = parseFloat(row.interestAmount) || 0;
                const maturityAmount = parseFloat(row.maturityAmount) || 0;
                const rate = parseFloat(row.interestRate) || 0;
                const accruedToDate = calculateAccruedToDate(amount, rate, row.investmentDate, row.maturityDate, toDate);
                const currentValue = amount + accruedToDate;
                
                return `
                  <tr>
                    <td>${escapeHtml(row.investmentCode || '')}</td>
                    <td>${escapeHtml(row.bankName || '')}</td>
                    <td>${formatCurrency(amount)}</td>
                    <td>${rate ? rate.toFixed(2) + '%' : '0.00%'}</td>
                    <td>${row.duration || 0}</td>
                    <td>${row.investmentDate || ''}</td>
                    <td>${formatCurrency(interestAmount)}</td>
                    <td>${row.maturityDate || ''}</td>
                    <td>${formatCurrency(maturityAmount)}</td>
                    <td>${formatCurrency(currentValue)}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
            <tfoot>
              <tr class="subtotal-row">
                <td colspan="2" style="text-align: right; font-weight: 700;">${escapeHtml(type)} Subtotal:</td>
                <td class="subtotal-cell">${formatCurrency(subtotalAmount)}</td>
                <td></td>
                <td></td>
                <td></td>
                <td class="subtotal-cell">${formatCurrency(subtotalInterest)}</td>
                <td></td>
                <td class="subtotal-cell">${formatCurrency(subtotalMaturityAmount)}</td>
                <td class="subtotal-cell">${formatCurrency(subtotalCurrentValue)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    `;
  });

  html += `
    <div class="grouped-report grand-total-report">
      <div class="group-table-wrapper">
        <table class="group-table">
          <tfoot>
            <tr class="grand-total-row">
              <td colspan="2" style="text-align: right; font-weight: 700;">Grand Total:</td>
              <td class="grand-total-cell">${formatCurrency(grandTotalAmount)}</td>
              <td></td>
              <td></td>
              <td></td>
              <td class="grand-total-cell">${formatCurrency(grandTotalInterest)}</td>
              <td></td>
              <td class="grand-total-cell">${formatCurrency(grandTotalMaturityAmount)}</td>
              <td class="grand-total-cell">${formatCurrency(grandTotalCurrentValue)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  `;

  container.innerHTML = html;
}

function renderByBank(data, toDate) {
  const container = document.getElementById('fullReportContainer');
  if (!container) return;

  const grouped = {};
  data.forEach(item => {
    if (!grouped[item.bankName]) {
      grouped[item.bankName] = [];
    }
    grouped[item.bankName].push(item);
  });

  if (Object.keys(grouped).length === 0) {
    container.innerHTML = '<p style="text-align: center; color: #a0aec0; padding: 30px;">No active investments found for the selected date</p>';
    return;
  }

  let grandTotalAmount = 0;
  let grandTotalInterest = 0;
  let grandTotalMaturityAmount = 0;
  let grandTotalCurrentValue = 0;

  let html = '';
  Object.keys(grouped).sort().forEach(bank => {
    const items = grouped[bank];
    let subtotalAmount = 0;
    let subtotalInterest = 0;
    let subtotalMaturityAmount = 0;
    let subtotalCurrentValue = 0;

    items.forEach(row => {
      const amount = parseFloat(row.amount) || 0;
      const interestAmount = parseFloat(row.interestAmount) || 0;
      const maturityAmount = parseFloat(row.maturityAmount) || 0;
      const rate = parseFloat(row.interestRate) || 0;
      const accruedToDate = calculateAccruedToDate(amount, rate, row.investmentDate, row.maturityDate, toDate);
      const currentValue = amount + accruedToDate;

      subtotalAmount += amount;
      subtotalInterest += interestAmount;
      subtotalMaturityAmount += maturityAmount;
      subtotalCurrentValue += currentValue;
    });

    grandTotalAmount += subtotalAmount;
    grandTotalInterest += subtotalInterest;
    grandTotalMaturityAmount += subtotalMaturityAmount;
    grandTotalCurrentValue += subtotalCurrentValue;

    html += `
      <div class="grouped-report">
        <div class="group-title">${escapeHtml(bank)}</div>
        <div class="group-table-wrapper">
          <table class="group-table">
            <thead>
              <tr>
                <th>Investment Code</th>
                <th>Investment Type</th>
                <th>Amount (GHc)</th>
                <th>Interest Rate (%)</th>
                <th>Duration (Days)</th>
                <th>Investment Date</th>
                <th>Interest Amount</th>
                <th>Maturity Date</th>
                <th>Maturity Amount</th>
                <th>Current Value</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(row => {
                const amount = parseFloat(row.amount) || 0;
                const interestAmount = parseFloat(row.interestAmount) || 0;
                const maturityAmount = parseFloat(row.maturityAmount) || 0;
                const rate = parseFloat(row.interestRate) || 0;
                const accruedToDate = calculateAccruedToDate(amount, rate, row.investmentDate, row.maturityDate, toDate);
                const currentValue = amount + accruedToDate;
                
                return `
                  <tr>
                    <td>${escapeHtml(row.investmentCode || '')}</td>
                    <td>${escapeHtml(row.investmentType || '')}</td>
                    <td>${formatCurrency(amount)}</td>
                    <td>${rate ? rate.toFixed(2) + '%' : '0.00%'}</td>
                    <td>${row.duration || 0}</td>
                    <td>${row.investmentDate || ''}</td>
                    <td>${formatCurrency(interestAmount)}</td>
                    <td>${row.maturityDate || ''}</td>
                    <td>${formatCurrency(maturityAmount)}</td>
                    <td>${formatCurrency(currentValue)}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
            <tfoot>
              <tr class="subtotal-row">
                <td colspan="2" style="text-align: right; font-weight: 700;">${escapeHtml(bank)} Subtotal:</td>
                <td class="subtotal-cell">${formatCurrency(subtotalAmount)}</td>
                <td></td>
                <td></td>
                <td></td>
                <td class="subtotal-cell">${formatCurrency(subtotalInterest)}</td>
                <td></td>
                <td class="subtotal-cell">${formatCurrency(subtotalMaturityAmount)}</td>
                <td class="subtotal-cell">${formatCurrency(subtotalCurrentValue)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    `;
  });

  html += `
    <div class="grouped-report grand-total-report">
      <div class="group-table-wrapper">
        <table class="group-table">
          <tfoot>
            <tr class="grand-total-row">
              <td colspan="2" style="text-align: right; font-weight: 700;">Grand Total:</td>
              <td class="grand-total-cell">${formatCurrency(grandTotalAmount)}</td>
              <td></td>
              <td></td>
              <td></td>
              <td class="grand-total-cell">${formatCurrency(grandTotalInterest)}</td>
              <td></td>
              <td class="grand-total-cell">${formatCurrency(grandTotalMaturityAmount)}</td>
              <td class="grand-total-cell">${formatCurrency(grandTotalCurrentValue)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  `;

  container.innerHTML = html;
}

function renderByDuration(data, toDate) {
  const container = document.getElementById('fullReportContainer');
  if (!container) return;

  const grouped = {
    '0 – 91 Days': [],
    '92 – 182 Days': [],
    '183 – 365 Days': [],
    'Above 365 Days': []
  };

  data.forEach(item => {
    const duration = item.duration || 0;
    if (duration <= 91) grouped['0 – 91 Days'].push(item);
    else if (duration <= 182) grouped['92 – 182 Days'].push(item);
    else if (duration <= 365) grouped['183 – 365 Days'].push(item);
    else grouped['Above 365 Days'].push(item);
  });

  let hasData = false;
  Object.values(grouped).forEach(group => { if (group.length > 0) hasData = true; });

  if (!hasData) {
    container.innerHTML = '<p style="text-align: center; color: #a0aec0; padding: 30px;">No active investments found for the selected date</p>';
    return;
  }

  let grandTotalAmount = 0;
  let grandTotalInterest = 0;
  let grandTotalMaturityAmount = 0;
  let grandTotalCurrentValue = 0;

  let html = '';
  Object.keys(grouped).forEach(durationRange => {
    if (grouped[durationRange].length > 0) {
      const items = grouped[durationRange];
      let subtotalAmount = 0;
      let subtotalInterest = 0;
      let subtotalMaturityAmount = 0;
      let subtotalCurrentValue = 0;

      items.forEach(row => {
        const amount = parseFloat(row.amount) || 0;
        const interestAmount = parseFloat(row.interestAmount) || 0;
        const maturityAmount = parseFloat(row.maturityAmount) || 0;
        const rate = parseFloat(row.interestRate) || 0;
        const accruedToDate = calculateAccruedToDate(amount, rate, row.investmentDate, row.maturityDate, toDate);
        const currentValue = amount + accruedToDate;

        subtotalAmount += amount;
        subtotalInterest += interestAmount;
        subtotalMaturityAmount += maturityAmount;
        subtotalCurrentValue += currentValue;
      });

      grandTotalAmount += subtotalAmount;
      grandTotalInterest += subtotalInterest;
      grandTotalMaturityAmount += subtotalMaturityAmount;
      grandTotalCurrentValue += subtotalCurrentValue;

      html += `
        <div class="grouped-report">
          <div class="group-title">${durationRange}</div>
          <div class="group-table-wrapper">
            <table class="group-table">
              <thead>
                <tr>
                  <th>Investment Code</th>
                  <th>Bank Name</th>
                  <th>Investment Type</th>
                  <th>Amount (GHc)</th>
                  <th>Interest Rate (%)</th>
                  <th>Duration (Days)</th>
                  <th>Investment Date</th>
                  <th>Interest Amount</th>
                  <th>Maturity Date</th>
                  <th>Maturity Amount</th>
                  <th>Current Value</th>
                </tr>
              </thead>
              <tbody>
                ${items.map(row => {
                  const amount = parseFloat(row.amount) || 0;
                  const interestAmount = parseFloat(row.interestAmount) || 0;
                  const maturityAmount = parseFloat(row.maturityAmount) || 0;
                  const rate = parseFloat(row.interestRate) || 0;
                  const accruedToDate = calculateAccruedToDate(amount, rate, row.investmentDate, row.maturityDate, toDate);
                  const currentValue = amount + accruedToDate;
                  
                  return `
                    <tr>
                      <td>${escapeHtml(row.investmentCode || '')}</td>
                      <td>${escapeHtml(row.bankName || '')}</td>
                      <td>${escapeHtml(row.investmentType || '')}</td>
                      <td>${formatCurrency(amount)}</td>
                      <td>${rate ? rate.toFixed(2) + '%' : '0.00%'}</td>
                      <td>${row.duration || 0}</td>
                      <td>${row.investmentDate || ''}</td>
                      <td>${formatCurrency(interestAmount)}</td>
                      <td>${row.maturityDate || ''}</td>
                      <td>${formatCurrency(maturityAmount)}</td>
                      <td>${formatCurrency(currentValue)}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
              <tfoot>
                <tr class="subtotal-row">
                  <td colspan="3" style="text-align: right; font-weight: 700;">${durationRange} Subtotal:</td>
                  <td class="subtotal-cell">${formatCurrency(subtotalAmount)}</td>
                  <td>\n                  <td>\n                  <td class="subtotal-cell">${formatCurrency(subtotalInterest)}</td>
                  <td>\n                  <td class="subtotal-cell">${formatCurrency(subtotalMaturityAmount)}</td>
                  <td class="subtotal-cell">${formatCurrency(subtotalCurrentValue)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      `;
    }
  });

  html += `
    <div class="grouped-report grand-total-report">
      <div class="group-table-wrapper">
        <table class="group-table">
          <tfoot>
            <tr class="grand-total-row">
              <td colspan="3" style="text-align: right; font-weight: 700;">Grand Total:</td>
              <td class="grand-total-cell">${formatCurrency(grandTotalAmount)}</td>
              <td>\n              <td>\n              <td class="grand-total-cell">${formatCurrency(grandTotalInterest)}</td>
              <td>\n              <td class="grand-total-cell">${formatCurrency(grandTotalMaturityAmount)}</td>
              <td class="grand-total-cell">${formatCurrency(grandTotalCurrentValue)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  `;

  container.innerHTML = html;
}

// ============================================
// INTEREST REPORT
// ============================================

function loadInterestReport() {
  const fromDateInput = document.getElementById('interestFromDate');
  const toDateInput = document.getElementById('interestToDate');
  
  if (!fromDateInput || !toDateInput) return;
  
  const fromDate = fromDateInput.value;
  const toDate = toDateInput.value;

  if (!fromDate || !toDate) {
    const interestContainer = document.getElementById('interestReportContainer');
    if (interestContainer) {
      interestContainer.innerHTML = '<p style="text-align: center; color: #a0aec0; padding: 30px;">Please select date range</p>';
    }
    return;
  }

  showInvestmentLoadingSpinner('interestReportContainer');

  // Use a WIDE date range to get ALL investments (10 years back and forward)
  const startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - 10);
  const endDate = new Date();
  endDate.setFullYear(endDate.getFullYear() + 10);
  
  const wideFromDate = startDate.toISOString().split('T')[0];
  const wideToDate = endDate.toISOString().split('T')[0];

  google.script.run
    .withSuccessHandler(function(response) {
      if (response && !response.error) {
        renderInterestReport(response, fromDate, toDate);
      } else {
        const interestContainer = document.getElementById('interestReportContainer');
        if (interestContainer) {
          interestContainer.innerHTML = '<p style="text-align: center; color: #a0aec0; padding: 30px;">Error loading report</p>';
        }
      }
    })
    .withFailureHandler(function(error) {
      console.error('Error loading interest report:', error);
      const interestContainer = document.getElementById('interestReportContainer');
      if (interestContainer) {
        interestContainer.innerHTML = '<p style="text-align: center; color: #a0aec0; padding: 30px;">Error loading report</p>';
      }
    })
    .getInvestmentsByDateRange(wideFromDate, wideToDate);
}

function renderInterestReport(data, fromDate, toDate) {
  const container = document.getElementById('interestReportContainer');
  if (!container) return;
  
  const fromDateObj = new Date(fromDate);
  const toDateObj = new Date(toDate);
  fromDateObj.setHours(0, 0, 0, 0);
  toDateObj.setHours(0, 0, 0, 0);

  // Filter: Include investments that were active ANYTIME during the selected period
  const activeInvestments = data.filter(item => {
    const investmentDate = new Date(item.investmentDate);
    const maturityDate = new Date(item.maturityDate);
    investmentDate.setHours(0, 0, 0, 0);
    maturityDate.setHours(0, 0, 0, 0);
    
    return investmentDate <= toDateObj && maturityDate > fromDateObj;
  });

  if (activeInvestments.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: #a0aec0; padding: 30px;">No active investments found for the selected period</p>';
    return;
  }

  const grouped = {};
  activeInvestments.forEach(item => {
    if (!grouped[item.investmentType]) {
      grouped[item.investmentType] = [];
    }
    grouped[item.investmentType].push(item);
  });

  let grandTotalAmount = 0;
  let grandTotalAccruedMonthly = 0;
  let grandTotalAccruedToDate = 0;
  let grandTotalCurrentValue = 0;

  let html = '';
  Object.keys(grouped).forEach(type => {
    const items = grouped[type];
    let subtotalAmount = 0;
    let subtotalAccruedMonthly = 0;
    let subtotalAccruedToDate = 0;
    let subtotalCurrentValue = 0;

    items.forEach(row => {
      const amount = parseFloat(row.amount) || 0;
      const rate = parseFloat(row.interestRate) || 0;
      const investDate = new Date(row.investmentDate);
      const maturityDate = new Date(row.maturityDate);
      const interestAmount = parseFloat(row.interestAmount) || 0;

      const daysInRange = calculateDaysInRange(investDate, maturityDate, fromDateObj, toDateObj);
      const dailyRate = (amount * (rate / 100)) / 365;
      const accruedMonthly = dailyRate * daysInRange;

      const effectiveToDate = toDateObj < maturityDate ? toDateObj : maturityDate;
      const daysToDate = Math.ceil((effectiveToDate - investDate) / (1000 * 3600 * 24));
      const accruedToDate = dailyRate * Math.max(0, daysToDate);
      const currentValue = amount + accruedToDate;

      subtotalAmount += amount;
      subtotalAccruedMonthly += accruedMonthly;
      subtotalAccruedToDate += accruedToDate;
      subtotalCurrentValue += currentValue;
    });

    grandTotalAmount += subtotalAmount;
    grandTotalAccruedMonthly += subtotalAccruedMonthly;
    grandTotalAccruedToDate += subtotalAccruedToDate;
    grandTotalCurrentValue += subtotalCurrentValue;

    html += `
      <div class="grouped-report">
        <div class="group-title">${escapeHtml(type)}</div>
        <div class="group-table-wrapper">
          <table class="group-table">
            <thead>
              <tr>
                <th>Investment Code</th>
                <th>Bank Name</th>
                <th>Amount (GHc)</th>
                <th>Interest Rate (%)</th>
                <th>Duration (Days)</th>
                <th>Investment Date</th>
                <th>Maturity Date</th>
                <th>Interest Amount</th>
                <th>Accrued Monthly Interest</th>
                <th>Accrued Interest To Date</th>
                <th>Current Value</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(row => {
                const amount = parseFloat(row.amount) || 0;
                const rate = parseFloat(row.interestRate) || 0;
                const investDate = new Date(row.investmentDate);
                const maturityDate = new Date(row.maturityDate);
                const interestAmount = parseFloat(row.interestAmount) || 0;

                const daysInRange = calculateDaysInRange(investDate, maturityDate, fromDateObj, toDateObj);
                const dailyRate = (amount * (rate / 100)) / 365;
                const accruedMonthly = dailyRate * daysInRange;

                const effectiveToDate = toDateObj < maturityDate ? toDateObj : maturityDate;
                const daysToDate = Math.ceil((effectiveToDate - investDate) / (1000 * 3600 * 24));
                const accruedToDate = dailyRate * Math.max(0, daysToDate);
                const currentValue = amount + accruedToDate;

                return `
                  <tr>
                    <td>${escapeHtml(row.investmentCode || '')}</td>
                    <td>${escapeHtml(row.bankName || '')}</td>
                    <td>${formatCurrency(amount)}</td>
                    <td>${rate ? rate.toFixed(2) + '%' : '0.00%'}</td>
                    <td>${row.duration || 0}</td>
                    <td>${row.investmentDate || ''}</td>
                    <td>${row.maturityDate || ''}</td>
                    <td>${formatCurrency(interestAmount)}</td>
                    <td>${formatCurrency(accruedMonthly)}</td>
                    <td>${formatCurrency(accruedToDate)}</td>
                    <td>${formatCurrency(currentValue)}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
            <tfoot>
              <tr class="subtotal-row">
                <td colspan="2" style="text-align: right; font-weight: 700;">${escapeHtml(type)} Subtotal:</td>
                <td class="subtotal-cell">${formatCurrency(subtotalAmount)}</td>
                <td>\n                <td>\n                <td>\n                <td>\n                <td>\n                <td class="subtotal-cell">${formatCurrency(subtotalAccruedMonthly)}</td>
                <td class="subtotal-cell">${formatCurrency(subtotalAccruedToDate)}</td>
                <td class="subtotal-cell">${formatCurrency(subtotalCurrentValue)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

// ============================================
// MATURED INVESTMENTS
// ============================================

function loadMaturedInvestments() {
  const today = new Date().toISOString().split('T')[0];
  showInvestmentLoadingSpinner('maturedReportBody', 10);

  google.script.run
    .withSuccessHandler(function(response) {
      if (response && !response.error && response.length > 0) {
        renderMaturedInvestmentsTable(response);
      } else {
        showInvestmentEmptyState('maturedReportBody', 'No matured investments found', 10);
      }
    })
    .withFailureHandler(function(error) {
      console.error('Error loading matured investments:', error);
      showInvestmentEmptyState('maturedReportBody', 'Error loading matured investments', 10);
    })
    .getMaturedInvestments(today);
}

function renderMaturedInvestmentsTable(data) {
  const tbody = document.getElementById('maturedReportBody');
  if (!tbody) return;

  allInvestments = data;

  tbody.innerHTML = data.map(row => `
    <tr>
      <td>${escapeHtml(row.investmentCode || '')}</td>
      <td>${escapeHtml(row.bankName || '')}</td>
      <td>${escapeHtml(row.investmentType || '')}</td>
      <td>${formatCurrency(row.amount)}</td>
      <td>${row.interestRate ? row.interestRate.toFixed(2) + '%' : '0.00%'}</td>
      <td>${row.duration || 0}</td>
      <td>${row.investmentDate || ''}</td>
      <td>${row.maturityDate || ''}</td>
      <td>${formatCurrency(row.maturityAmount)}</td>
      <td>
        <button class="action-btn" onclick="openMaturedDropdown(event, '${escapeHtml(row.investmentCode)}')">
          <i class="fas fa-ellipsis-v"></i> Action
        </button>
      </td>
    </tr>
  `).join('');
}

function openMaturedDropdown(event, investmentCode) {
  closeInvestmentActionDropdown();

  const rect = event.target.closest('button').getBoundingClientRect();
  const portal = document.getElementById('investmentActionPortal');
  if (!portal) return;

  portal.innerHTML = `
    <div class="action-dropdown-content">
      <button class="dropdown-item" onclick="openRolloverModal('${investmentCode}')">
        <i class="fas fa-redo"></i> Rollover
      </button>
      <button class="dropdown-item" onclick="removeMaturedInvestment('${investmentCode}')">
        <i class="fas fa-trash-alt"></i> Remove
      </button>
    </div>
  `;

  portal.style.display = 'block';
  portal.style.position = 'fixed';
  portal.style.top = (rect.bottom + window.scrollY) + 'px';
  portal.style.left = (rect.left + window.scrollX) + 'px';

  event.stopPropagation();
}

function closeInvestmentActionDropdown() {
  const portal = document.getElementById('investmentActionPortal');
  if (portal) {
    portal.innerHTML = '';
    portal.style.display = 'none';
  }
}

function openRolloverModal(investmentCode) {
  closeInvestmentActionDropdown();
  
  const investment = allInvestments.find(inv => inv.investmentCode === investmentCode);
  if (!investment) {
    showInvestmentMessage('Investment not found', 'error');
    return;
  }

  investmentToRollover = investment;

  const rolloverType = document.getElementById('rolloverInvestmentType');
  const rolloverBank = document.getElementById('rolloverBankName');
  const rolloverAmount = document.getElementById('rolloverAmount');
  const rolloverRate = document.getElementById('rolloverInterestRate');
  const rolloverDuration = document.getElementById('rolloverDuration');
  const rolloverDate = document.getElementById('rolloverInvestmentDate');
  
  if (rolloverType) rolloverType.value = investment.investmentType;
  if (rolloverBank) rolloverBank.value = investment.bankName;
  if (rolloverAmount) rolloverAmount.value = investment.maturityAmount;
  if (rolloverRate) rolloverRate.value = investment.interestRate;
  if (rolloverDuration) rolloverDuration.value = investment.duration;

  const today = new Date().toISOString().split('T')[0];
  if (rolloverDate) rolloverDate.value = today;

  generateRolloverInvestmentCode(investment.investmentType);
  calculateRolloverMaturityDate();

  const rolloverModal = document.getElementById('rolloverModal');
  if (rolloverModal) rolloverModal.style.display = 'flex';
}

function closeRolloverModal() {
  const rolloverModal = document.getElementById('rolloverModal');
  if (rolloverModal) rolloverModal.style.display = 'none';
  investmentToRollover = null;
}

function generateRolloverInvestmentCode(investmentType) {
  google.script.run
    .withSuccessHandler(function(response) {
      const codeField = document.getElementById('rolloverInvestmentCode');
      if (codeField) codeField.value = response || '';
    })
    .withFailureHandler(function(error) {
      console.error('Error generating code:', error);
    })
    .generateInvestmentCode(investmentType);
}

function handleRolloverInvestmentTypeChange() {
  const investmentTypeSelect = document.getElementById('rolloverInvestmentType');
  if (!investmentTypeSelect) return;
  
  const investmentType = investmentTypeSelect.value;
  if (investmentType) {
    generateRolloverInvestmentCode(investmentType);
  }
}

function calculateRolloverMaturityDate() {
  const investmentDateInput = document.getElementById('rolloverInvestmentDate');
  const durationInput = document.getElementById('rolloverDuration');
  
  if (!investmentDateInput || !durationInput) return;
  
  const investmentDate = investmentDateInput.value;
  const duration = parseInt(durationInput.value) || 0;

  if (!investmentDate || duration <= 0) {
    const maturityDateField = document.getElementById('rolloverMaturityDate');
    if (maturityDateField) maturityDateField.value = '';
    return;
  }

  const startDate = new Date(investmentDate);
  const maturityDate = new Date(startDate.getTime() + (duration * 24 * 60 * 60 * 1000));

  const year = maturityDate.getFullYear();
  const month = String(maturityDate.getMonth() + 1).padStart(2, '0');
  const day = String(maturityDate.getDate()).padStart(2, '0');

  const maturityDateField = document.getElementById('rolloverMaturityDate');
  if (maturityDateField) maturityDateField.value = `${year}-${month}-${day}`;
  calculateRolloverMaturityAmount();
}

function calculateRolloverMaturityAmount() {
  const amountInput = document.getElementById('rolloverAmount');
  const rateInput = document.getElementById('rolloverInterestRate');
  const durationInput = document.getElementById('rolloverDuration');
  
  if (!amountInput || !rateInput || !durationInput) return;
  
  const amount = parseFloat(amountInput.value) || 0;
  const interestRate = parseFloat(rateInput.value) || 0;
  const duration = parseInt(durationInput.value) || 0;

  const interestAmountField = document.getElementById('rolloverInterestAmount');
  const maturityAmountField = document.getElementById('rolloverMaturityAmount');

  if (amount <= 0 || interestRate < 0 || duration <= 0) {
    if (interestAmountField) interestAmountField.value = '0.00';
    if (maturityAmountField) maturityAmountField.value = '0.00';
    return;
  }

  const timeInYears = duration / 365;
  const interestAmount = (amount * interestRate * timeInYears) / 100;
  const maturityAmount = amount + interestAmount;

  if (interestAmountField) interestAmountField.value = formatCurrency(interestAmount);
  if (maturityAmountField) maturityAmountField.value = formatCurrency(maturityAmount);
}

function submitRolloverInvestment() {
  showInvestmentMessage('Rollover investment submitted successfully!', 'success');
  closeRolloverModal();
  loadMaturedInvestments();
}

function removeMaturedInvestment(investmentCode) {
  closeInvestmentActionDropdown();
  
  if (confirm(`Are you sure you want to remove investment ${investmentCode}?`)) {
    showInvestmentMessage('Investment removed successfully!', 'success');
    loadMaturedInvestments();
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

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function showInvestmentMessage(message, type) {
  const modal = document.getElementById('messageModal');
  const messageDiv = document.getElementById('modalMessage');

  if (!modal || !messageDiv) return;

  const types = {
    success: 'success-message',
    error: 'error-message',
    info: 'info-message'
  };

  messageDiv.innerHTML = `<div class="${types[type] || types.info}">${message}</div>`;
  modal.style.display = 'flex';
}

function showInvestmentEmptyState(elementId, message, colSpan) {
  const element = document.getElementById(elementId);
  if (element && element.tagName === 'TBODY') {
    element.innerHTML = `
      <tr>
        <td colspan="${colSpan}" class="loading-cell">
          <i class="fas fa-folder-open"></i>
          <p>${message}</p>
        </td>
      </tr>
    `;
  } else {
    const container = document.getElementById(elementId);
    if (container) {
      container.innerHTML = `<p style="text-align: center; color: #a0aec0; padding: 30px;">${message}</p>`;
    }
  }
}

function showInvestmentLoadingSpinner(elementId, colSpan) {
  const element = document.getElementById(elementId);
  if (element && element.tagName === 'TBODY') {
    element.innerHTML = `<tr><td colspan="${colSpan}" class="loading-cell">Loading...<\/td><\/tr>`;
  } else {
    const container = document.getElementById(elementId);
    if (container) {
      container.innerHTML = `<p style="text-align: center; color: #a0aec0; padding: 30px;">Loading...</p>`;
    }
  }
}

// Export for global use
window.initInvestmentReportModule = initInvestmentReportModule;
window.switchInvestmentReportTab = switchInvestmentReportTab;
window.handleReportTypeChange = handleReportTypeChange;
window.loadPurchaseReport = loadPurchaseReport;
window.loadFullInvestmentReport = loadFullInvestmentReport;
window.loadInterestReport = loadInterestReport;
window.openMaturedDropdown = openMaturedDropdown;
window.openRolloverModal = openRolloverModal;
window.closeRolloverModal = closeRolloverModal;
window.handleRolloverInvestmentTypeChange = handleRolloverInvestmentTypeChange;
window.calculateRolloverMaturityDate = calculateRolloverMaturityDate;
window.calculateRolloverMaturityAmount = calculateRolloverMaturityAmount;
window.submitRolloverInvestment = submitRolloverInvestment;
window.removeMaturedInvestment = removeMaturedInvestment;
window.closeInvestmentModal = closeInvestmentModal;
