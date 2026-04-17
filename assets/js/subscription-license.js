// ============================================
// SUBSCRIPTION SCHEDULE MODULE
// Integrated with main API service
// ============================================

let subscriptionsList = [];
let currentRenewId = null;
let currentPaymentId = null;
let currentFilter = { fromDate: '', toDate: '' };

// Separate filter variables for each tab
let prepaidFilter = { fromDate: '', toDate: '' };
let arrearsFilter = { fromDate: '', toDate: '' };

// ============================================
// SCHEDULE MODULE INITIALIZATION
// ============================================

function initSubscriptionScheduleModule() {
  console.log('Initializing Subscription Schedule Module');
  loadSubscriptionsFromAPI();
  
  // Set default date range (current month)
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  
  const fromDateField = document.getElementById('fromDate');
  const toDateField = document.getElementById('toDate');
  const fromDatePrepaid = document.getElementById('fromDatePrepaid');
  const toDatePrepaid = document.getElementById('toDatePrepaid');
  const fromDateArrears = document.getElementById('fromDateArrears');
  const toDateArrears = document.getElementById('toDateArrears');
  
  if (fromDateField) fromDateField.value = formatDateForInput(firstDay);
  if (toDateField) toDateField.value = formatDateForInput(lastDay);
  if (fromDatePrepaid) fromDatePrepaid.value = formatDateForInput(firstDay);
  if (toDatePrepaid) toDatePrepaid.value = formatDateForInput(lastDay);
  if (fromDateArrears) fromDateArrears.value = formatDateForInput(firstDay);
  if (toDateArrears) toDateArrears.value = formatDateForInput(lastDay);
  
  currentFilter.fromDate = formatDateForInput(firstDay);
  currentFilter.toDate = formatDateForInput(lastDay);
  prepaidFilter.fromDate = formatDateForInput(firstDay);
  prepaidFilter.toDate = formatDateForInput(lastDay);
  arrearsFilter.fromDate = formatDateForInput(firstDay);
  arrearsFilter.toDate = formatDateForInput(lastDay);
}

// ============================================
// LOAD FROM API
// ============================================

function loadSubscriptionsFromAPI() {
  console.log('Loading subscriptions from API...');
  
  if (typeof API === 'undefined' || !API) {
    console.error('API not available, trying localStorage');
    loadSubscriptionsFromStorage();
    return;
  }
  
  API.getAllSubscriptions()
    .then(function(response) {
      console.log('API Response:', response);
      
      if (response && Array.isArray(response)) {
        subscriptionsList = response;
        // Ensure amountPaid is set for each subscription
        subscriptionsList.forEach(sub => {
          if (!sub.amountPaid) sub.amountPaid = 0;
        });
        console.log('Loaded ' + subscriptionsList.length + ' subscriptions from API');
      } else if (response && response.data && Array.isArray(response.data)) {
        subscriptionsList = response.data;
        subscriptionsList.forEach(sub => {
          if (!sub.amountPaid) sub.amountPaid = 0;
        });
        console.log('Loaded ' + subscriptionsList.length + ' subscriptions from API (data property)');
      } else if (response && response.success === false) {
        console.error('API error:', response.error);
        loadSubscriptionsFromStorage();
        return;
      } else {
        console.error('Unexpected response format:', response);
        loadSubscriptionsFromStorage();
        return;
      }
      
      saveSubscriptionsToStorage();
      renderAllTables();
    })
    .catch(function(error) {
      console.error('Error loading from API:', error);
      console.log('Falling back to localStorage');
      loadSubscriptionsFromStorage();
    });
}
function loadSubscriptionsFromStorage() {
  console.log('Loading subscriptions from localStorage...');
  
  const stored = localStorage.getItem('subscriptions_list');
  if (stored) {
    try {
      subscriptionsList = JSON.parse(stored);
      console.log('Loaded ' + subscriptionsList.length + ' subscriptions from localStorage');
    } catch (e) {
      console.error('Error parsing localStorage:', e);
      subscriptionsList = getDemoSubscriptions();
    }
  } else {
    console.log('No localStorage data, using demo subscriptions');
    subscriptionsList = getDemoSubscriptions();
  }
  
  renderAllTables();
}

function saveSubscriptionsToStorage() {
  localStorage.setItem('subscriptions_list', JSON.stringify(subscriptionsList));
}

function refreshSubscriptionSchedule() {
  console.log('Refreshing subscription schedule...');
  loadSubscriptionsFromAPI();
}

