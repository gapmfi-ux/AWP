// ============================================
// SUBSCRIPTION SCHEDULE MODULE
// ============================================

let subscriptionsList = [];
let currentRenewId = null;
let currentFilter = { fromDate: '', toDate: '' };

// Separate filter variables for each tab
let prepaidFilter = { fromDate: '', toDate: '' };
let arrearsFilter = { fromDate: '', toDate: '' };

// ============================================
// SCHEDULE MODULE INITIALIZATION
// ============================================

function initSubscriptionScheduleModule() {
  console.log('Initializing Subscription Schedule Module');
  loadSubscriptionsFromStorage();
  
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
  
  renderAllTables();
}

function loadSubscriptionsFromStorage() {
  const stored = localStorage.getItem('subscriptions_list');
  if (stored) {
    subscriptionsList = JSON.parse(stored);
  } else {
    subscriptionsList = getDemoSubscriptions();
    saveSubscriptionsToStorage();
  }
}

function saveSubscriptionsToStorage() {
  localStorage.setItem('subscriptions_list', JSON.stringify(subscriptionsList));
}

function refreshSubscriptionSchedule() {
  loadSubscriptionsFromStorage();
  renderAllTables();
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
    { id: '1', code: 'SUB-2024-0001', name: 'Microsoft 365 Business', category: 'Software License', vendor: 'Microsoft', startDate: '2024-01-01', expiryDate: nextWeek.toISOString().split('T')[0], annualCost: 750, paymentMode: 'Prepaid' },
    { id: '2', code: 'SUB-2024-0002', name: 'QuickBooks Online', category: 'SaaS Subscription', vendor: 'Intuit', startDate: '2024-03-10', expiryDate: nextMonth.toISOString().split('T')[0], annualCost: 480, paymentMode: 'In Arrears' },
    { id: '3', code: 'SUB-2024-0003', name: 'Company Domain (.com)', category: 'Domain Renewal', vendor: 'GoDaddy', startDate: '2024-02-01', expiryDate: expired.toISOString().split('T')[0], annualCost: 18, paymentMode: 'Prepaid' },
    { id: '4', code: 'SUB-2024-0004', name: 'Adobe Creative Cloud', category: 'SaaS Subscription', vendor: 'Adobe', startDate: '2024-05-01', expiryDate: farFuture.toISOString().split('T')[0], annualCost: 600, paymentMode: 'Prepaid' },
    { id: '5', code: 'SUB-2024-0005', name: 'AWS Cloud Services', category: 'Cloud Service', vendor: 'Amazon', startDate: '2024-01-15', expiryDate: twoMonthsLater.toISOString().split('T')[0], annualCost: 1200, paymentMode: 'In Arrears' }
  ];
}

// ============================================
// DATE FILTER FUNCTIONS
// ============================================

function applyDateFilter() {
  currentFilter.fromDate = document.getElementById('fromDate').value;
  currentFilter.toDate = document.getElementById('toDate').value;
  renderAllSchedulesGrouped();
}

