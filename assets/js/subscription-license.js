let subscriptionsList = [];
let currentRenewId = null;
let currentFilter = { fromDate: '', toDate: '' };

// ============================================
// CATEGORY MANAGEMENT (Like Inventory)
// ============================================

function loadSubscriptionCategories() {
  console.log('Loading subscription categories via API');
  
  if (typeof API === 'undefined' || !API) {
    console.error('API not available, using default categories');
    loadDefaultCategories();
    return;
  }
  
  API.getSubscriptionCategories()
    .then(function(response) {
      console.log('Categories response:', response);
      const select = document.getElementById('subCategory');
      if (!select) return;
      
      // Clear existing options except the first one
      while (select.options.length > 2) {
        select.remove(2);
      }
      
      if (response && Array.isArray(response) && response.length > 0) {
        response.forEach(function(cat) {
          const option = document.createElement('option');
          option.value = cat.code;
          option.textContent = cat.name + ' (' + cat.code + ')';
          select.appendChild(option);
        });
        console.log('Loaded ' + response.length + ' categories');
      } else {
        // Fallback to default categories
        loadDefaultCategories();
      }
    })
    .catch(function(error) {
      console.error('Error loading categories:', error);
      loadDefaultCategories();
    });
}

function loadDefaultCategories() {
  const categorySelect = document.getElementById('subCategory');
  if (categorySelect) {
    const defaultCategories = [
      'Software License',
      'SaaS Subscription', 
      'Domain Renewal',
      'SSL Certificate',
      'Maintenance Contract',
      'Cloud Service',
      'Other'
    ];
    
    categorySelect.innerHTML = '<option value="">Select Category</option><option value="add-new">+ Add New Category</option>';
    defaultCategories.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat;
      option.textContent = cat;
      categorySelect.appendChild(option);
    });
  }
}

function handleCategoryChange() {
  const select = document.getElementById('subCategory');
  const addNewFields = document.getElementById('addNewCategoryFields');
  const licenseCodeField = document.getElementById('licenseCode');
  
  if (select.value === 'add-new') {
    if (addNewFields) addNewFields.style.display = 'block';
    generateCategoryCode();
  } else if (select.value && select.value !== 'add-new' && select.value !== '') {
    if (addNewFields) addNewFields.style.display = 'none';
    generateLicenseCode();
  } else {
    if (addNewFields) addNewFields.style.display = 'none';
    if (licenseCodeField) licenseCodeField.value = '';
  }
}

function generateCategoryCode() {
  console.log('Generating subscription category code via API');
  
  if (typeof API === 'undefined' || !API) {
    console.error('API not available');
    showToast('API not available', 'error');
    return;
  }
  
  showToast('Generating code...', 'info');
  
  API.generateSubscriptionCategoryCode()
    .then(function(response) {
      console.log('Category code response:', response);
      
      const field = document.getElementById('categoryCode');
      const codeDisplay = document.getElementById('generatedCodeDisplay');
      
      if (response) {
        const mainCode = String(response).trim();
        if (field) field.value = mainCode;
        
        // Display the generated code with 001 suffix (new code, so always 001)
        const licenseCode = mainCode + '001';
        if (codeDisplay) {
          codeDisplay.innerHTML = '<span style="font-family: \'Courier New\', monospace; letter-spacing: 2px; color: #4361ee;">' + licenseCode + '</span>';
        }
        if (document.getElementById('licenseCode')) {
          document.getElementById('licenseCode').value = licenseCode;
        }
      } else {
        console.error('No response for category code');
        showToast('Error generating category code', 'error');
      }
    })
    .catch(function(error) {
      console.error('Error generating category code:', error);
      showToast('Error generating category code: ' + (error.message || error), 'error');
    });
}

function generateLicenseCode() {
  const categorySelect = document.getElementById('subCategory');
  const selectedCategory = categorySelect.value;
  
  if (!selectedCategory || selectedCategory === '' || selectedCategory === 'add-new') {
    return;
  }
  
  console.log('Generating license code for category:', selectedCategory);
  
  if (typeof API === 'undefined' || !API) {
    // Fallback: generate local code
    const prefix = selectedCategory.substring(0, 3).toUpperCase();
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const code = `${prefix}-${year}-${random}`;
    document.getElementById('licenseCode').value = code;
    return;
  }
  
  API.getNextSubscriptionCode(selectedCategory)
    .then(function(response) {
      console.log('Next subscription code:', response);
      const codeField = document.getElementById('licenseCode');
      if (response && codeField) {
        let nextCode = response;
        if (typeof response === 'object' && response.result) {
          nextCode = response.result;
        }
        codeField.value = String(nextCode).trim();
      }
    })
    .catch(function(error) {
      console.error('Error generating license code:', error);
      // Fallback
      const prefix = selectedCategory.substring(0, 3).toUpperCase();
      const year = new Date().getFullYear();
      const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      const code = `${prefix}-${year}-${random}`;
      document.getElementById('licenseCode').value = code;
    });
}

// ============================================
// ADD NEW MODULE INITIALIZATION
// ============================================

