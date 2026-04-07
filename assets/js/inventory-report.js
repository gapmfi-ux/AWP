/* ============================================
   INVENTORY REPORT MODULE JAVASCRIPT
   Using google.script.run (same pattern as add-asset)
   ============================================ */

// Global variables for inventory module
let inventoryPortalOpen = false;
let currentUsageItem = null;

// ============================================
// INITIALIZATION
// ============================================

function initInventoryReportModule() {
  console.log('Initializing Inventory Report Module');
  
  // Set default dates
  const today = new Date().toISOString().split('T')[0];
  const startOfYear = getStartOfYear();
  
  const purchaseFromDate = document.getElementById('purchaseFromDate');
  const purchaseToDate = document.getElementById('purchaseToDate');
  const usageFromDate = document.getElementById('usageFromDate');
  const usageToDate = document.getElementById('usageToDate');
  const inventoryToDate = document.getElementById('inventoryToDate');

  if (purchaseFromDate) purchaseFromDate.value = startOfYear;
  if (purchaseToDate) purchaseToDate.value = today;
  if (usageFromDate) usageFromDate.value = startOfYear;
  if (usageToDate) usageToDate.value = today;
  if (inventoryToDate) inventoryToDate.value = today;

  // Load initial data
  loadPurchaseReport();
  
  // Close dropdown when clicking outside
  document.addEventListener('click', function(event) {
    if (inventoryPortalOpen) {
      const portal = document.getElementById('inventoryActionPortal');
      if (portal && !portal.contains(event.target) && !event.target.classList.contains('action-btn')) {
        closeInventoryActionDropdown();
      }
    }
  });

  // Close modal when clicking outside
  document.addEventListener('click', function(event) {
    const modal = document.getElementById('usageModal');
    if (modal && event.target === modal) {
      closeUsageModal();
    }
  });
}

function getStartOfYear() {
  const today = new Date();
  const startOfYear = new Date(today.getFullYear(), 0, 1);
  return startOfYear.toISOString().split('T')[0];
}

// ============================================
// TAB SWITCHING
// ============================================

function switchInventoryTab(tabName) {
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
  const purchaseControls = document.getElementById('purchaseControls');
  const usageControls = document.getElementById('usageControls');
  const inventoryControls = document.getElementById('inventoryControls');

  if (purchaseControls) purchaseControls.style.display = 'none';
  if (usageControls) usageControls.style.display = 'none';
  if (inventoryControls) inventoryControls.style.display = 'none';

  if (tabName === 'purchaseReport') {
    if (purchaseControls) purchaseControls.style.display = 'flex';
    loadPurchaseReport();
  } else if (tabName === 'usageReport') {
    if (usageControls) usageControls.style.display = 'flex';
    loadUsageReport();
  } else if (tabName === 'inventoryList') {
    if (inventoryControls) inventoryControls.style.display = 'flex';
    loadInventoryList();
  }
}

// ============================================
// REPORT LOADING FUNCTIONS
// ============================================

function loadPurchaseReport() {
  const fromDateInput = document.getElementById('purchaseFromDate');
  const toDateInput = document.getElementById('purchaseToDate');
  
  if (!fromDateInput || !toDateInput) {
    console.error('Date input elements not found');
    return;
  }

  const fromDate = fromDateInput.value;
  const toDate = toDateInput.value;

  if (!fromDate || !toDate) {
    showInventoryEmptyState('purchaseTableBody', 'Please select date range', 7);
    return;
  }

  console.log('Loading purchase report - From:', fromDate, 'To:', toDate);
  showInventoryLoadingSpinner('purchaseTableBody', 7);
  
  google.script.run
    .withSuccessHandler(function(response) {
      console.log('Purchase report response:', response);
      
      if (response && response.error) {
        console.error('Error in response:', response.error);
        showInventoryEmptyState('purchaseTableBody', 'Error: ' + response.error, 7);
        return;
      }
      
      let reportData = [];
      if (Array.isArray(response)) {
        reportData = response;
      } else if (response && response.data && Array.isArray(response.data)) {
        reportData = response.data;
      } else if (response && typeof response === 'object') {
        reportData = Object.values(response).filter(Array.isArray)[0] || [];
      }
      
      if (reportData.length === 0) {
        showInventoryEmptyState('purchaseTableBody', 'No purchase records found for selected period', 7);
      } else {
        renderPurchaseReportTable(reportData);
      }
    })
    .withFailureHandler(function(error) {
      console.error('Error loading purchase report:', error);
      showInventoryEmptyState('purchaseTableBody', 'Error loading purchase report: ' + (error.message || error), 7);
    })
    .getPurchaseReportData(fromDate, toDate);
}

