/* ============================================
   SUBSCRIPTIONS & LICENSES RENEWALS MODULE
   Supports: subscriptionAdd and subscriptionSchedule
   ============================================ */

// Global storage
let subscriptionsList = [];
let pendingDeleteId = null;

// ============================================
// ADD NEW MODULE INITIALIZATION
// ============================================

function initSubscriptionAddModule() {
  console.log('Initializing Subscription Add Module');
  
  const today = new Date().toISOString().split('T')[0];
  const startDateField = document.getElementById('startDate');
  const expiryDateField = document.getElementById('expiryDate');
  
  if (startDateField) startDateField.value = today;
  if (expiryDateField) {
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    expiryDateField.value = nextYear.toISOString().split('T')[0];
  }
  
  // Load existing data from localStorage
  loadSubscriptionsFromStorage();
}

// ============================================
// SCHEDULE MODULE INITIALIZATION
// ============================================

function initSubscriptionScheduleModule() {
  console.log('Initializing Subscription Schedule Module');
  loadSubscriptionsFromStorage();
  renderScheduleTable();
  renderExpiringSoonTable();
  renderExpiredTable();
}

// Load from localStorage
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

// Demo data
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
  
  return [
    { id: '1', name: 'Microsoft 365 Business', category: 'Software License', vendor: 'Microsoft', startDate: '2024-01-01', expiryDate: nextWeek.toISOString().split('T')[0], annualCost: 750, renewalType: 'Auto-renew', assignedTo: 'IT Dept', licenseKey: 'MS-365-001', notes: '' },
    { id: '2', name: 'QuickBooks Online', category: 'SaaS Subscription', vendor: 'Intuit', startDate: '2024-03-10', expiryDate: nextMonth.toISOString().split('T')[0], annualCost: 480, renewalType: 'Auto-renew', assignedTo: 'Finance', licenseKey: 'QB-8923', notes: '' },
    { id: '3', name: 'Company Domain (.com)', category: 'Domain Renewal', vendor: 'GoDaddy', startDate: '2024-02-01', expiryDate: expired.toISOString().split('T')[0], annualCost: 18, renewalType: 'Manual Renewal', assignedTo: 'Marketing', licenseKey: 'domain-xyz.com', notes: 'Expired - renew ASAP' },
    { id: '4', name: 'Adobe Creative Cloud', category: 'SaaS Subscription', vendor: 'Adobe', startDate: '2024-05-01', expiryDate: farFuture.toISOString().split('T')[0], annualCost: 600, renewalType: 'Auto-renew', assignedTo: 'Design Team', licenseKey: 'ADC-2024', notes: '' }
  ];
}

// ============================================
// SUBMIT NEW SUBSCRIPTION
// ============================================

function submitSubscription() {
  const name = document.getElementById('subName').value.trim();
  const category = document.getElementById('subCategory').value;
  const vendor = document.getElementById('vendor').value;
  const licenseKey = document.getElementById('licenseKey').value;
  const startDate = document.getElementById('startDate').value;
  const expiryDate = document.getElementById('expiryDate').value;
  const annualCost = parseFloat(document.getElementById('annualCost').value);
  const renewalType = document.getElementById('renewalType').value;
  const assignedTo = document.getElementById('assignedTo').value;
  const notes = document.getElementById('notes').value;
  
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
    name, category, vendor, licenseKey, startDate, expiryDate,
    annualCost, renewalType, assignedTo, notes
  };
  
  subscriptionsList.push(subscriptionData);
  saveSubscriptionsToStorage();
  
  showToast('Subscription saved successfully!', 'success');
  resetSubscriptionForm();
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
}

// ============================================
// RENDER FUNCTIONS FOR SCHEDULE MODULE
// ============================================

