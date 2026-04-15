/* ============================================
   SUBSCRIPTIONS & LICENSES RENEWALS MODULE
   Uses API Service (google.script.run compatibility)
   ============================================ */

// Global storage for subscriptions
let subscriptionsList = [];
let pendingDeleteId = null;

// ============================================
// INITIALIZATION
// ============================================

function initSubscriptionModule() {
  console.log('Initializing Subscriptions & Licenses Module');
  
  // Set default dates
  const today = new Date().toISOString().split('T')[0];
  const startDateField = document.getElementById('startDate');
  const expiryDateField = document.getElementById('expiryDate');
  
  if (startDateField) startDateField.value = today;
  if (expiryDateField) {
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    expiryDateField.value = nextYear.toISOString().split('T')[0];
  }
  
  // Load all subscriptions from backend
  loadAllSubscriptions();
}

// Load subscriptions via API (using global API or google.script.run)
async function loadAllSubscriptions() {
  showLoadingOverlay(true);
  try {
    // Use API service if available, otherwise fallback to google.script.run
    let result;
    if (window.API && typeof window.API.getAllSubscriptions === 'function') {
      result = await window.API.getAllSubscriptions();
    } else {
      // Fallback to google.script.run pattern
      result = await new Promise((resolve, reject) => {
        google.script.run
          .withSuccessHandler(resolve)
          .withFailureHandler(reject)
          .getAllSubscriptions();
      });
    }
    
    subscriptionsList = Array.isArray(result) ? result : (result?.data || []);
    renderScheduleTable();
    renderExpiringSoonTable();
  } catch (error) {
    console.error('Error loading subscriptions:', error);
    showMessage('Failed to load subscriptions. Using demo data.', 'warning');
    // Demo data for UI demonstration
    subscriptionsList = getDemoSubscriptions();
    renderScheduleTable();
    renderExpiringSoonTable();
  } finally {
    showLoadingOverlay(false);
  }
}

// Demo fallback data
function getDemoSubscriptions() {
  const today = new Date();
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);
  const nextMonth = new Date(today);
  nextMonth.setDate(today.getDate() + 25);
  const expired = new Date(today);
  expired.setDate(today.getDate() - 5);
  
  return [
    { id: '1', name: 'Microsoft 365 Business', category: 'Software License', vendor: 'Microsoft', startDate: '2024-01-01', expiryDate: nextWeek.toISOString().split('T')[0], annualCost: 750, renewalType: 'Auto-renew', assignedTo: 'IT Dept', licenseKey: 'MS-365-001', notes: '' },
    { id: '2', name: 'QuickBooks Online', category: 'SaaS Subscription', vendor: 'Intuit', startDate: '2024-03-10', expiryDate: nextMonth.toISOString().split('T')[0], annualCost: 480, renewalType: 'Auto-renew', assignedTo: 'Finance', licenseKey: 'QB-8923', notes: '' },
    { id: '3', name: 'Company Domain (.com)', category: 'Domain Renewal', vendor: 'GoDaddy', startDate: '2024-02-01', expiryDate: expired.toISOString().split('T')[0], annualCost: 18, renewalType: 'Manual Renewal', assignedTo: 'Marketing', licenseKey: 'domain-xyz.com', notes: 'Expired - renew ASAP' }
  ];
}