function getDemoSubscriptions() {
  const today = new Date();
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);
  const nextMonth = new Date(today);
  nextMonth.setDate(today.getDate() + 25);
  const expired = new Date(today);
  expired.setDate(today.getDate() - 15);
  const farFuture = new Date(today);
  farFuture.setMonth(today.getMonth() + 8);
  const twoMonthsLater = new Date(today);
  twoMonthsLater.setMonth(today.getMonth() + 2);
  
  return [
    { code: 'SUB01001', name: 'Microsoft 365 Business', category: 'Software License', vendor: 'Microsoft', startDate: '2024-01-01', expiryDate: nextWeek.toISOString().split('T')[0], annualCost: 750, paymentMode: 'Prepaid', paymentFrequency: 'Annually', amountPaid: 0 },
    { code: 'SUB02001', name: 'QuickBooks Online', category: 'SaaS Subscription', vendor: 'Intuit', startDate: '2024-03-10', expiryDate: nextMonth.toISOString().split('T')[0], annualCost: 480, paymentMode: 'In Arrears', paymentFrequency: 'Monthly', amountPaid: 240 },
    { code: 'SUB03001', name: 'Company Domain (.com)', category: 'Domain Renewal', vendor: 'GoDaddy', startDate: '2024-02-01', expiryDate: expired.toISOString().split('T')[0], annualCost: 18, paymentMode: 'Prepaid', paymentFrequency: 'Annually', amountPaid: 0 },
    { code: 'SUB04001', name: 'Adobe Creative Cloud', category: 'SaaS Subscription', vendor: 'Adobe', startDate: '2024-05-01', expiryDate: farFuture.toISOString().split('T')[0], annualCost: 600, paymentMode: 'Prepaid', paymentFrequency: 'Monthly', amountPaid: 0 },
    { code: 'SUB05001', name: 'AWS Cloud Services', category: 'Cloud Service', vendor: 'Amazon', startDate: '2024-01-15', expiryDate: twoMonthsLater.toISOString().split('T')[0], annualCost: 1200, paymentMode: 'In Arrears', paymentFrequency: 'Quarterly', amountPaid: 600 }
  ];
}

// ============================================
// DATE CALCULATIONS
// ============================================

function calculateMonthsBetween(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  
  let months = 0;
  const startMonth = start.getMonth();
  const startYear = start.getFullYear();
  const endMonth = end.getMonth();
  const endYear = end.getFullYear();
  
  months = (endYear - startYear) * 12 + (endMonth - startMonth);
  
  if (end.getDate() < start.getDate()) {
    months -= 1;
  }
  
  return Math.max(0, months);
}

// Calculate monthly charge based on subscription duration (start to end date)
function calculateMonthlyCharge(subscription) {
  const startDate = new Date(subscription.startDate);
  const expiryDate = new Date(subscription.expiryDate);
  
  startDate.setHours(0, 0, 0, 0);
  expiryDate.setHours(0, 0, 0, 0);
  
  // Get total months of subscription duration
  const totalMonths = calculateMonthsBetween(startDate, expiryDate) + 1;
  
  if (totalMonths <= 0) return 0;
  
  // Monthly charge = Annual Cost / Total Months of Subscription
  const monthlyCharge = (subscription.annualCost || 0) / totalMonths;
  
  console.log(`Subscription ${subscription.code}: ${totalMonths} months duration, monthly charge: ${monthlyCharge}`);
  
  return monthlyCharge;
}

function calculateChargeForPeriod(subscription, filterObj) {
  if (!filterObj || !filterObj.toDate || !filterObj.fromDate) return 0;
  
  const fromDate = new Date(filterObj.fromDate);
  const toDate = new Date(filterObj.toDate);
  const startDate = new Date(subscription.startDate);
  const expiryDate = new Date(subscription.expiryDate);
  
  fromDate.setHours(0, 0, 0, 0);
  toDate.setHours(0, 0, 0, 0);
  startDate.setHours(0, 0, 0, 0);
  expiryDate.setHours(0, 0, 0, 0);
  
  // Calculate the active period within the filter range
  const periodStart = new Date(Math.max(fromDate.getTime(), startDate.getTime()));
  const periodEnd = new Date(Math.min(toDate.getTime(), expiryDate.getTime()));
  
  if (periodStart > periodEnd) return 0;
  
  // Get months in the period
  const monthsInPeriod = calculateMonthsBetween(periodStart, periodEnd) + 1;
  const monthlyCharge = calculateMonthlyCharge(subscription);
  
  console.log('Period: ' + periodStart.toDateString() + ' to ' + periodEnd.toDateString());
  console.log('Months in period: ' + monthsInPeriod);
  console.log('Monthly charge: ' + monthlyCharge);
  console.log('Total for period: ' + (monthlyCharge * monthsInPeriod));
  
  return monthlyCharge * monthsInPeriod;
}

