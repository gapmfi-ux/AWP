

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
      
      // Clear existing options except the first two (placeholder and add-new)
      while (select.options.length > 2) {
        select.remove(2);
      }
      
      // Handle response - could be array or object with data property
      let categories = [];
      if (response && Array.isArray(response)) {
        categories = response;
      } else if (response && response.data && Array.isArray(response.data)) {
        categories = response.data;
      } else if (response && response.categories && Array.isArray(response.categories)) {
        categories = response.categories;
      }
      
      if (categories.length > 0) {
        categories.forEach(function(cat) {
          const option = document.createElement('option');
          option.value = cat.code || cat;
          option.textContent = (cat.name || cat) + (cat.code ? ' (' + cat.code + ')' : '');
          select.appendChild(option);
        });
        console.log('Loaded ' + categories.length + ' categories');
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
  const codeDisplay = document.getElementById('generatedCodeDisplay');
  
  if (select.value === 'add-new') {
    if (addNewFields) addNewFields.style.display = 'block';
    generateCategoryCode();
  } else if (select.value && select.value !== 'add-new' && select.value !== '') {
    if (addNewFields) addNewFields.style.display = 'none';
    generateLicenseCode();
  } else {
    if (addNewFields) addNewFields.style.display = 'none';
    if (licenseCodeField) licenseCodeField.value = '';
    if (codeDisplay) codeDisplay.innerHTML = '<span class="code-placeholder">-</span>';
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
        // Handle different response formats
        let mainCode = response;
        if (response.result) mainCode = response.result;
        if (response.code) mainCode = response.code;
        
        mainCode = String(mainCode).trim();
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
    const codeDisplay = document.getElementById('generatedCodeDisplay');
    if (codeDisplay) codeDisplay.innerHTML = '<span style="font-family: \'Courier New\', monospace; letter-spacing: 2px; color: #4361ee;">' + code + '</span>';
    return;
  }
  
  API.getNextSubscriptionCode(selectedCategory)
    .then(function(response) {
      console.log('Next subscription code:', response);
      const codeField = document.getElementById('licenseCode');
      const codeDisplay = document.getElementById('generatedCodeDisplay');
      if (response && codeField) {
        let nextCode = response;
        if (response.result) nextCode = response.result;
        if (response.code) nextCode = response.code;
        
        const code = String(nextCode).trim();
        codeField.value = code;
        if (codeDisplay) {
          codeDisplay.innerHTML = '<span style="font-family: \'Courier New\', monospace; letter-spacing: 2px; color: #4361ee;">' + code + '</span>';
        }
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
      const codeDisplay = document.getElementById('generatedCodeDisplay');
      if (codeDisplay) codeDisplay.innerHTML = '<span style="font-family: \'Courier New\', monospace; letter-spacing: 2px; color: #4361ee;">' + code + '</span>';
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
  
  // Get existing subscriptions from storage
  let subscriptionsList = getSubscriptionsList();
  
  // If using API, save to backend
  if (typeof API !== 'undefined' && API) {
    showToast('Saving subscription...', 'info');
    
    API.addSubscription(subscriptionData)
      .then(function(response) {
        console.log('Subscription saved:', response);
        if (response && (response.success === true || response.result === 'success')) {
          subscriptionsList.push(subscriptionData);
          saveSubscriptionsToStorage(subscriptionsList);
          showToast('Subscription saved successfully!', 'success');
          resetSubscriptionForm();
          // Refresh the schedule module if it exists
          if (typeof refreshSubscriptionSchedule === 'function') {
            refreshSubscriptionSchedule();
          }
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
    saveSubscriptionsToStorage(subscriptionsList);
    showToast('Subscription saved successfully!', 'success');
    resetSubscriptionForm();
    // Refresh the schedule module if it exists
    if (typeof refreshSubscriptionSchedule === 'function') {
      refreshSubscriptionSchedule();
    }
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
// UTILITY FUNCTIONS
// ============================================

function getSubscriptionsList() {
  const stored = localStorage.getItem('subscriptions_list');
  return stored ? JSON.parse(stored) : [];
}

function saveSubscriptionsToStorage(subscriptionsList) {
  localStorage.setItem('subscriptions_list', JSON.stringify(subscriptionsList));
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

// Expose global functions for add module
window.initSubscriptionAddModule = initSubscriptionAddModule;
window.submitSubscription = submitSubscription;
window.resetSubscriptionForm = resetSubscriptionForm;
window.handleCategoryChange = handleCategoryChange;