function renderScheduleTable() {
  const tbody = document.getElementById('scheduleTableBody');
  if (!tbody) return;
  
  if (!subscriptionsList.length) {
    tbody.innerHTML = '<tr><td colspan="9" class="loading-cell">No subscriptions found. Add one from the menu!</td></tr>';
    return;
  }
  
  tbody.innerHTML = subscriptionsList.map(sub => {
    const daysLeft = calculateDaysLeft(sub.expiryDate);
    const status = getStatusBadge(daysLeft);
    return `
      <tr>
        <td><strong>${escapeHtml(sub.name)}</strong></td>
        <td>${escapeHtml(sub.category)}</td>
        <td>${escapeHtml(sub.vendor || '-')}</td>
        <td>${formatDate(sub.startDate)}</td>
        <td>${formatDate(sub.expiryDate)}</td>
        <td>GH₵ ${formatCurrency(sub.annualCost)}</td>
        <td>${daysLeft}</td>
        <td>${status}</td>
        <td>
          <button class="action-icon-btn edit" onclick="editSubscription('${sub.id}')" title="Edit"><i class="fas fa-edit"></i></button>
          <button class="action-icon-btn delete" onclick="confirmDeleteSubscription('${sub.id}')" title="Delete"><i class="fas fa-trash-alt"></i></button>
        </td>
      </tr>
    `;
  }).join('');
}

function renderExpiringSoonTable() {
  const tbody = document.getElementById('expiringTableBody');
  if (!tbody) return;
  
  const expiringList = subscriptionsList.filter(sub => {
    const days = calculateDaysLeft(sub.expiryDate);
    return days >= 0 && days <= 30;
  }).sort((a, b) => calculateDaysLeft(a.expiryDate) - calculateDaysLeft(b.expiryDate));
  
  if (!expiringList.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="loading-cell">No subscriptions expiring within 30 days ✅</td></tr>';
    return;
  }
  
  tbody.innerHTML = expiringList.map(sub => {
    const daysLeft = calculateDaysLeft(sub.expiryDate);
    const rowClass = daysLeft <= 7 ? 'style="background:#fff5f5;"' : '';
    return `
      <tr ${rowClass}>
        <td><strong>${escapeHtml(sub.name)}</strong></td>
        <td>${escapeHtml(sub.category)}</td>
        <td>${escapeHtml(sub.vendor || '-')}</td>
        <td>${formatDate(sub.expiryDate)}</td>
        <td>GH₵ ${formatCurrency(sub.annualCost)}</td>
        <td class="${daysLeft <= 7 ? 'text-danger' : 'text-warning'}"><strong>${daysLeft} days</strong></td>
        <td>${escapeHtml(sub.renewalType)}</td>
        <td><button class="action-icon-btn edit" onclick="editSubscription('${sub.id}')"><i class="fas fa-edit"></i> Edit</button></td>
      </tr>
    `;
  }).join('');
}

function renderExpiredTable() {
  const tbody = document.getElementById('expiredTableBody');
  if (!tbody) return;
  
  const expiredList = subscriptionsList.filter(sub => {
    const days = calculateDaysLeft(sub.expiryDate);
    return days < 0;
  }).sort((a, b) => calculateDaysLeft(b.expiryDate) - calculateDaysLeft(a.expiryDate));
  
  if (!expiredList.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="loading-cell">No expired subscriptions 🎉</td></tr>';
    return;
  }
  
  tbody.innerHTML = expiredList.map(sub => {
    const daysOverdue = Math.abs(calculateDaysLeft(sub.expiryDate));
    return `
      <tr style="background:#fff5f5;">
        <td><strong>${escapeHtml(sub.name)}</strong></td>
        <td>${escapeHtml(sub.category)}</td>
        <td>${escapeHtml(sub.vendor || '-')}</td>
        <td>${formatDate(sub.expiryDate)}</td>
        <td>GH₵ ${formatCurrency(sub.annualCost)}</td>
        <td class="text-danger"><strong>${daysOverdue} days overdue</strong></td>
        <td><button class="action-icon-btn edit" onclick="editSubscription('${sub.id}')"><i class="fas fa-edit"></i> Edit</button></td>
      </tr>
    `;
  }).join('');
}