function loadUsageReport() {
  const fromDateInput = document.getElementById('usageFromDate');
  const toDateInput = document.getElementById('usageToDate');
  
  if (!fromDateInput || !toDateInput) return;

  const fromDate = fromDateInput.value;
  const toDate = toDateInput.value;

  if (!fromDate || !toDate) {
    showInventoryEmptyState('usageTableBody', 'Please select date range', 7);
    return;
  }

  console.log('Loading usage report - From:', fromDate, 'To:', toDate);
  showInventoryLoadingSpinner('usageTableBody', 7);
  
  google.script.run
    .withSuccessHandler(function(response) {
      console.log('Usage report response:', response);
      
      if (response && response.error) {
        showInventoryEmptyState('usageTableBody', 'Error: ' + response.error, 7);
        return;
      }
      
      let reportData = [];
      if (Array.isArray(response)) {
        reportData = response;
      } else if (response && response.data && Array.isArray(response.data)) {
        reportData = response.data;
      } else if (response && typeof response === 'object') {
        reportData = Object.values(response).filter(Array.isArray)[0] || [];
      }
      
      if (reportData.length === 0) {
        showInventoryEmptyState('usageTableBody', 'No usage records found for selected period', 7);
      } else {
        renderUsageReportTable(reportData);
      }
    })
    .withFailureHandler(function(error) {
      console.error('Error loading usage report:', error);
      showInventoryEmptyState('usageTableBody', 'Error loading usage report: ' + (error.message || error), 7);
    })
    .getUsageReportData(fromDate, toDate);
}

function loadInventoryList() {
  console.log('Loading inventory list');
  showInventoryLoadingSpinner('inventoryListTableBody', 7);
  
  google.script.run
    .withSuccessHandler(function(response) {
      console.log('Inventory list response:', response);
      
      if (response && response.error) {
        showInventoryEmptyState('inventoryListTableBody', 'Error: ' + response.error, 7);
        return;
      }
      
      let listData = [];
      if (Array.isArray(response)) {
        listData = response;
      } else if (response && response.data && Array.isArray(response.data)) {
        listData = response.data;
      } else if (response && typeof response === 'object') {
        listData = Object.values(response).filter(Array.isArray)[0] || [];
      }
      
      if (listData.length === 0) {
        showInventoryEmptyState('inventoryListTableBody', 'No inventory items found', 7);
      } else {
        renderInventoryListTable(listData);
      }
    })
    .withFailureHandler(function(error) {
      console.error('Error loading inventory list:', error);
      showInventoryEmptyState('inventoryListTableBody', 'Error loading inventory list: ' + (error.message || error), 7);
    })
    .getInventoryListData();
}

// ============================================
// RENDER FUNCTIONS
// ============================================

function renderPurchaseReportTable(data) {
  const tbody = document.getElementById('purchaseTableBody');
  if (!tbody) return;
  
  if (!data || data.length === 0) {
    showInventoryEmptyState('purchaseTableBody', 'No purchase records found', 7);
    return;
  }

  let totalCost = 0;
  let rows = '';

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const cost = parseFloat(row.totalCost) || 0;
    totalCost += cost;

    rows += `
      <tr>
        <td>${escapeHtml(row.inventoryCode || '')}</td>
        <td>${escapeHtml(row.categoryName || '')}</td>
        <td>${escapeHtml(row.description || '')}</td>
        <td>${formatCurrency(cost)}</td>
        <td>${row.quantity || 0}</td>
        <td>${formatCurrency(row.unitCost)}</td>
        <td>${row.date || ''}</td>
      </tr>
    `;
  }

  const totalRow = `
    <tr class="total-row">
      <td colspan="3" style="text-align: right; font-weight: 700;">Total Cost:</td>
      <td class="total-cell">${formatCurrency(totalCost)}</td>
      <td colspan="3"></td>
    </tr>
  `;

  tbody.innerHTML = rows + totalRow;
}