// Calculate remaining balance for prepaid (total - charge from start to TO date)
function calculateRemainingBalance(subscription, filterObj) {
  if (!filterObj || !filterObj.toDate) return subscription.annualCost || 0;
  
  const toDate = new Date(filterObj.toDate);
  const startDate = new Date(subscription.startDate);
  
  toDate.setHours(0, 0, 0, 0);
  startDate.setHours(0, 0, 0, 0);
  
  // Calculate months from start to TO date
  const monthsUsed = calculateMonthsBetween(startDate, toDate) + 1;
  const monthlyCharge = calculateMonthlyCharge(subscription);
  const chargeUsed = monthlyCharge * monthsUsed;
  
  return Math.max(0, (subscription.annualCost || 0) - chargeUsed);
}

// ============================================
// DATE FILTER FUNCTIONS
// ============================================

function applyDateFilter() {
  currentFilter.fromDate = document.getElementById('fromDate').value;
  currentFilter.toDate = document.getElementById('toDate').value;
  renderAllSchedulesGrouped();
}

function isActiveWithinDateRange(subscription, filterObj) {
  if (!filterObj || (!filterObj.fromDate && !filterObj.toDate)) return true;
  
  const filterFrom = filterObj.fromDate ? new Date(filterObj.fromDate) : null;
  const filterTo = filterObj.toDate ? new Date(filterObj.toDate) : null;
  
  const subStart = subscription.startDate ? new Date(subscription.startDate) : null;
  const subExpiry = subscription.expiryDate ? new Date(subscription.expiryDate) : null;
  
  if (!filterFrom && !filterTo) return true;
  if (!subStart || !subExpiry) return false;
  
  filterFrom.setHours(0, 0, 0, 0);
  filterTo.setHours(23, 59, 59, 999);
  subStart.setHours(0, 0, 0, 0);
  subExpiry.setHours(0, 0, 0, 0);
  
  return subStart <= filterTo && subExpiry >= filterFrom;
}

function applyPrepaidDateFilter() {
  prepaidFilter.fromDate = document.getElementById('fromDatePrepaid')?.value || '';
  prepaidFilter.toDate = document.getElementById('toDatePrepaid')?.value || '';
  renderPrepaidTableEnhanced();
}

function applyArrearsDateFilter() {
  arrearsFilter.fromDate = document.getElementById('fromDateArrears')?.value || '';
  arrearsFilter.toDate = document.getElementById('toDateArrears')?.value || '';
  renderArrearsTableEnhanced();
}

// ============================================
// RENDER FUNCTIONS
// ============================================

function renderAllTables() {
  renderAllSchedulesGrouped();
  renderPrepaidTableEnhanced();
  renderArrearsTableEnhanced();
  renderExpiredTableEnhanced();
}

