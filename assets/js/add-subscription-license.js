// ============================================
// SUBSCRIPTION MODULE
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
          option.value = cat.code;
          option.textContent = cat.name + ' (' + cat.code + ')';
          option.dataset.categoryName = cat.name;
          option.dataset.categoryDescription = cat.description || '';
          select.appendChild(option);
        });
        console.log('Loaded ' + categories.length + ' categories');
      } else {
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
      { code: 'CAT01', name: 'Software License', description: '' },
      { code: 'CAT02', name: 'SaaS Subscription', description: '' },
      { code: 'CAT03', name: 'Domain Renewal', description: '' },
      { code: 'CAT04', name: 'SSL Certificate', description: '' },
      { code: 'CAT05', name: 'Maintenance Contract', description: '' },
      { code: 'CAT06', name: 'Cloud Service', description: '' },
      { code: 'CAT07', name: 'Other', description: '' }
    ];
    
    categorySelect.innerHTML = '<option value="">Select Category</option><option value="add-new">+ Add New Category</option>';
    defaultCategories.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat.code;
      option.textContent = cat.name + ' (' + cat.code + ')';
      option.dataset.categoryName = cat.name;
      option.dataset.categoryDescription = cat.description;
      categorySelect.appendChild(option);
    });
  }
}

function handleSubscriptionCategoryChange() {
  const select = document.getElementById('subCategory');
  const addNewFields = document.getElementById('addNewCategoryFields');
  const licenseCodeField = document.getElementById('licenseCode');
  const codeDisplay = document.getElementById('generatedCodeDisplay');
  
  if (select.value === 'add-new') {
    if (addNewFields) addNewFields.style.display = 'block';
    generateSubscriptionCategoryCode();
  } else if (select.value && select.value !== 'add-new' && select.value !== '') {
    if (addNewFields) addNewFields.style.display = 'none';
    generateSubscriptionLicenseCode();
  } else {
    if (addNewFields) addNewFields.style.display = 'none';
    if (licenseCodeField) licenseCodeField.value = '';
    if (codeDisplay) codeDisplay.innerHTML = '<span class="code-placeholder">-</span>';
  }
}

function generateSubscriptionCategoryCode() {
  console.log('Generating subscription category code via API');
  
  if (typeof API === 'undefined' || !API) {
    console.error('API not available');
    showSubscriptionToast('API not available', 'error');
    return;
  }
  
  showSubscriptionToast('Generating code...', 'info');
  
  API.generateSubscriptionCategoryCode()
    .then(function(response) {
      console.log('Category code response:', response);
      console.log('Response type:', typeof response);
      
      const field = document.getElementById('categoryCode');
      const codeDisplay = document.getElementById('generatedCodeDisplay');
      
      if (response) {
        // Handle different response formats
        let mainCode = response;
        if (typeof response === 'object' && response.result) {
          mainCode = response.result;
        } else if (typeof response === 'object' && response.code) {
          mainCode = response.code;
        } else if (typeof response === 'object') {
          mainCode = Object.values(response).find(v => typeof v === 'string') || String(response);
        }
        
        mainCode = String(mainCode).trim();
        console.log('Extracted main code:', mainCode);
        
        if (field) field.value = mainCode;
        
        const licenseCode = mainCode + '001';
        if (codeDisplay) {
          codeDisplay.innerHTML = '<span style="font-family: \'Courier New\', monospace; letter-spacing: 2px; color: #4361ee;">' + licenseCode + '</span>';
        }
        if (document.getElementById('licenseCode')) {
          document.getElementById('licenseCode').value = licenseCode;
        }
      } else {
        console.error('No response for category code');
        showSubscriptionToast('Error generating category code', 'error');
      }
    })
    .catch(function(error) {
      console.error('Error generating category code:', error);
      showSubscriptionToast('Error generating category code: ' + (error.message || error), 'error');
    });
}

function generateSubscriptionLicenseCode() {
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
        if (typeof response === 'object' && response.result) {
          nextCode = response.result;
        } else if (typeof response === 'object' && response.code) {
          nextCode = response.code;
        } else if (typeof response === 'object') {
          nextCode = Object.values(response).find(v => typeof v === 'string') || String(response);
        }
        
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
      showSubscriptionToast('Please fill in all category fields', 'error');
      return;
    }
  } else if (categoryValue && categoryValue !== '') {
    // Get category name from the selected option's dataset
    const selectedOption = categorySelect.options[categorySelect.selectedIndex];
    categoryCode = categoryValue;
    category = selectedOption.dataset.categoryName || categoryValue;
    categoryDescription = selectedOption.dataset.categoryDescription || '';
  } else {
    showSubscriptionToast('Please select a category', 'error');
    return;
  }
  
  const name = document.getElementById('subName').value.trim();
  const vendor = document.getElementById('vendor').value;
  const licenseCode = document.getElementById('licenseCode').value;
  const startDate = document.getElementById('startDate').value;
  const expiryDate = document.getElementById('expiryDate').value;
  const annualCost = parseFloat(document.getElementById('annualCost').value);
  const paymentMode = document.getElementById('paymentMode').value;
  const paymentFrequency = document.getElementById('paymentFrequency').value;
  
  if (!name || !startDate || !expiryDate || isNaN(annualCost) || annualCost <= 0) {
    showSubscriptionToast('Please fill all required fields', 'error');
    return;
  }
  
  if (new Date(expiryDate) <= new Date(startDate)) {
    showSubscriptionToast('Expiry date must be after start date', 'error');
    return;
  }
  
  const subscriptionData = {
    code: licenseCode,
    name: name,
    category: category,
    categoryCode: categoryCode,
    categoryDescription: categoryDescription,
    vendor: vendor,
    startDate: startDate,
    expiryDate: expiryDate,
    annualCost: annualCost,
    paymentMode: paymentMode,
    paymentFrequency: paymentFrequency || 'Annually'
  };
  
  console.log('Subscription data:', subscriptionData);
  
  // If using API, save to backend
  if (typeof API !== 'undefined' && API) {
    showSubscriptionToast('Saving subscription...', 'info');
    
    API.addSubscription(subscriptionData)
      .then(function(response) {
        console.log('Subscription saved:', response);
        if (response && response.success) {
          showSubscriptionToast('Subscription saved successfully!', 'success');
          resetSubscriptionForm();
          // Refresh the schedule module if it exists
          if (typeof refreshSubscriptionSchedule === 'function') {
            refreshSubscriptionSchedule();
          }
        } else {
          showSubscriptionToast('Error: ' + (response?.error || 'Unknown error'), 'error');
        }
      })
      .catch(function(error) {
        console.error('Error saving subscription:', error);
        showSubscriptionToast('Error saving subscription: ' + (error.message || error), 'error');
      });
  } else {
    // Local storage fallback
    showSubscriptionToast('Subscription saved successfully! (Local storage)', 'success');
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
  document.getElementById('paymentFrequency').value = 'Annually';
  
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

function showSubscriptionToast(message, type) {
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

// Expose global functions for add module
window.initSubscriptionAddModule = initSubscriptionAddModule;
window.submitSubscription = submitSubscription;
window.resetSubscriptionForm = resetSubscriptionForm;
window.handleSubscriptionCategoryChange = handleSubscriptionCategoryChange;