function isWithinDateRange(expiryDate) {
  if (!currentFilter.fromDate && !currentFilter.toDate) return true;
  
  const expiry = new Date(expiryDate);
  const from = currentFilter.fromDate ? new Date(currentFilter.fromDate) : null;
  const to = currentFilter.toDate ? new Date(currentFilter.toDate) : null;
  
  if (from && to) {
    return expiry >= from && expiry <= to;
  } else if (from) {
    return expiry >= from;
  } else if (to) {
    return expiry <= to;
  }
  return true;
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
  
  let filteredList = subscriptionsList.filter(sub => isWithinDateRange(sub.expiryDate));
  
  if (!filteredList.length) {
    container.innerHTML = '<div class="report-table-wrapper"><table class="report-table"><tbody><tr><td colspan="9" class="loading-cell">No subscriptions found</td></tr></tbody></table></div>';
    return;
  }
  
  // Group by category
  const grouped = {};
  filteredList.forEach(sub => {
    if (!grouped[sub.category]) {
      grouped[sub.category] = [];
    }
    grouped[sub.category].push(sub);
  });
  
  let totalAnnualCost = 0;
  let html = '<div class="report-table-wrapper"><table class="report-table"><thead><tr>';
  html += '<th>Code</th><th>Name</th><th>Category</th><th>Vendor</th><th>Start Date</th>';
  html += '<th>Expiry Date</th><th>Annual Cost (GH₵)</th><th>Payment Mode</th><th>Days Left</th>';
  html += '</tr></thead><tbody>';
  
  // Sort categories alphabetically
  const sortedCategories = Object.keys(grouped).sort();
  
  for (const category of sortedCategories) {
    const items = grouped[category];
    let categoryTotal = 0;
    
    // Add group header
    html += `<tr class="group-header"><td colspan="9"><strong>${escapeHtml(category)}</strong> (${items.length} items)</td></tr>`;
    
    // Add items
    items.forEach(sub => {
      const daysLeft = calculateDaysLeft(sub.expiryDate);
      categoryTotal += sub.annualCost;
      
      html += `
        <tr>
          <td>${escapeHtml(sub.code)}</td>
          <td><strong>${escapeHtml(sub.name)}</strong></td>
          <td>${escapeHtml(sub.category)}</td>
          <td>${escapeHtml(sub.vendor || '-')}</td>
          <td>${formatDate(sub.startDate)}</td>
          <td>${formatDate(sub.expiryDate)}</td>
          <td>GH₵ ${formatCurrency(sub.annualCost)}</td>
          <td>${escapeHtml(sub.paymentMode)}</td>
          <td class="${daysLeft < 0 ? 'text-danger' : (daysLeft <= 7 ? 'text-warning' : '')}">${daysLeft}</td>
        </tr>
      `;
    });
    
    // Add category subtotal
    html += `<tr class="group-total-row"><td colspan="6"><strong>Category Total</strong></td><td colspan="3"><strong>GH₵ ${formatCurrency(categoryTotal)}</strong></td></tr>`;
    totalAnnualCost += categoryTotal;
  }
  
  // Add grand total
  html += `<tr class="grand-total-row"><td colspan="6"><strong>GRAND TOTAL</strong></td><td colspan="3"><strong>GH₵ ${formatCurrency(totalAnnualCost)}</strong></td></tr>`;
  html += '</tbody></table></div>';
  
  container.innerHTML = html;
}

function renderPrepaidTableEnhanced() {
  const tbody = document.getElementById('prepaidTableBody');
  const tfoot = document.getElementById('prepaidTableFooter');
  if (!tbody) return;
  
  let prepaidList = subscriptionsList.filter(sub => sub.paymentMode === 'Prepaid');
  
  // Apply date filter
  if (prepaidFilter.fromDate) {
    prepaidList = prepaidList.filter(sub => sub.expiryDate >= prepaidFilter.fromDate);
  }
  if (prepaidFilter.toDate) {
    prepaidList = prepaidList.filter(sub => sub.expiryDate <= prepaidFilter.toDate);
  }
  
  if (!prepaidList.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="loading-cell">No prepaid subscriptions found</td></tr>';
    if (tfoot) tfoot.innerHTML = '';
    return;
  }
  
  let totalRemainingAmount = 0;
  let rows = '';
  
  prepaidList.forEach(sub => {
    const monthlyCharge = sub.annualCost / 12;
    const daysLeft = calculateDaysLeft(sub.expiryDate);
    const monthsLeft = Math.max(0, daysLeft / 30.44);
    const remainingAmount = monthlyCharge * monthsLeft;
    totalRemainingAmount += remainingAmount;
    
    rows += `
      <tr>
        <td>${escapeHtml(sub.code)}</td>
        <td><strong>${escapeHtml(sub.name)}</strong></td>
        <td>${escapeHtml(sub.category)}</td>
        <td>${formatDate(sub.expiryDate)}</td>
        <td>GH₵ ${formatCurrency(sub.annualCost)}</td>
        <td>GH₵ ${formatCurrency(monthlyCharge)}</td>
        <td>GH₵ ${formatCurrency(remainingAmount)}</td>
      </tr>
    `;
  });
  
  tbody.innerHTML = rows;
  
  if (tfoot) {
    tfoot.innerHTML = `
      <tr class="total-row">
        <td colspan="6" style="text-align: right; font-weight: 700;">Total Remaining Amount:</td>
        <td class="total-cell">GH₵ ${formatCurrency(totalRemainingAmount)}</td>
      </tr>
    `;
  }
}