function renderAllSchedulesGrouped() {
  const container = document.getElementById('allScheduleWrapper');
  if (!container) return;
  
  if (!subscriptionsList || subscriptionsList.length === 0) {
    container.innerHTML = '<div class="report-table-wrapper"><table class="report-table"><tbody><tr><td colspan="8" class="loading-cell">No subscriptions found</td></tr></tbody></table></div>';
    return;
  }
  
  let filteredList = subscriptionsList.filter(sub => isActiveWithinDateRange(sub, currentFilter));
  
  if (!filteredList.length) {
    container.innerHTML = '<div class="report-table-wrapper"><table class="report-table"><tbody><tr><td colspan="8" class="loading-cell">No subscriptions active in selected date range</td></tr></tbody></table></div>';
    return;
  }
  
  // Group by category only
  const grouped = {};
  filteredList.forEach(sub => {
    const cat = sub.category || 'Uncategorized';
    if (!grouped[cat]) {
      grouped[cat] = [];
    }
    grouped[cat].push(sub);
  });
  
  let totalAnnualCost = 0;
  let html = '<div class="report-table-wrapper"><table class="report-table"><thead><tr>';
  html += '<th>Code</th><th>Name</th><th>Vendor</th><th>Start Date</th><th>Expiry Date</th>';
  html += '<th>Annual Cost (GH₵)</th><th>Payment Mode</th><th>Frequency</th>';
  html += '</tr></thead><tbody>';
  
  const sortedCategories = Object.keys(grouped).sort();
  
  for (const category of sortedCategories) {
    const items = grouped[category];
    let categoryTotal = 0;
    
    html += `<tr class="group-header"><td colspan="8"><strong>${escapeHtml(category)}</strong> (${items.length} items)</td></tr>`;
    
    items.forEach(sub => {
      categoryTotal += sub.annualCost || 0;
      
      html += `
        <tr>
          <td>${escapeHtml(sub.code || '-')}</td>
          <td><strong>${escapeHtml(sub.name || '-')}</strong></td>
          <td>${escapeHtml(sub.vendor || '-')}</td>
          <td>${formatDate(sub.startDate)}</td>
          <td>${formatDate(sub.expiryDate)}</td>
          <td>GH₵ ${formatCurrency(sub.annualCost || 0)}</td>
          <td>${escapeHtml(sub.paymentMode || '-')}</td>
          <td>${escapeHtml(sub.paymentFrequency || '-')}</td>
        </tr>
      `;
    });
    
    html += `<tr class="group-total-row"><td colspan="5"><strong>Category Total</strong></td><td colspan="3"><strong>GH₵ ${formatCurrency(categoryTotal)}</strong></td></tr>`;
    totalAnnualCost += categoryTotal;
  }
  
  html += `<tr class="grand-total-row"><td colspan="5"><strong>GRAND TOTAL</strong></td><td colspan="3"><strong>GH₵ ${formatCurrency(totalAnnualCost)}</strong></td></tr>`;
  html += '</tbody></table></div>';
  
  container.innerHTML = html;
}

function renderPrepaidTableEnhanced() {
  const tbody = document.getElementById('prepaidTableBody');
  const tfoot = document.getElementById('prepaidTableFooter');
  if (!tbody) return;
  
  if (!subscriptionsList || subscriptionsList.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="loading-cell">No subscriptions found</td></tr>';
    if (tfoot) tfoot.innerHTML = '';
    return;
  }
  
  let prepaidList = subscriptionsList.filter(sub => 
    sub.paymentMode === 'Prepaid' && isActiveWithinDateRange(sub, prepaidFilter)
  );
  
  if (!prepaidList.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="loading-cell">No prepaid subscriptions active in selected date range</td></tr>';
    if (tfoot) tfoot.innerHTML = '';
    return;
  }
  
  let totalRemainingBalance = 0;
  let rows = '';
  
  prepaidList.forEach(sub => {
    const monthlyCharge = calculateMonthlyCharge(sub);
    const remainingBalance = calculateRemainingBalance(sub, prepaidFilter);
    totalRemainingBalance += remainingBalance;
    
    rows += `
      <tr>
        <td>${escapeHtml(sub.code || '-')}</td>
        <td><strong>${escapeHtml(sub.name || '-')}</strong></td>
        <td>${formatDate(sub.startDate)}</td>
        <td>${formatDate(sub.expiryDate)}</td>
        <td>${escapeHtml(sub.category || '-')}</td>
        <td>GH₵ ${formatCurrency(sub.annualCost || 0)}</td>
        <td>GH₵ ${formatCurrency(monthlyCharge)}</td>
        <td>GH₵ ${formatCurrency(remainingBalance)}</td>
      </tr>
    `;
  });
  
  tbody.innerHTML = rows;
  
  if (tfoot) {
    tfoot.innerHTML = `
      <tr class="total-row">
        <td colspan="7" style="text-align: right; font-weight: 700;">Remaining Balance:</td>
        <td class="total-cell">GH₵ ${formatCurrency(totalRemainingBalance)}</td>
      </tr>
    `;
  }
}