// Render the main schedule table
function renderScheduleTable() {
  const tbody = document.getElementById('scheduleTableBody');
  if (!tbody) return;
  
  if (!subscriptionsList.length) {
    tbody.innerHTML = '<tr><td colspan="9" class="loading-cell">No subscriptions found. Add one!</td></tr>';
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

// Render expiring soon (days <= 30)
function renderExpiringSoonTable() {
  const tbody = document.getElementById('expiringTableBody');
  if (!tbody) return;
  
  const today = new Date();
  today.setHours(0,0,0,0);
  const expiringList = subscriptionsList.filter(sub => {
    const days = calculateDaysLeft(sub.expiryDate);
    return days >= 0 && days <= 30;
  });
  
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
        <td class="${daysLeft <= 7 ? 'text-danger' : 'text-warning'}">${daysLeft} days</td>
        <td>${escapeHtml(sub.renewalType)}</td>
        <td><button class="action-icon-btn edit" onclick="editSubscription('${sub.id}')"><i class="fas fa-edit"></i> Edit</button></td>
      </tr>
    `;
  }).join('');
}

// Filter schedule table by search
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

// Submit new or update subscription
async function submitSubscription() {
  const id = document.getElementById('subId')?.value || null;
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
    showMessage('Please fill all required fields (Name, Category, Dates, valid Cost)', 'error');
    return;
  }
  
  if (new Date(expiryDate) <= new Date(startDate)) {
    showMessage('Expiry date must be after start date', 'error');
    return;
  }
  
  const subscriptionData = {
    id: id || generateTempId(),
    name, category, vendor, licenseKey, startDate, expiryDate,
    annualCost, renewalType, assignedTo, notes
  };
  
  showLoadingOverlay(true);
  try {
    let result;
    if (window.API && typeof window.API.saveSubscription === 'function') {
      result = await window.API.saveSubscription(subscriptionData);
    } else {
      result = await new Promise((resolve, reject) => {
        google.script.run
          .withSuccessHandler(resolve)
          .withFailureHandler(reject)
          .saveSubscription(subscriptionData);
      });
    }
    
    if (result && result.success !== false) {
      showMessage('Subscription saved successfully!', 'success');
      resetSubscriptionForm();
      await loadAllSubscriptions();
    } else {
      throw new Error(result?.error || 'Save failed');
    }
  } catch (err) {
    console.error(err);
    // Demo mode: update local array
    const existingIndex = subscriptionsList.findIndex(s => s.id === subscriptionData.id);
    if (existingIndex >= 0) subscriptionsList[existingIndex] = subscriptionData;
    else subscriptionsList.push(subscriptionData);
    renderScheduleTable();
    renderExpiringSoonTable();
    showMessage('Saved locally (demo mode).', 'info');
    resetSubscriptionForm();
  } finally {
    showLoadingOverlay(false);
  }
}

function editSubscription(id) {
  const sub = subscriptionsList.find(s => s.id === id);
  if (!sub) return;
  
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
  
  // hidden field for id
  if (!document.getElementById('subId')) {
    const hidden = document.createElement('input');
    hidden.type = 'hidden';
    hidden.id = 'subId';
    document.getElementById('subscriptionForm').appendChild(hidden);
  }
  document.getElementById('subId').value = sub.id;
  
  // Switch to Add tab and scroll
  switchSubTab('addSubscription');
  document.getElementById('subName').focus();
  showMessage('Edit mode: Update the form and save.', 'info');
}

function confirmDeleteSubscription(id) {
  pendingDeleteId = id;
  const confirmMsg = document.getElementById('confirmMessage');
  if (confirmMsg) confirmMsg.innerText = 'Delete this subscription permanently?';
  document.getElementById('subConfirmModal').style.display = 'flex';
  
  const delBtn = document.getElementById('confirmDeleteBtn');
  delBtn.onclick = async () => {
    closeConfirmModal();
    showLoadingOverlay(true);
    try {
      if (window.API && typeof window.API.deleteSubscription === 'function') {
        await window.API.deleteSubscription(pendingDeleteId);
      } else {
        await new Promise((resolve) => {
          google.script.run.withSuccessHandler(resolve).deleteSubscription(pendingDeleteId);
        });
      }
      await loadAllSubscriptions();
      showMessage('Deleted successfully', 'success');
    } catch (err) {
      // local delete
      subscriptionsList = subscriptionsList.filter(s => s.id !== pendingDeleteId);
      renderScheduleTable();
      renderExpiringSoonTable();
      showMessage('Deleted locally (demo)', 'info');
    } finally {
      showLoadingOverlay(false);
      pendingDeleteId = null;
    }
  };
}

function resetSubscriptionForm() {
  const form = document.getElementById('subscriptionForm');
  if (form) form.reset();
  const hiddenId = document.getElementById('subId');
  if (hiddenId) hiddenId.value = '';
  const today = new Date().toISOString().split('T')[0];
  const startField = document.getElementById('startDate');
  if (startField) startField.value = today;
  const nextYear = new Date();
  nextYear.setFullYear(nextYear.getFullYear() + 1);
  const expiryField = document.getElementById('expiryDate');
  if (expiryField) expiryField.value = nextYear.toISOString().split('T')[0];
}

// Helper functions
function calculateDaysLeft(expiryDateStr) {
  const today = new Date();
  today.setHours(0,0,0,0);
  const expiry = new Date(expiryDateStr);
  expiry.setHours(0,0,0,0);
  const diffTime = expiry - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
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

function escapeHtml(str) { if(!str) return ''; return str.replace(/[&<>]/g, function(m){if(m==='&') return '&amp;'; if(m==='<') return '&lt;'; if(m==='>') return '&gt;'; return m;}); }

function showMessage(msg, type) {
  const modal = document.getElementById('subMessageModal');
  const msgText = document.getElementById('modalMessageText');
  const icon = document.getElementById('modalIcon');
  if (!modal) return;
  msgText.innerText = msg;
  icon.className = type === 'success' ? 'fas fa-check-circle' : (type === 'error' ? 'fas fa-times-circle' : 'fas fa-info-circle');
  icon.style.color = type === 'success' ? '#06d6a0' : (type === 'error' ? '#ef476f' : '#4361ee');
  modal.style.display = 'flex';
  setTimeout(() => { if(modal.style.display === 'flex') modal.style.display = 'none'; }, 2500);
}
function closeSubModal() { document.getElementById('subMessageModal').style.display = 'none'; }
function closeConfirmModal() { document.getElementById('subConfirmModal').style.display = 'none'; pendingDeleteId = null; }

function showLoadingOverlay(show) { 
  let overlay = document.getElementById('subLoadingOverlay');
  if(!overlay && show) { overlay = document.createElement('div'); overlay.id = 'subLoadingOverlay'; overlay.className = 'asset-loading-modal'; overlay.innerHTML = '<div class="loading-modal-content"><div class="loading-spinner"></div><p>Loading...</p></div>'; document.body.appendChild(overlay); }
  if(overlay) overlay.style.display = show ? 'flex' : 'none';
}
function switchSubTab(tabId) {
  document.querySelectorAll('.sub-tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.sub-tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(tabId).classList.add('active');
  if(tabId === 'viewSchedules') filterScheduleTable();
  if(tabId === 'expiringSoon') renderExpiringSoonTable();
  const btns = document.querySelectorAll('.sub-tab-btn');
  if(tabId === 'addSubscription') btns[0]?.classList.add('active');
  else if(tabId === 'viewSchedules') btns[1]?.classList.add('active');
  else if(tabId === 'expiringSoon') btns[2]?.classList.add('active');
}
function exportSubscriptionsToCSV() {
  let csvRows = [['Name','Category','Vendor','Start Date','Expiry Date','Annual Cost','Renewal Type']];
  subscriptionsList.forEach(s => { csvRows.push([s.name, s.category, s.vendor, s.startDate, s.expiryDate, s.annualCost, s.renewalType]); });
  const csvContent = csvRows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csvContent], {type: 'text/csv'});
  const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'subscriptions_export.csv'; link.click(); URL.revokeObjectURL(link.href);
}
function generateTempId() { return Date.now().toString() + '-' + Math.random().toString(36).substr(2, 6); }

// Expose globals
window.initSubscriptionModule = initSubscriptionModule;
window.switchSubTab = switchSubTab;
window.submitSubscription = submitSubscription;
window.resetSubscriptionForm = resetSubscriptionForm;
window.editSubscription = editSubscription;
window.confirmDeleteSubscription = confirmDeleteSubscription;
window.filterScheduleTable = filterScheduleTable;
window.exportSubscriptionsToCSV = exportSubscriptionsToCSV;
window.closeSubModal = closeSubModal;
window.closeConfirmModal = closeConfirmModal;
