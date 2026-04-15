/* ============================================
   SUBSCRIPTIONS & LICENSES RENEWALS MODULE
   ============================================ */

let subscriptionsList = [];
let currentRenewId = null;
let currentFilter = { fromDate: '', toDate: '' };

// Category list
const subscriptionCategories = [
  'Software License',
  'SaaS Subscription', 
  'Domain Renewal',
  'SSL Certificate',
  'Maintenance Contract',
  'Cloud Service',
  'Other'
];

// ============================================
// ADD NEW MODULE INITIALIZATION
// ============================================

function initSubscriptionAddModule() {
  console.log('Initializing Subscription Add Module');
  
  const categorySelect = document.getElementById('subCategory');
  if (categorySelect) {
    categorySelect.innerHTML = '<option value="">Select Category</option>';
    subscriptionCategories.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat;
      option.textContent = cat;
      categorySelect.appendChild(option);
    });
  }
  
  const today = new Date().toISOString().split('T')[0];
  const startDateField = document.getElementById('startDate');
  const expiryDateField = document.getElementById('expiryDate');
  
  if (startDateField) startDateField.value = today;
  if (expiryDateField) {
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    expiryDateField.value = nextYear.toISOString().split('T')[0];
  }
  
  generateLicenseCode();
  loadSubscriptionsFromStorage();
}

function generateLicenseCode() {
  const codeField = document.getElementById('licenseCode');
  if (codeField) {
    const prefix = 'SUB';
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    codeField.value = `${prefix}-${year}-${random}`;
  }
}

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
  
  document.getElementById('fromDate').value = formatDateForInput(firstDay);
  document.getElementById('toDate').value = formatDateForInput(lastDay);
  
  currentFilter.fromDate = formatDateForInput(firstDay);
  currentFilter.toDate = formatDateForInput(lastDay);
  
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
  renderAllTables();
}