function renderArrearsTableEnhanced() {
  const tbody = document.getElementById('arrearsTableBody');
  const tfoot = document.getElementById('arrearsTableFooter');
  if (!tbody) return;
  
  if (!subscriptionsList || subscriptionsList.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" class="loading-cell">No subscriptions found</td></tr>';
    if (tfoot) tfoot.innerHTML = '';
    return;
  }
  
  let arrearsList = subscriptionsList.filter(sub => 
    sub.paymentMode === 'In Arrears' && isActiveWithinDateRange(sub, arrearsFilter)
  );
  
  if (!arrearsList.length) {
    tbody.innerHTML = '<tr><td colspan="9" class="loading-cell">No in-arrears subscriptions active in selected date range</td></tr>';
    if (tfoot) tfoot.innerHTML = '';
    return;
  }
  
  let totalAnnualCost = 0;
  let totalPaid = 0;
  let totalRemaining = 0;
  let rows = '';
  
  arrearsList.forEach(sub => {
    const monthlyCharge = calculateMonthlyCharge(sub);
    const amountPaid = sub.amountPaid || 0;
    const remaining = (sub.annualCost || 0) - amountPaid;
    
    totalAnnualCost += sub.annualCost || 0;
    totalPaid += amountPaid;
    totalRemaining += remaining;
    
    const subCode = escapeHtml(sub.code || '-');
    
    rows += `
      <tr>
        <td>${subCode}</td>
        <td><strong>${escapeHtml(sub.name || '-')}</strong></td>
        <td>${escapeHtml(sub.category || '-')}</td>
        <td>${formatDate(sub.startDate)}</td>
        <td>${formatDate(sub.expiryDate)}</td>
        <td>GH₵ ${formatCurrency(sub.annualCost || 0)}</td>
        <td>GH₵ ${formatCurrency(amountPaid)}</td>
        <td>GH₵ ${formatCurrency(remaining)}</td>
        <td><button class="pay-btn" onclick="openPaymentModal('${subCode}')">Pay</button></td>
      </tr>
    `;
  });
  
  tbody.innerHTML = rows;
  
  if (tfoot) {
    tfoot.innerHTML = `
      <tr class="total-row">
        <td colspan="5" style="text-align: right; font-weight: 700;">TOTAL</td>
        <td>GH₵ ${formatCurrency(totalAnnualCost)}</td>
        <td>GH₵ ${formatCurrency(totalPaid)}</td>
        <td colspan="2">GH₵ ${formatCurrency(totalRemaining)}</td>
      </tr>
    `;
  }
}

function renderExpiredTableEnhanced() {
  const tbody = document.getElementById('expiredTableBody');
  if (!tbody) return;
  
  if (!subscriptionsList || subscriptionsList.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="loading-cell">No subscriptions found</td></tr>';
    return;
  }
  
  let expiredList = subscriptionsList.filter(sub => calculateDaysLeft(sub.expiryDate) < 0);
  
  if (!expiredList.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="loading-cell">No expired subscriptions found</td></tr>';
    return;
  }
  
  let rows = '';
  
  expiredList.forEach(sub => {
    const daysOverdue = Math.abs(calculateDaysLeft(sub.expiryDate));
    const subCode = escapeHtml(sub.code || '-');
    rows += `
      <tr style="background:#fff5f5;">
        <td>${subCode}</td>
        <td><strong>${escapeHtml(sub.name || '-')}</strong></td>
        <td>${escapeHtml(sub.category || '-')}</td>
        <td>${escapeHtml(sub.vendor || '-')}</td>
        <td>${formatDate(sub.expiryDate)}</td>
        <td>GH₵ ${formatCurrency(sub.annualCost || 0)}</td>
        <td class="text-danger"><strong>${daysOverdue} days overdue</strong></td>
        <td><button class="renew-btn" onclick="openRenewModalByCode('${subCode}')">Renew</button></td>
      </tr>
    `;
  });
  
  tbody.innerHTML = rows;
}

// ============================================
// TAB SWITCHING
// ============================================

function switchSubscriptionTab(tabName) {
  document.querySelectorAll('.tab-content').forEach(function(tab) {
    tab.classList.remove('active');
  });

  document.querySelectorAll('.tab-btn').forEach(function(btn) {
    btn.classList.remove('active');
  });

  const tabElement = document.getElementById(tabName);
  if (tabElement) tabElement.classList.add('active');

  if (window.event && window.event.target) {
    const btnElement = window.event.target.closest('.tab-btn');
    if (btnElement) btnElement.classList.add('active');
  }

  const allScheduleControls = document.getElementById('allScheduleControls');
  const prepaidControls = document.getElementById('prepaidControls');
  const arrearsControls = document.getElementById('arrearsControls');
  const expiredControls = document.getElementById('expiredControls');

  if (allScheduleControls) allScheduleControls.style.display = 'none';
  if (prepaidControls) prepaidControls.style.display = 'none';
  if (arrearsControls) arrearsControls.style.display = 'none';
  if (expiredControls) expiredControls.style.display = 'none';

  if (tabName === 'allSchedule') {
    if (allScheduleControls) allScheduleControls.style.display = 'flex';
    renderAllSchedulesGrouped();
  } else if (tabName === 'prepaid') {
    if (prepaidControls) prepaidControls.style.display = 'flex';
    renderPrepaidTableEnhanced();
  } else if (tabName === 'arrears') {
    if (arrearsControls) arrearsControls.style.display = 'flex';
    renderArrearsTableEnhanced();
  } else if (tabName === 'expired') {
    if (expiredControls) expiredControls.style.display = 'flex';
    renderExpiredTableEnhanced();
  }
}