function renderUsageReportTable(data) {
  const tbody = document.getElementById('usageTableBody');
  if (!tbody) return;
  
  if (!data || data.length === 0) {
    showInventoryEmptyState('usageTableBody', 'No usage records found', 7);
    return;
  }

  let totalUsageCost = 0;
  let rows = '';

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const usageCost = parseFloat(row.usageCost) || 0;
    totalUsageCost += usageCost;
    
    rows += `
      <tr>
        <td>${escapeHtml(row.inventoryCode || '')}</td>
        <td>${escapeHtml(row.categoryName || '')}</td>
        <td>${escapeHtml(row.description || '')}</td>
        <td>${row.quantityUsed || 0}</td>
        <td>${formatCurrency(row.unitCost)}</td>
        <td>${formatCurrency(usageCost)}</td>
        <td>${row.date || ''}</td>
      </tr>
    `;
  }

  const totalRow = `
    <tr class="total-row">
      <td colspan="5" style="text-align: right; font-weight: 700;">Total Usage Cost:</td>
      <td class="total-cell">${formatCurrency(totalUsageCost)}</td>
      <td></td>
    </tr>
  `;

  tbody.innerHTML = rows + totalRow;
}

function renderInventoryListTable(data) {
  const tbody = document.getElementById('inventoryListTableBody');
  if (!tbody) return;
  
  if (!data || data.length === 0) {
    showInventoryEmptyState('inventoryListTableBody', 'No inventory items found', 7);
    return;
  }

  let totalInventoryCost = 0;
  let rows = '';

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const unitCost = parseFloat(row.unitCost) || 0;
    const quantity = parseInt(row.quantity) || 0;
    const totalCost = quantity * unitCost;
    
    totalInventoryCost += totalCost;
    
    rows += `
      <tr>
        <td>${escapeHtml(row.inventoryCode || '')}</td>
        <td>${escapeHtml(row.categoryName || '')}</td>
        <td>${escapeHtml(row.description || '')}</td>
        <td>${quantity}</td>
        <td>${formatCurrency(unitCost)}</td>
        <td>${formatCurrency(totalCost)}</td>
        <td>
          <button class="action-btn" onclick="openInventoryActionDropdown(event, '${escapeHtml(row.inventoryCode)}', '${escapeHtml(row.categoryName)}', '${escapeHtml(row.description || '')}', '${quantity}', '${unitCost}')">
            <i class="fas fa-ellipsis-v"></i> Action
          </button>
        </td>
      </tr>
    `;
  }

  const totalRow = `
    <tr class="total-row">
      <td colspan="5" style="text-align: right; font-weight: 700;">Total Inventory Cost:</td>
      <td class="total-cell">${formatCurrency(totalInventoryCost)}</td>
      <td></td>
    </tr>
  `;

  tbody.innerHTML = rows + totalRow;
}

// ============================================
// ACTION DROPDOWN
// ============================================

function openInventoryActionDropdown(event, inventoryCode, categoryName, description, quantity, unitCost) {
  closeInventoryActionDropdown();
  
  const button = event.target.closest('button');
  if (!button) return;
  
  const rect = button.getBoundingClientRect();
  const portal = document.getElementById('inventoryActionPortal');
  
  if (!portal) return;
  
  portal.innerHTML = `
    <div class="action-dropdown-content">
      <button class="dropdown-item" onclick="openUsageModal('${escapeHtml(inventoryCode)}', '${escapeHtml(categoryName)}', '${escapeHtml(description)}', '${quantity}', '${unitCost}')">
        <i class="fas fa-box-open"></i> Record Usage
      </button>
      <button class="dropdown-item" onclick="removeInventoryItem('${escapeHtml(inventoryCode)}', '${escapeHtml(categoryName)}')">
        <i class="fas fa-trash-alt"></i> Remove
      </button>
    </div>
  `;
  
  portal.style.display = 'block';
  portal.style.position = 'fixed';
  portal.style.top = (rect.bottom + window.scrollY) + 'px';
  portal.style.left = (rect.left + window.scrollX) + 'px';
  
  inventoryPortalOpen = true;
  event.stopPropagation();
}