function renderArrearsTableEnhanced() {
  const tbody = document.getElementById('arrearsTableBody');
  const tfoot = document.getElementById('arrearsTableFooter');
  if (!tbody) return;
  
  let arrearsList = subscriptionsList.filter(sub => sub.paymentMode === 'In Arrears');
  
  // Apply date filter
  if (arrearsFilter.fromDate) {
    arrearsList = arrearsList.filter(sub => sub.expiryDate >= arrearsFilter.fromDate);
  }
  if (arrearsFilter.toDate) {
    arrearsList = arrearsList.filter(sub => sub.expiryDate <= arrearsFilter.toDate);
  }
  
  if (!arrearsList.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="loading-cell">No in-arrears subscriptions found</td></tr>';
    if (tfoot) tfoot.innerHTML = '';
    return;
  }
  
  let totalRemainingAmount = 0;
  let rows = '';
  
  arrearsList.forEach(sub => {
    const daysLeft = calculateDaysLeft(sub.expiryDate);
    const totalMonths = 12;
    const elapsedMonths = Math.max(0, totalMonths - Math.max(0, daysLeft / 30.44));
    const monthlyCharge = sub.annualCost / 12;
    const amountPaid = monthlyCharge * elapsedMonths;
    const remainingAmount = sub.annualCost - amountPaid;
    totalRemainingAmount += remainingAmount;
    
    rows += `
      <tr>
        <td>${escapeHtml(sub.code)}</td>
        <td><strong>${escapeHtml(sub.name)}</strong></td>
        <td>${escapeHtml(sub.category)}</td>
        <td>${formatDate(sub.expiryDate)}</td>
        <td>GH₵ ${formatCurrency(sub.annualCost)}</td>
        <td>GH₵ ${formatCurrency(amountPaid)}</td>
        <td>GH₵ ${formatCurrency(remainingAmount)}</td>
      </tr>
    `;
  });
  
  tbody.innerHTML = rows;
  
  if (tfoot) {
    tfoot.innerHTML = `
      <tr class="total-row">
        <td colspan="6" style="text-align: right; font-weight: 700;">Total Remaining Amount:</td>
        <td class="total-cell">GH₵ ${formatCurrency(totalRemainingAmount)}</td>
      </tr>
    `;
  }
}

function renderExpiredTableEnhanced() {
  const tbody = document.getElementById('expiredTableBody');
  if (!tbody) return;
  
  let expiredList = subscriptionsList.filter(sub => calculateDaysLeft(sub.expiryDate) < 0);
  
  if (!expiredList.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="loading-cell">No expired subscriptions found</td></tr>';
    return;
  }
  
  let rows = '';
  
  expiredList.forEach(sub => {
    const daysOverdue = Math.abs(calculateDaysLeft(sub.expiryDate));
    rows += `
      <tr style="background:#fff5f5;">
        <td>${escapeHtml(sub.code)}</td>
        <td><strong>${escapeHtml(sub.name)}</strong></td>
        <td>${escapeHtml(sub.category)}</td>
        <td>${escapeHtml(sub.vendor || '-')}</td>
        <td>${formatDate(sub.expiryDate)}</td>
        <td>GH₵ ${formatCurrency(sub.annualCost)}</td>
        <td class="text-danger"><strong>${daysOverdue} days overdue</strong></td>
        <td><button class="renew-btn" onclick="openRenewModal('${sub.id}')">Renew</button></td>
      </tr>
    `;
  });
  
  tbody.innerHTML = rows;
}

// ============================================
// TAB SWITCHING (Like Inventory Report)
// ============================================