// ============================================
// PAYMENT MODAL FUNCTIONS
// ============================================

function openPaymentModal(code) {
  const sub = subscriptionsList.find(s => s.code === code);
  if (!sub) {
    showScheduleToast('Subscription not found', 'error');
    return;
  }
  
  currentPaymentId = code;
  
  const frequencyMultiplier = getFrequencyMultiplier(sub.paymentFrequency);
  const monthlyCharge = calculateMonthlyCharge(sub);
  const expectedPayment = monthlyCharge * frequencyMultiplier;
  const remaining = (sub.annualCost || 0) - (sub.amountPaid || 0);
  
  document.getElementById('paymentCode').value = sub.code || '';
  document.getElementById('paymentName').value = sub.name || '';
  document.getElementById('paymentVendor').value = sub.vendor || '';
  document.getElementById('paymentFrequency').value = sub.paymentFrequency || 'Annually';
  document.getElementById('paymentExpected').value = expectedPayment.toFixed(2);
  document.getElementById('paymentAmount').value = expectedPayment.toFixed(2);
  document.getElementById('paymentRemaining').value = remaining.toFixed(2);
  document.getElementById('paymentDate').value = formatDateForInput(new Date());
  
  document.getElementById('paymentModal').style.display = 'flex';
}

function getFrequencyMultiplier(frequency) {
  const multipliers = {
    'Monthly': 1,
    'Quarterly': 3,
    'Semi-Annually': 6,
    'Annually': 12,
    '2 Years': 24,
    '3 Years': 36,
    '5 Years': 60
  };
  return multipliers[frequency] || 12;
}

function processPayment() {
  const paymentAmount = parseFloat(document.getElementById('paymentAmount').value);
  const paymentDate = document.getElementById('paymentDate').value;
  
  if (!paymentAmount || paymentAmount <= 0) {
    showScheduleToast('Please enter a valid payment amount', 'error');
    return;
  }
  
  if (!paymentDate) {
    showScheduleToast('Please select a payment date', 'error');
    return;
  }
  
  // Find and update the subscription with the payment
  const subIndex = subscriptionsList.findIndex(s => s.code === currentPaymentId);
  if (subIndex !== -1) {
    const sub = subscriptionsList[subIndex];
    const newAmountPaid = (sub.amountPaid || 0) + paymentAmount;
    
    // Generate payment reference code
    const paymentRefCode = 'PAY-' + currentPaymentId + '-' + Date.now().toString().slice(-6);
    
    console.log('Payment Processed:');
    console.log('Reference: ' + paymentRefCode);
    console.log('Amount: GH₵ ' + paymentAmount.toFixed(2));
    console.log('Date: ' + paymentDate);
    console.log('Total Paid: GH₵ ' + newAmountPaid.toFixed(2));
    
    // Update locally
    sub.amountPaid = newAmountPaid;
    
    // Save to storage
    saveSubscriptionsToStorage();
    
    // If API available, sync to backend
    if (typeof API !== 'undefined' && API) {
      API.request('updateSubscriptionPayment', {
        subscriptionCode: currentPaymentId,
        amountPaid: newAmountPaid
      })
      .then(function(response) {
        console.log('Payment saved to sheet:', response);
        if (response && response.success) {
          showScheduleToast('Payment recorded: ' + paymentRefCode, 'success');
        } else {
          showScheduleToast('Payment recorded locally (sheet sync failed)', 'warning');
        }
        closePaymentModal();
        renderArrearsTableEnhanced();
      })
      .catch(function(error) {
        console.error('Error saving payment to sheet:', error);
        showScheduleToast('Payment recorded locally (sheet sync failed)', 'warning');
        closePaymentModal();
        renderArrearsTableEnhanced();
      });
    } else {
      showScheduleToast('Payment recorded: ' + paymentRefCode, 'success');
      closePaymentModal();
      renderArrearsTableEnhanced();
    }
  }
}function processPayment() {
  const paymentAmount = parseFloat(document.getElementById('paymentAmount').value);
  const paymentDate = document.getElementById('paymentDate').value;
  
  if (!paymentAmount || paymentAmount <= 0) {
    showScheduleToast('Please enter a valid payment amount', 'error');
    return;
  }
  
  if (!paymentDate) {
    showScheduleToast('Please select a payment date', 'error');
    return;
  }
  
  // Find and update the subscription with the payment
  const subIndex = subscriptionsList.findIndex(s => s.code === currentPaymentId);
  if (subIndex !== -1) {
    const sub = subscriptionsList[subIndex];
    const newAmountPaid = (sub.amountPaid || 0) + paymentAmount;
    
    // Generate payment reference code
    const paymentRefCode = 'PAY-' + currentPaymentId + '-' + Date.now().toString().slice(-6);
    
    console.log('Payment Processed:');
    console.log('Reference: ' + paymentRefCode);
    console.log('Amount: GH₵ ' + paymentAmount.toFixed(2));
    console.log('Date: ' + paymentDate);
    console.log('Total Paid: GH₵ ' + newAmountPaid.toFixed(2));
    
    // Update locally
    sub.amountPaid = newAmountPaid;
    
    // Save to storage
    saveSubscriptionsToStorage();
    
    // If API available, sync to backend
    if (typeof API !== 'undefined' && API) {
      API.request('updateSubscriptionPayment', {
        subscriptionCode: currentPaymentId,
        amountPaid: newAmountPaid
      })
      .then(function(response) {
        console.log('Payment saved to sheet:', response);
        if (response && response.success) {
          showScheduleToast('Payment recorded: ' + paymentRefCode, 'success');
        } else {
          showScheduleToast('Payment recorded locally (sheet sync failed)', 'warning');
        }
        closePaymentModal();
        renderArrearsTableEnhanced();
      })
      .catch(function(error) {
        console.error('Error saving payment to sheet:', error);
        showScheduleToast('Payment recorded locally (sheet sync failed)', 'warning');
        closePaymentModal();
        renderArrearsTableEnhanced();
      });
    } else {
      showScheduleToast('Payment recorded: ' + paymentRefCode, 'success');
      closePaymentModal();
      renderArrearsTableEnhanced();
    }
  }
}
function closePaymentModal() {
  document.getElementById('paymentModal').style.display = 'none';
  currentPaymentId = null;
}

