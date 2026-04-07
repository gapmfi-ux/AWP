/* ============================================
   INVENTORY REPORT MODULE JAVASCRIPT
   Using google.script.run (same pattern as add-asset)
   ============================================ */

// Global variables for inventory module
let inventoryPortalOpen = false;
let currentUsageItem = null;
let allInventoryData = [];

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
// REPORT FUNCTIONS - USING google.script.run
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
      hideLoadingSpinner('purchaseTableBody');
      
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
      hideLoadingSpinner('purchaseTableBody');
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
      hideLoadingSpinner('usageTableBody');
      
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
      hideLoadingSpinner('usageTableBody');
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
      hideLoadingSpinner('inventoryListTableBody');
      
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
      hideLoadingSpinner('inventoryListTableBody');
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

  var rows = '';
  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var cost = parseFloat(row.totalCost) || 0;
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

  var totalRow = `
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

  var rows = '';
  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var usageCost = parseFloat(row.usageCost) || 0;
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

  var totalRow = `
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

  var rows = '';
  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var unitCost = parseFloat(row.unitCost) || 0;
    var quantity = parseInt(row.quantity) || 0;
    var calculatedTotalCost = quantity * unitCost;
    var totalCost = calculatedTotalCost;
    
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

  var totalRow = `
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
  
  var button = event.target.closest('button');
  if (!button) return;
  
  var rect = button.getBoundingClientRect();
  var portal = document.getElementById('inventoryActionPortal');
  
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
  var portal = document.getElementById('inventoryActionPortal');
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
  
  var quantityInput = document.getElementById('quantityUsedInput');
  if (quantityInput) {
    quantityInput.value = '';
    quantityInput.max = quantity;
    // Remove existing listener to avoid duplicates
    quantityInput.removeEventListener('input', calculateUsageCost);
    quantityInput.addEventListener('input', calculateUsageCost);
  }

  document.getElementById('usageCostDisplay').textContent = '0.00';
  document.getElementById('usageModal').style.display = 'flex';
}

function closeUsageModal() {
  var modal = document.getElementById('usageModal');
  if (modal) modal.style.display = 'none';
  
  var input = document.getElementById('quantityUsedInput');
  if (input) {
    input.removeEventListener('input', calculateUsageCost);
  }
  currentUsageItem = null;
}

function calculateUsageCost() {
  if (!currentUsageItem) return;

  var quantityUsed = parseInt(document.getElementById('quantityUsedInput').value) || 0;
  var usageCost = quantityUsed * currentUsageItem.unitCost;
  
  document.getElementById('usageCostDisplay').textContent = formatCurrency(usageCost);
}

function submitUsageRecord() {
  if (!currentUsageItem) return;

  var quantityInput = document.getElementById('quantityUsedInput');
  var quantityUsed = parseInt(quantityInput.value);

  if (!quantityUsed || quantityUsed <= 0) {
    showInventoryMessage('Please enter a valid quantity', 'error');
    return;
  }

  if (quantityUsed > currentUsageItem.quantity) {
    showInventoryMessage('Cannot use more than available quantity (' + currentUsageItem.quantity + ')', 'error');
    return;
  }

  showInventoryLoadingModal('Recording usage...');

  var usageCost = quantityUsed * currentUsageItem.unitCost;

  var formData = {
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
        loadInventoryList(); // Refresh the inventory list
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
  
  if (confirm('Are you sure you want to remove inventory:\n' + inventoryCode + ' - ' + categoryName + '?')) {
    showInventoryLoadingModal('Removing inventory...');
    
    google.script.run
      .withSuccessHandler(function(response) {
        console.log('Remove response:', response);
        hideInventoryLoadingModal();
        if (response && !response.error) {
          showInventoryMessage('Inventory removed successfully!', 'success');
          loadInventoryList(); // Refresh the inventory list
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
  var numValue = parseFloat(value);
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
  var modal = document.getElementById('messageModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'messageModal';
    modal.className = 'inventory-message-modal';
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
  
  // Auto-hide after 3 seconds for non-error messages
  if (type !== 'error') {
    setTimeout(function() {
      var modalElem = document.getElementById('messageModal');
      if (modalElem) modalElem.style.display = 'none';
    }, 3000);
  }
}

function closeInventoryModal() {
  var modal = document.getElementById('messageModal');
  if (modal) modal.style.display = 'none';
}

function showInventoryEmptyState(elementId, message, colspan) {
  var tbody = document.getElementById(elementId);
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
  var tbody = document.getElementById(elementId);
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

function hideLoadingSpinner(elementId) {
  // The spinner will be replaced by actual content in success/failure handlers
  console.log('Loading completed for:', elementId);
}

function showInventoryLoadingModal(message) {
  message = message || 'Processing...';
  var modal = document.getElementById('inventoryLoadingModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'inventoryLoadingModal';
    modal.className = 'inventory-loading-modal';
    document.body.appendChild(modal);
  }
  
  modal.innerHTML = `
    <div class="loading-modal-content">
      <div class="loading-spinner"></div>
      <p>${escapeHtml(message)}</p>
    </div>
  `;
  modal.style.display = 'flex';
}

function hideInventoryLoadingModal() {
  var modal = document.getElementById('inventoryLoadingModal');
  if (modal) modal.style.display = 'none';
}

// ============================================
// PRINT REPORT FUNCTION
// ============================================

function printReport(tableId) {
  // Get the active tab
  var activeTab = document.querySelector('.tab-content.active');
  if (activeTab) {
    var tabId = activeTab.id;
    
    // Get report title
    var reportTitle = '';
    if (tabId === 'purchaseReport') reportTitle = 'INVENTORY PURCHASE REPORT';
    else if (tabId === 'usageReport') reportTitle = 'INVENTORY USAGE REPORT';
    else if (tabId === 'inventoryList') reportTitle = 'INVENTORY LIST REPORT';
    
    // Get date info
    var dateInfo = '';
    if (document.getElementById('purchaseFromDate') && document.getElementById('purchaseFromDate').value) {
      var fromDate = document.getElementById('purchaseFromDate').value;
      var toDate = document.getElementById('purchaseToDate').value;
      if (fromDate && toDate) dateInfo = 'Period: ' + fromDate + ' to ' + toDate;
    } else if (document.getElementById('usageFromDate') && document.getElementById('usageFromDate').value) {
      var fromDate = document.getElementById('usageFromDate').value;
      var toDate = document.getElementById('usageToDate').value;
      if (fromDate && toDate) dateInfo = 'Period: ' + fromDate + ' to ' + toDate;
    } else if (document.getElementById('inventoryToDate') && document.getElementById('inventoryToDate').value) {
      dateInfo = 'As at: ' + document.getElementById('inventoryToDate').value;
    }
    
    // Get the table
    var tableWrapper = document.getElementById(tabId);
    if (!tableWrapper) {
      alert('Report data not found');
      return;
    }
    
    var originalTable = tableWrapper.querySelector('table');
    if (!originalTable) {
      alert('Table not found');
      return;
    }
    
    var tableClone = originalTable.cloneNode(true);
    
    // Remove action column if present
    var headerCells = tableClone.querySelectorAll('thead tr th');
    var lastHeader = headerCells[headerCells.length - 1];
    if (lastHeader && lastHeader.textContent.includes('Action')) {
      var headerRow = tableClone.querySelector('thead tr');
      if (headerRow && headerRow.lastElementChild) {
        headerRow.removeChild(headerRow.lastElementChild);
      }
      var bodyRows = tableClone.querySelectorAll('tbody tr');
      for (var i = 0; i < bodyRows.length; i++) {
        var row = bodyRows[i];
        if (row.lastElementChild && !row.classList.contains('total-row')) {
          row.removeChild(row.lastElementChild);
        }
      }
    }
    
    var dateTime = new Date();
    var printDate = dateTime.toLocaleDateString();
    var printTime = dateTime.toLocaleTimeString();
    
    var printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${reportTitle}</title>
        <meta charset="UTF-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Segoe UI', Arial, sans-serif;
            padding: 15mm;
            font-size: 11px;
            color: #2d3748;
          }
          .print-header {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 2px solid #4361ee;
            padding-bottom: 12px;
          }
          .print-header h1 { font-size: 18px; margin-bottom: 5px; }
          .print-header .date-info { font-size: 10px; color: #6c757d; margin-top: 5px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th {
            background: #f7fafc;
            padding: 8px 6px;
            border: 1px solid #cbd5e0;
            font-size: 10px;
            font-weight: 600;
            text-transform: uppercase;
          }
          td { padding: 6px; border: 1px solid #e2e8f0; font-size: 10px; text-align: center; }
          .total-row { background: #e8f8f3; font-weight: 600; }
          @media print {
            body { padding: 10mm; }
            th, td { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="print-header">
          <h1>${reportTitle}</h1>
          <div class="date-info">${dateInfo}</div>
          <div class="date-info">Printed on: ${printDate} at ${printTime}</div>
        </div>
        ${tableClone.outerHTML}
      </body>
      </html>
    `;

    var printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    setTimeout(function() { printWindow.close(); }, 1000);
  }
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
window.closeInventoryModal = closeInventoryModal;
window.printReport = printReport;