function switchSubscriptionTab(tabName) {
  // Hide all tabs
  document.querySelectorAll('.tab-content').forEach(function(tab) {
    tab.classList.remove('active');
  });

  // Remove active class from all buttons
  document.querySelectorAll('.tab-btn').forEach(function(btn) {
    btn.classList.remove('active');
  });

  // Show selected tab
  const tabElement = document.getElementById(tabName);
  if (tabElement) tabElement.classList.add('active');

  // Add active class to clicked button
  if (window.event && window.event.target) {
    const btnElement = window.event.target.closest('.tab-btn');
    if (btnElement) btnElement.classList.add('active');
  }

  // Toggle control groups
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
// RENEWAL FUNCTIONS
// ============================================

function openRenewModal(id) {
  const sub = subscriptionsList.find(s => s.id === id);
  if (!sub) return;
  
  currentRenewId = id;
  
  document.getElementById('renewCode').value = sub.code;
  document.getElementById('renewName').value = sub.name;
  document.getElementById('renewCategory').value = sub.category;
  document.getElementById('renewVendor').value = sub.vendor || '';
  document.getElementById('renewAnnualCost').value = sub.annualCost;
  document.getElementById('renewPaymentMode').value = sub.paymentMode;
  
  const newExpiry = new Date();
  newExpiry.setFullYear(newExpiry.getFullYear() + 1);
  document.getElementById('renewExpiryDate').value = newExpiry.toISOString().split('T')[0];
  
  document.getElementById('renewModal').style.display = 'flex';
}

function processRenewal() {
  const index = subscriptionsList.findIndex(s => s.id === currentRenewId);
  if (index === -1) return;
  
  const newExpiryDate = document.getElementById('renewExpiryDate').value;
  const newVendor = document.getElementById('renewVendor').value;
  const newAnnualCost = parseFloat(document.getElementById('renewAnnualCost').value);
  const newPaymentMode = document.getElementById('renewPaymentMode').value;
  
  subscriptionsList[index] = {
    ...subscriptionsList[index],
    expiryDate: newExpiryDate,
    vendor: newVendor,
    annualCost: newAnnualCost,
    paymentMode: newPaymentMode,
    startDate: new Date().toISOString().split('T')[0]
  };
  
  saveSubscriptionsToStorage();
  renderAllTables();
  closeRenewModal();
  showToast('Subscription renewed successfully!', 'success');
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
  const tableContent = document.querySelector(`#${tabId} .report-table-wrapper`).cloneNode(true);
  
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
  printWindow.close();
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function calculateDaysLeft(expiryDateStr) {
  const today = new Date();
  today.setHours(0,0,0,0);
  const expiry = new Date(expiryDateStr);
  expiry.setHours(0,0,0,0);
  const diffTime = expiry - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB');
}

function formatDateForInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatCurrency(val) {
  return val.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

function showToast(message, type) {
  const toast = document.getElementById('subToast');
  if (!toast) return;
  
  const msgSpan = document.getElementById('subToastMessage');
  msgSpan.innerText = message;
  toast.style.backgroundColor = type === 'error' ? '#ef476f' : (type === 'success' ? '#06d6a0' : '#4361ee');
  toast.style.display = 'block';
  setTimeout(() => {
    toast.style.display = 'none';
  }, 3000);
}

// Expose global functions for schedule module
window.initSubscriptionScheduleModule = initSubscriptionScheduleModule;
window.switchSubscriptionTab = switchSubscriptionTab;
window.openRenewModal = openRenewModal;
window.closeRenewModal = closeRenewModal;
window.processRenewal = processRenewal;
window.applyDateFilter = applyDateFilter;
window.applyPrepaidDateFilter = applyPrepaidDateFilter;
window.applyArrearsDateFilter = applyArrearsDateFilter;
window.printSubscriptionSchedule = printSubscriptionSchedule;
window.printPrepaidReport = printPrepaidReport;
window.printArrearsReport = printArrearsReport;
window.printExpiredReport = printExpiredReport;
window.refreshSubscriptionSchedule = refreshSubscriptionSchedule;