// ============================================
// RENEWAL MODAL FUNCTIONS
// ============================================

function openRenewModalByCode(code) {
  const sub = subscriptionsList.find(s => s.code === code);
  if (!sub) {
    console.error('Subscription not found:', code);
    return;
  }
  openRenewModal(sub);
}

function openRenewModal(sub) {
  if (!sub) return;
  
  currentRenewId = sub.code;
  
  document.getElementById('renewCode').value = sub.code || '';
  document.getElementById('renewName').value = sub.name || '';
  document.getElementById('renewCategory').value = sub.category || '';
  document.getElementById('renewVendor').value = sub.vendor || '';
  document.getElementById('renewAnnualCost').value = sub.annualCost || 0;
  document.getElementById('renewPaymentMode').value = sub.paymentMode || 'Prepaid';
  
  const newExpiry = new Date();
  newExpiry.setFullYear(newExpiry.getFullYear() + 1);
  document.getElementById('renewExpiryDate').value = newExpiry.toISOString().split('T')[0];
  
  document.getElementById('renewModal').style.display = 'flex';
}

function processRenewal() {
  const index = subscriptionsList.findIndex(s => s.code === currentRenewId);
  if (index === -1) {
    showScheduleToast('Subscription not found', 'error');
    return;
  }
  
  const newExpiryDate = document.getElementById('renewExpiryDate').value;
  const newVendor = document.getElementById('renewVendor').value;
  const newAnnualCost = parseFloat(document.getElementById('renewAnnualCost').value) || 0;
  const newPaymentMode = document.getElementById('renewPaymentMode').value;
  
  if (!newExpiryDate) {
    showScheduleToast('Please select an expiry date', 'error');
    return;
  }
  
  subscriptionsList[index] = {
    ...subscriptionsList[index],
    expiryDate: newExpiryDate,
    vendor: newVendor,
    annualCost: newAnnualCost,
    paymentMode: newPaymentMode,
    startDate: new Date().toISOString().split('T')[0],
    amountPaid: 0
  };
  
  if (typeof API !== 'undefined' && API) {
    const renewalData = {
      subscriptionCode: currentRenewId,
      newExpiryDate: newExpiryDate,
      newAnnualCost: newAnnualCost
    };
    
    API.renewSubscription(renewalData.subscriptionCode, renewalData.newExpiryDate, renewalData.newAnnualCost)
      .then(function(response) {
        console.log('Renewal successful:', response);
        saveSubscriptionsToStorage();
        renderAllTables();
        closeRenewModal();
        showScheduleToast('Subscription renewed successfully!', 'success');
      })
      .catch(function(error) {
        console.error('Error renewing subscription:', error);
        showScheduleToast('Error renewing subscription', 'error');
      });
  } else {
    saveSubscriptionsToStorage();
    renderAllTables();
    closeRenewModal();
    showScheduleToast('Subscription renewed successfully! (Local)', 'success');
  }
}