function closeInventoryActionDropdown() {
  const portal = document.getElementById('inventoryActionPortal');
  if (portal) {
    portal.innerHTML = '';
    portal.style.display = 'none';
  }
  inventoryPortalOpen = false;
}

// ============================================
// USAGE MODAL
// ============================================

function openUsageModal(inventoryCode, categoryName, description, quantity, unitCost) {
  closeInventoryActionDropdown();
  
  currentUsageItem = {
    code: inventoryCode,
    name: categoryName,
    description: description,
    quantity: parseInt(quantity),
    unitCost: parseFloat(unitCost)
  };

  document.getElementById('usageItemCode').textContent = inventoryCode;
  document.getElementById('usageItemName').textContent = categoryName;
  document.getElementById('usageItemDescription').textContent = description || 'N/A';
  document.getElementById('usageItemQuantity').textContent = quantity;
  document.getElementById('usageItemUnitCost').textContent = formatCurrency(unitCost);
  document.getElementById('usageCostUnitPrice').textContent = formatCurrency(unitCost);
  
  const quantityInput = document.getElementById('quantityUsedInput');
  if (quantityInput) {
    quantityInput.value = '';
    quantityInput.max = quantity;
    quantityInput.removeEventListener('input', calculateUsageCost);
    quantityInput.addEventListener('input', calculateUsageCost);
  }

  document.getElementById('usageCostDisplay').textContent = '0.00';
  document.getElementById('usageModal').style.display = 'flex';
}

function closeUsageModal() {
  const modal = document.getElementById('usageModal');
  if (modal) modal.style.display = 'none';
  
  const input = document.getElementById('quantityUsedInput');
  if (input) {
    input.removeEventListener('input', calculateUsageCost);
  }
  currentUsageItem = null;
}

function calculateUsageCost() {
  if (!currentUsageItem) return;

  const quantityUsed = parseInt(document.getElementById('quantityUsedInput').value) || 0;
  const usageCost = quantityUsed * currentUsageItem.unitCost;
  
  document.getElementById('usageCostDisplay').textContent = formatCurrency(usageCost);
}

function submitUsageRecord() {
  if (!currentUsageItem) return;

  const quantityInput = document.getElementById('quantityUsedInput');
  const quantityUsed = parseInt(quantityInput.value);

  if (!quantityUsed || quantityUsed <= 0) {
    showInventoryMessage('Please enter a valid quantity', 'error');
    return;
  }

  if (quantityUsed > currentUsageItem.quantity) {
    showInventoryMessage(`Cannot use more than available quantity (${currentUsageItem.quantity})`, 'error');
    return;
  }

  showInventoryLoadingModal('Recording usage...');

  const usageCost = quantityUsed * currentUsageItem.unitCost;

  const formData = {
    inventoryCode: currentUsageItem.code,
    categoryName: currentUsageItem.name,
    description: currentUsageItem.description,
    quantityUsed: quantityUsed,
    unitCost: currentUsageItem.unitCost,
    usageCost: usageCost,
    dateUsed: new Date().toISOString().split('T')[0]
  };

  console.log('Recording usage:', formData);

  google.script.run
    .withSuccessHandler(function(response) {
      console.log('Usage recorded:', response);
      hideInventoryLoadingModal();
      if (response && !response.error) {
        closeUsageModal();
        showInventoryMessage('Usage recorded successfully!', 'success');
        loadInventoryList();
      } else {
        showInventoryMessage('Error recording usage: ' + (response?.error || 'Unknown error'), 'error');
      }
    })
    .withFailureHandler(function(error) {
      console.error('Error recording usage:', error);
      hideInventoryLoadingModal();
      showInventoryMessage('Error recording usage: ' + (error.message || error), 'error');
    })
    .recordInventoryUsage({ formData: JSON.stringify(formData) });
}

// ============================================
// REMOVE INVENTORY
// ============================================