function initSubscriptionAddModule() {
  console.log('Initializing Subscription Add Module');
  
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
  
  // Load categories from API or default
  loadSubscriptionCategories();
  
  // Hide add-new category fields initially
  const addNewFields = document.getElementById('addNewCategoryFields');
  if (addNewFields) addNewFields.style.display = 'none';
  
  loadSubscriptionsFromStorage();
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
  const categorySelect = document.getElementById('subCategory');
  const categoryValue = categorySelect.value;
  
  let category, categoryCode, categoryDescription;
  
  // Handle add-new category
  if (categoryValue === 'add-new') {
    category = document.getElementById('categoryName').value;
    categoryCode = document.getElementById('categoryCode').value;
    categoryDescription = document.getElementById('categoryDescription').value;
    
    if (!category || !categoryCode) {
      showToast('Please fill in all category fields', 'error');
      return;
    }
  } else if (categoryValue && categoryValue !== '') {
    category = categoryValue;
    categoryCode = categoryValue;
    categoryDescription = '';
  } else {
    showToast('Please select a category', 'error');
    return;
  }
  
  const name = document.getElementById('subName').value.trim();
  const vendor = document.getElementById('vendor').value;
  const licenseCode = document.getElementById('licenseCode').value;
  const startDate = document.getElementById('startDate').value;
  const expiryDate = document.getElementById('expiryDate').value;
  const annualCost = parseFloat(document.getElementById('annualCost').value);
  const paymentMode = document.getElementById('paymentMode').value;
  
  if (!name || !startDate || !expiryDate || isNaN(annualCost) || annualCost <= 0) {
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
    name: name,
    category: category,
    categoryCode: categoryCode,
    categoryDescription: categoryDescription,
    vendor: vendor,
    startDate: startDate,
    expiryDate: expiryDate,
    annualCost: annualCost,
    paymentMode: paymentMode
  };
  
  // If using API, save to backend
  if (typeof API !== 'undefined' && API) {
    showToast('Saving subscription...', 'info');
    
    API.addSubscription(subscriptionData)
      .then(function(response) {
        console.log('Subscription saved:', response);
        if (response && response.success) {
          subscriptionsList.push(subscriptionData);
          saveSubscriptionsToStorage();
          showToast('Subscription saved successfully!', 'success');
          resetSubscriptionForm();
        } else {
          showToast('Error: ' + (response?.error || 'Unknown error'), 'error');
        }
      })
      .catch(function(error) {
        console.error('Error saving subscription:', error);
        showToast('Error saving subscription: ' + (error.message || error), 'error');
      });
  } else {
    // Local storage fallback
    subscriptionsList.push(subscriptionData);
    saveSubscriptionsToStorage();
    showToast('Subscription saved successfully!', 'success');
    resetSubscriptionForm();
  }
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
  
  // Hide add-new category fields
  const addNewFields = document.getElementById('addNewCategoryFields');
  if (addNewFields) addNewFields.style.display = 'none';
  
  // Clear category selection
  const categorySelect = document.getElementById('subCategory');
  if (categorySelect) categorySelect.value = '';
  
  // Clear license code
  const codeField = document.getElementById('licenseCode');
  if (codeField) codeField.value = '';
  
  // Clear code display
  const codeDisplay = document.getElementById('generatedCodeDisplay');
  if (codeDisplay) codeDisplay.innerHTML = '<span class="code-placeholder">-</span>';
  
  // Reload categories
  loadSubscriptionCategories();
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
    container.innerHTML = '<div class="table-wrapper"><table class="subscription-table"><tbody><tr><td colspan="9" class="loading-cell">No subscriptions found</td></tr></tbody></table></div>';
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

function renderPrepaidTable() {
  const tbody = document.getElementById('prepaidTableBody');
  if (!tbody) return;
  
  let prepaidList = subscriptionsList.filter(sub => 
    sub.paymentMode === 'Prepaid' && isWithinDateRange(sub.expiryDate)
  );
  
  if (!prepaidList.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="loading-cell">No prepaid subscriptions</td></tr>';
    return;
  }
  
  tbody.innerHTML = prepaidList.map(sub => {
    const monthlyCharge = sub.annualCost / 12;
    const daysLeft = calculateDaysLeft(sub.expiryDate);
    const monthsLeft = Math.max(0, daysLeft / 30.44);
    const remainingAmount = monthlyCharge * monthsLeft;
    
    return `
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
  }).join('');
}

function renderArrearsTable() {
  const tbody = document.getElementById('arrearsTableBody');
  if (!tbody) return;
  
  let arrearsList = subscriptionsList.filter(sub => 
    sub.paymentMode === 'In Arrears' && isWithinDateRange(sub.expiryDate)
  );
  
  if (!arrearsList.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="loading-cell">No in-arrears subscriptions</td></tr>';
    return;
  }
  
  tbody.innerHTML = arrearsList.map(sub => {
    const daysLeft = calculateDaysLeft(sub.expiryDate);
    const totalMonths = 12;
    const elapsedMonths = Math.max(0, totalMonths - Math.max(0, daysLeft / 30.44));
    const monthlyCharge = sub.annualCost / 12;
    const amountPaid = monthlyCharge * elapsedMonths;
    const remainingAmount = sub.annualCost - amountPaid;
    
    return `
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
  
  printContent.querySelectorAll('.renew-btn, .export-btn, .print-btn, .search-box, .header-actions, .filter-btn, .clear-btn, .schedule-tab-btn').forEach(el => {
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
          .text-danger { color: #dc2626; }
          .text-warning { color: #d97706; }
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
  let csvRows = [['Code', 'Name', 'Category', 'Vendor', 'Start Date', 'Expiry Date', 'Annual Cost', 'Payment Mode']];
  subscriptionsList.forEach(s => {
    csvRows.push([s.code, s.name, s.category, s.vendor || '', s.startDate, s.expiryDate, s.annualCost, s.paymentMode]);
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
window.handleCategoryChange = handleCategoryChange;