function filterScheduleTable() {
  const searchTerm = document.getElementById('scheduleSearch')?.value.toLowerCase() || '';
  const tbody = document.getElementById('scheduleTableBody');
  if (!tbody) return;
  
  const filtered = subscriptionsList.filter(sub => 
    sub.name.toLowerCase().includes(searchTerm) || 
    (sub.vendor && sub.vendor.toLowerCase().includes(searchTerm)) ||
    sub.category.toLowerCase().includes(searchTerm)
  );
  
  if (!filtered.length) {
    tbody.innerHTML = '<tr><td colspan="9" class="loading-cell">No matching records</td></tr>';
    return;
  }
  
  tbody.innerHTML = filtered.map(sub => {
    const daysLeft = calculateDaysLeft(sub.expiryDate);
    const status = getStatusBadge(daysLeft);
    return `
      <tr>
        <td><strong>${escapeHtml(sub.name)}</strong></td>
        <td>${escapeHtml(sub.category)}</td>
        <td>${escapeHtml(sub.vendor || '-')}</td>
        <td>${formatDate(sub.startDate)}</td>
        <td>${formatDate(sub.expiryDate)}</td>
        <td>GH₵ ${formatCurrency(sub.annualCost)}</td>
        <td>${daysLeft}</td>
        <td>${status}</td>
        <td>
          <button class="action-icon-btn edit" onclick="editSubscription('${sub.id}')"><i class="fas fa-edit"></i></button>
          <button class="action-icon-btn delete" onclick="confirmDeleteSubscription('${sub.id}')"><i class="fas fa-trash-alt"></i></button>
        </td>
      </tr>
    `;
  }).join('');
}

// ============================================
// EDIT & DELETE FUNCTIONS
// ============================================

function editSubscription(id) {
  const sub = subscriptionsList.find(s => s.id === id);
  if (!sub) return;
  
  // Switch to Add New module
  if (typeof loadModule === 'function') {
    loadModule('subscriptionAdd');
    setTimeout(() => {
      document.getElementById('subName').value = sub.name;
      document.getElementById('subCategory').value = sub.category;
      document.getElementById('vendor').value = sub.vendor || '';
      document.getElementById('licenseKey').value = sub.licenseKey || '';
      document.getElementById('startDate').value = sub.startDate;
      document.getElementById('expiryDate').value = sub.expiryDate;
      document.getElementById('annualCost').value = sub.annualCost;
      document.getElementById('renewalType').value = sub.renewalType || 'Auto-renew';
      document.getElementById('assignedTo').value = sub.assignedTo || '';
      document.getElementById('notes').value = sub.notes || '';
      
      // Remove the old record first
      subscriptionsList = subscriptionsList.filter(s => s.id !== id);
      saveSubscriptionsToStorage();
      
      showToast('Edit mode: Update the form and save.', 'info');
    }, 200);
  }
}

function confirmDeleteSubscription(id) {
  if (confirm('Are you sure you want to delete this subscription permanently?')) {
    subscriptionsList = subscriptionsList.filter(s => s.id !== id);
    saveSubscriptionsToStorage();
    renderScheduleTable();
    renderExpiringSoonTable();
    renderExpiredTable();
    showToast('Subscription deleted successfully', 'success');
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function switchScheduleTab(tabId) {
  document.querySelectorAll('.schedule-tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.schedule-tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(tabId).classList.add('active');
  
  const btns = document.querySelectorAll('.schedule-tab-btn');
  if (tabId === 'allSchedule') btns[0]?.classList.add('active');
  else if (tabId === 'expiringSoon') btns[1]?.classList.add('active');
  else if (tabId === 'expired') btns[2]?.classList.add('active');
}

function exportSubscriptionsToCSV() {
  let csvRows = [['Name','Category','Vendor','Start Date','Expiry Date','Annual Cost','Renewal Type','Assigned To']];
  subscriptionsList.forEach(s => {
    csvRows.push([s.name, s.category, s.vendor || '', s.startDate, s.expiryDate, s.annualCost, s.renewalType, s.assignedTo || '']);
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
  const toastId = document.getElementById('subToast') ? 'subToast' : 'subScheduleToast';
  const toast = document.getElementById(toastId);
  const msgSpan = document.getElementById(toastId === 'subToast' ? 'subToastMessage' : 'subScheduleToastMessage');
  if (!toast) return;
  
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
window.editSubscription = editSubscription;
window.confirmDeleteSubscription = confirmDeleteSubscription;
window.filterScheduleTable = filterScheduleTable;
window.exportSubscriptionsToCSV = exportSubscriptionsToCSV;
window.switchScheduleTab = switchScheduleTab;