function removeInventoryItem(inventoryCode, categoryName) {
  closeInventoryActionDropdown();
  
  if (confirm(`Are you sure you want to remove inventory:\n${inventoryCode} - ${categoryName}?`)) {
    showInventoryLoadingModal('Removing inventory...');
    
    google.script.run
      .withSuccessHandler(function(response) {
        console.log('Remove response:', response);
        hideInventoryLoadingModal();
        if (response && !response.error) {
          showInventoryMessage('Inventory removed successfully!', 'success');
          loadInventoryList();
        } else {
          showInventoryMessage('Error removing inventory: ' + (response?.error || 'Unknown error'), 'error');
        }
      })
      .withFailureHandler(function(error) {
        console.error('Error removing inventory:', error);
        hideInventoryLoadingModal();
        showInventoryMessage('Error removing inventory: ' + (error.message || error), 'error');
      })
      .removeInventory(inventoryCode);
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function formatCurrency(value) {
  if (value === null || value === undefined || value === '' || isNaN(value)) return '0.00';
  const numValue = parseFloat(value);
  if (isNaN(numValue)) return '0.00';
  return numValue.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
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

function showInventoryMessage(message, type) {
  // Check if printUtils has a message function
  if (window.printUtils && printUtils.showMessage) {
    printUtils.showMessage(message, type);
    return;
  }
  
  // Fallback to simple alert if printUtils not available
  if (type === 'error') {
    alert('Error: ' + message);
  } else {
    alert(message);
  }
}

function showInventoryEmptyState(elementId, message, colspan) {
  const tbody = document.getElementById(elementId);
  if (!tbody) return;
  
  tbody.innerHTML = `
    <tr>
      <td colspan="${colspan}" class="empty-state">
        <i class="fas fa-folder-open"></i>
        <p>${escapeHtml(message)}</p>
       </td>
    </tr>
  `;
}

function showInventoryLoadingSpinner(elementId, colspan) {
  const tbody = document.getElementById(elementId);
  if (!tbody) return;
  
  tbody.innerHTML = `
    <tr>
      <td colspan="${colspan}" class="loading-cell">
        <div class="table-loader">
          <div class="spinner-small"></div>
          <span>Loading...</span>
        </div>
       </td>
    </tr>
  `;
}

function showInventoryLoadingModal(message) {
  // Use printUtils loading modal if available
  if (window.printUtils && printUtils.showLoading) {
    printUtils.showLoading(message);
    return;
  }
  
  // Fallback - create simple loading indicator
  let modal = document.getElementById('inventoryLoadingModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'inventoryLoadingModal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.7);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 1001;
    `;
    document.body.appendChild(modal);
  }
  
  modal.innerHTML = `
    <div style="background: white; padding: 30px 40px; border-radius: 12px; text-align: center;">
      <div style="width: 40px; height: 40px; border: 3px solid #e2e8f0; border-top: 3px solid #4361ee; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 15px auto;"></div>
      <p style="margin: 0; color: #2d3748;">${escapeHtml(message || 'Processing...')}</p>
    </div>
  `;
  modal.style.display = 'flex';
  
  // Add keyframe animation if not exists
  if (!document.querySelector('#loading-spinner-style')) {
    const style = document.createElement('style');
    style.id = 'loading-spinner-style';
    style.textContent = '@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }';
    document.head.appendChild(style);
  }
}

function hideInventoryLoadingModal() {
  const modal = document.getElementById('inventoryLoadingModal');
  if (modal) modal.style.display = 'none';
}

// ============================================
// EXPORT FUNCTIONS FOR GLOBAL USE
// ============================================

window.initInventoryReportModule = initInventoryReportModule;
window.switchInventoryTab = switchInventoryTab;
window.loadPurchaseReport = loadPurchaseReport;
window.loadUsageReport = loadUsageReport;
window.loadInventoryList = loadInventoryList;
window.openInventoryActionDropdown = openInventoryActionDropdown;
window.openUsageModal = openUsageModal;
window.closeUsageModal = closeUsageModal;
window.submitUsageRecord = submitUsageRecord;
window.removeInventoryItem = removeInventoryItem;