function closeRenewModal() {
  document.getElementById('renewModal').style.display = 'none';
  currentRenewId = null;
}

// ============================================
// PRINT FUNCTIONS
// ============================================

function printSubscriptionSchedule() {
  printReportTable('allSchedule', 'Subscription & License Schedule');
}

function printPrepaidReport() {
  printReportTable('prepaid', 'Prepaid Subscriptions Report');
}

function printArrearsReport() {
  printReportTable('arrears', 'In Arrears Subscriptions Report');
}

function printExpiredReport() {
  printReportTable('expired', 'Expired Subscriptions Report');
}

function printReportTable(tabId, title) {
  const tableWrapper = document.querySelector(`#${tabId} .report-table-wrapper`);
  if (!tableWrapper) {
    showScheduleToast('Table not found', 'error');
    return;
  }
  
  const tableContent = tableWrapper.cloneNode(true);
  
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          h1 { color: #333; }
          .total-row { background-color: #e8f8f3; font-weight: bold; }
          .total-cell { background-color: #d0f0e6; }
          .group-header { background-color: #e2e8f0; font-weight: bold; }
          .group-total-row { background-color: #fef3c7; }
          .grand-total-row { background-color: #4361ee; color: white; }
          .text-danger { color: #dc2626; }
          .text-warning { color: #d97706; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <p>Generated on: ${new Date().toLocaleString()}</p>
        ${tableContent.innerHTML}
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.print();
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function calculateDaysLeft(expiryDateStr) {
  if (!expiryDateStr) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDateStr);
  expiry.setHours(0, 0, 0, 0);
  const diffTime = expiry - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('en-GB');
  } catch (e) {
    return '-';
  }
}

function formatDateForInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatCurrency(val) {
  if (val === null || val === undefined || val === '') return '0.00';
  const numValue = parseFloat(val);
  if (isNaN(numValue)) return '0.00';
  return numValue.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function showScheduleToast(message, type) {
  let toast = document.getElementById('subToast');
  if (!toast) {
    const newToast = document.createElement('div');
    newToast.id = 'subToast';
    newToast.className = 'sub-toast';
    newToast.style.cssText = 'position:fixed;bottom:20px;right:20px;background:#4361ee;color:white;padding:12px 24px;border-radius:8px;z-index:1000;display:none;';
    newToast.innerHTML = '<span id="subToastMessage"></span>';
    document.body.appendChild(newToast);
    toast = newToast;
  }
  
  const toastEl = document.getElementById('subToast');
  const msgSpan = document.getElementById('subToastMessage');
  if (msgSpan) msgSpan.innerText = message;
  if (toastEl) {
    toastEl.style.backgroundColor = type === 'error' ? '#ef476f' : (type === 'success' ? '#06d6a0' : '#4361ee');
    toastEl.style.display = 'block';
    setTimeout(() => {
      toastEl.style.display = 'none';
    }, 3000);
  }
}

// Expose global functions
window.initSubscriptionScheduleModule = initSubscriptionScheduleModule;
window.switchSubscriptionTab = switchSubscriptionTab;
window.openRenewModal = openRenewModal;
window.closeRenewModal = closeRenewModal;
window.processRenewal = processRenewal;
window.openPaymentModal = openPaymentModal;
window.closePaymentModal = closePaymentModal;
window.processPayment = processPayment;
window.applyDateFilter = applyDateFilter;
window.applyPrepaidDateFilter = applyPrepaidDateFilter;
window.applyArrearsDateFilter = applyArrearsDateFilter;
window.printSubscriptionSchedule = printSubscriptionSchedule;
window.printPrepaidReport = printPrepaidReport;
window.printArrearsReport = printArrearsReport;
window.printExpiredReport = printExpiredReport;
window.refreshSubscriptionSchedule = refreshSubscriptionSchedule;