function clearDateFilter() {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  
  document.getElementById('fromDate').value = formatDateForInput(firstDay);
  document.getElementById('toDate').value = formatDateForInput(lastDay);
  
  currentFilter.fromDate = formatDateForInput(firstDay);
  currentFilter.toDate = formatDateForInput(lastDay);
  renderAllTables();
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

// ============================================
// SUBMIT NEW SUBSCRIPTION
// ============================================

function submitSubscription() {
  const name = document.getElementById('subName').value.trim();
  const category = document.getElementById('subCategory').value;
  const vendor = document.getElementById('vendor').value;
  const licenseCode = document.getElementById('licenseCode').value;
  const startDate = document.getElementById('startDate').value;
  const expiryDate = document.getElementById('expiryDate').value;
  const annualCost = parseFloat(document.getElementById('annualCost').value);
  const paymentMode = document.getElementById('paymentMode').value;
  
  if (!name || !category || !startDate || !expiryDate || isNaN(annualCost) || annualCost <= 0) {
    showToast('Please fill all required fields', 'error');
    return;
  }
  
  if (new Date(expiryDate) <= new Date(startDate)) {
    showToast('Expiry date must be after start date', 'error');
    return;
  }
  
  const subscriptionData = {
    id: generateId(),
    code: licenseCode,
    name, category, vendor, startDate, expiryDate,
    annualCost, paymentMode
  };
  
  subscriptionsList.push(subscriptionData);
  saveSubscriptionsToStorage();
  
  showToast('Subscription saved successfully!', 'success');
  resetSubscriptionForm();
  generateLicenseCode();
}

function resetSubscriptionForm() {
  const form = document.getElementById('subscriptionForm');
  if (form) form.reset();
  const today = new Date().toISOString().split('T')[0];
  const startField = document.getElementById('startDate');
  if (startField) startField.value = today;
  const nextYear = new Date();
  nextYear.setFullYear(nextYear.getFullYear() + 1);
  const expiryField = document.getElementById('expiryDate');
  if (expiryField) expiryField.value = nextYear.toISOString().split('T')[0];
  document.getElementById('paymentMode').value = 'Prepaid';
}

// ============================================
// RENDER FUNCTIONS
// ============================================

function renderAllTables() {
  renderAllSchedulesGrouped();
  renderPrepaidTable();
  renderArrearsTable();
  renderExpiredTable();
}

function renderAllSchedulesGrouped() {
  const container = document.getElementById('allScheduleWrapper');
  if (!container) return;
  
  let filteredList = subscriptionsList.filter(sub => isWithinDateRange(sub.expiryDate));
  
  // Apply search filter
  const searchTerm = document.getElementById('scheduleSearch')?.value.toLowerCase() || '';
  if (searchTerm) {
    filteredList = filteredList.filter(sub => 
      sub.name.toLowerCase().includes(searchTerm) || 
      (sub.vendor && sub.vendor.toLowerCase().includes(searchTerm)) ||
      sub.code.toLowerCase().includes(searchTerm)
    );
  }
  
  if (!filteredList.length) {
    container.innerHTML = '<div class="table-wrapper"><table class="subscription-table"><tbody><tr><td colspan="10" class="loading-cell">No subscriptions found</td></tr></tbody></table></div>';
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
  let html = '<div class="table-wrapper"><table class="subscription-table"><thead><tr>';
  html += '<th>Code</th><th>Name</th><th>Category</th><th>Vendor</th><th>Start Date</th>';
  html += '<th>Expiry Date</th><th>Annual Cost (GH₵)</th><th>Payment Mode</th><th>Days Left</th><th>Status</th>';
  html += '</tr></thead><tbody>';
  
  // Sort categories alphabetically
  const sortedCategories = Object.keys(grouped).sort();
  
  for (const category of sortedCategories) {
    const items = grouped[category];
    let categoryTotal = 0;
    
    // Add group header
    html += `<tr class="group-header"><td colspan="10"><strong>${escapeHtml(category)}</strong> (${items.length} items)</td></tr>`;
    
    // Add items
    items.forEach(sub => {
      const daysLeft = calculateDaysLeft(sub.expiryDate);
      const status = getStatusBadge(daysLeft);
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
          <td>${daysLeft}</td>
          <td>${status}</td>
        </tr>
      `;
    });
    
    // Add category subtotal
    html += `<tr class="group-total-row"><td colspan="6"><strong>Category Total</strong></td><td colspan="4"><strong>GH₵ ${formatCurrency(categoryTotal)}</strong></td></tr>`;
    totalAnnualCost += categoryTotal;
  }
  
  // Add grand total
  html += `<tr class="grand-total-row"><td colspan="6"><strong>GRAND TOTAL</strong></td><td colspan="4"><strong>GH₵ ${formatCurrency(totalAnnualCost)}</strong></td></tr>`;
  html += '</tbody></table></div>';
  
  container.innerHTML = html;
}

function renderPrepaidTable() {
  const tbody = document.getElementById('prepaidTableBody');
  if (!tbody) return;
  
  let prepaidList = subscriptionsList.filter(sub => 
    sub.paymentMode === 'Prepaid' && isWithinDateRange(sub.expiryDate)
  );
  
  if (!prepaidList.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="loading-cell">No prepaid subscriptions</td></tr>';
    return;
  }
  
  tbody.innerHTML = prepaidList.map(sub => {
    const monthlyCharge = sub.annualCost / 12;
    const daysLeft = calculateDaysLeft(sub.expiryDate);
    const monthsLeft = Math.max(0, daysLeft / 30.44);
    const remainingAmount = monthlyCharge * monthsLeft;
    const status = getStatusBadge(daysLeft);
    
    return `
      <tr>
        <td>${escapeHtml(sub.code)}</td>
        <td><strong>${escapeHtml(sub.name)}</strong></td>
        <td>${escapeHtml(sub.category)}</td>
        <td>${formatDate(sub.expiryDate)}</td>
        <td>GH₵ ${formatCurrency(sub.annualCost)}</td>
        <td>GH₵ ${formatCurrency(monthlyCharge)}</td>
        <td>GH₵ ${formatCurrency(remainingAmount)}</td>
        <td>${status}</td>
      </tr>
    `;
  }).join('');
}

function renderArrearsTable() {
  const tbody = document.getElementById('arrearsTableBody');
  if (!tbody) return;
  
  let arrearsList = subscriptionsList.filter(sub => 
    sub.paymentMode === 'In Arrears' && isWithinDateRange(sub.expiryDate)
  );
  
  if (!arrearsList.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="loading-cell">No in-arrears subscriptions</td></tr>';
    return;
  }
  
  tbody.innerHTML = arrearsList.map(sub => {
    const daysLeft = calculateDaysLeft(sub.expiryDate);
    const totalMonths = 12;
    const elapsedMonths = Math.max(0, totalMonths - Math.max(0, daysLeft / 30.44));
    const monthlyCharge = sub.annualCost / 12;
    const amountPaid = monthlyCharge * elapsedMonths;
    const remainingAmount = sub.annualCost - amountPaid;
    const status = getStatusBadge(daysLeft);
    
    return `
      <tr>
        <td>${escapeHtml(sub.code)}</td>
        <td><strong>${escapeHtml(sub.name)}</strong></td>
        <td>${escapeHtml(sub.category)}</td>
        <td>${formatDate(sub.expiryDate)}</td>
        <td>GH₵ ${formatCurrency(sub.annualCost)}</td>
        <td>GH₵ ${formatCurrency(amountPaid)}</td>
        <td>GH₵ ${formatCurrency(remainingAmount)}</td>
        <td>${status}</td>
      </tr>
    `;
  }).join('');
}

function renderExpiredTable() {
  const tbody = document.getElementById('expiredTableBody');
  if (!tbody) return;
  
  const expiredList = subscriptionsList.filter(sub => calculateDaysLeft(sub.expiryDate) < 0);
  
  if (!expiredList.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="loading-cell">No expired subscriptions</td></tr>';
    return;
  }
  
  tbody.innerHTML = expiredList.map(sub => {
    const daysOverdue = Math.abs(calculateDaysLeft(sub.expiryDate));
    return `
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
  }).join('');
}

function filterScheduleTable() {
  renderAllSchedulesGrouped();
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
// PRINT FUNCTION
// ============================================

function printSubscriptionSchedule() {
  const printContent = document.querySelector('.subscription-schedule-container').cloneNode(true);
  
  printContent.querySelectorAll('.renew-btn, .export-btn, .print-btn, .search-box, .header-actions, .filter-btn, .clear-btn').forEach(el => {
    if (el) el.remove();
  });
  
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <html>
      <head>
        <title>Subscription Schedule Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          h1 { color: #333; }
          .group-header { background-color: #e2e8f0; font-weight: bold; }
          .group-total-row { background-color: #fef3c7; }
          .grand-total-row { background-color: #4361ee; color: white; }
        </style>
      </head>
      <body>
        <h1>Subscription & License Schedule</h1>
        <p>Period: ${document.getElementById('fromDate')?.value || 'All'} to ${document.getElementById('toDate')?.value || 'All'}</p>
        <p>Generated on: ${new Date().toLocaleString()}</p>
        ${printContent.innerHTML}
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.print();
  printWindow.close();
}

// ============================================
// EXPORT FUNCTION
// ============================================

function exportSubscriptionsToCSV() {
  let csvRows = [['Code', 'Name', 'Category', 'Vendor', 'Start Date', 'Expiry Date', 'Annual Cost', 'Payment Mode', 'Status']];
  subscriptionsList.forEach(s => {
    const daysLeft = calculateDaysLeft(s.expiryDate);
    const status = daysLeft < 0 ? 'Expired' : (daysLeft <= 7 ? 'Critical' : (daysLeft <= 30 ? 'Expiring Soon' : 'Healthy'));
    csvRows.push([s.code, s.name, s.category, s.vendor || '', s.startDate, s.expiryDate, s.annualCost, s.paymentMode, status]);
  });
  const csvContent = csvRows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csvContent], {type: 'text/csv'});
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `subscriptions_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
  showToast('Export complete!', 'success');
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function switchScheduleTab(tabId) {
  document.querySelectorAll('.schedule-tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.schedule-tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(tabId).classList.add('active');
  
  const btns = document.querySelectorAll('.schedule-tab-btn');
  const tabMap = { allSchedule: 0, prepaid: 1, arrears: 2, expired: 3 };
  if (btns[tabMap[tabId]]) btns[tabMap[tabId]].classList.add('active');
}

function calculateDaysLeft(expiryDateStr) {
  const today = new Date();
  today.setHours(0,0,0,0);
  const expiry = new Date(expiryDateStr);
  expiry.setHours(0,0,0,0);
  const diffTime = expiry - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function getStatusBadge(daysLeft) {
  if (daysLeft < 0) return '<span class="status-badge status-expired">Expired</span>';
  if (daysLeft <= 7) return '<span class="status-badge status-critical">Critical</span>';
  if (daysLeft <= 30) return '<span class="status-badge status-warning">Expiring soon</span>';
  return '<span class="status-badge status-healthy">Healthy</span>';
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

function generateId() {
  return Date.now().toString() + '-' + Math.random().toString(36).substr(2, 8);
}

// Expose global functions
window.initSubscriptionAddModule = initSubscriptionAddModule;
window.initSubscriptionScheduleModule = initSubscriptionScheduleModule;
window.submitSubscription = submitSubscription;
window.resetSubscriptionForm = resetSubscriptionForm;
window.filterScheduleTable = filterScheduleTable;
window.exportSubscriptionsToCSV = exportSubscriptionsToCSV;
window.switchScheduleTab = switchScheduleTab;
window.openRenewModal = openRenewModal;
window.closeRenewModal = closeRenewModal;
window.processRenewal = processRenewal;
window.printSubscriptionSchedule = printSubscriptionSchedule;
window.applyDateFilter = applyDateFilter;
window.clearDateFilter = clearDateFilter;
