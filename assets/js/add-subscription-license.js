// ============================================
// SUBSCRIPTION MODULE - FAST AUTO-POPULATION
// ============================================

function loadSubscriptionCategories() {
  console.log('Loading subscription categories via API');
  
  if (typeof API === 'undefined' || !API) {
    console.error('API not available');
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
      }
    })
    .catch(function(error) {
      console.error('Error loading categories:', error);
    });
}

function handleSubscriptionCategoryChange() {
  const select = document.getElementById('subCategory');
  const addNewFields = document.getElementById('addNewCategoryFields');
  const codeDisplay = document.getElementById('generatedCodeDisplay');

  if (select.value === 'add-new') {
    addNewFields.style.display = 'block';
    generateSubscriptionCategoryCode();
  } else if (select.value) {
    // Selected existing category - fetch the next subscription code
    addNewFields.style.display = 'none';
    displayNextSubscriptionCode(select.value);
  } else {
    addNewFields.style.display = 'none';
    codeDisplay.innerHTML = '<span class="code-placeholder">-</span>';
    document.getElementById('categoryName').value = '';
    document.getElementById('categoryCode').value = '';
    document.getElementById('categoryDescription').value = '';
  }
}

function displayNextSubscriptionCode(categoryCode) {
  console.log('Fetching next subscription code for category:', categoryCode);
  
  if (typeof API === 'undefined' || !API) {
    console.error('API not available');
    const codeDisplay = document.getElementById('generatedCodeDisplay');
    if (codeDisplay) {
      codeDisplay.innerHTML = '<span class="code-placeholder">Error loading code</span>';
    }
    return;
  }
  
  // Call API to get the next subscription code
  API.getNextSubscriptionCode(categoryCode)
    .then(function(response) {
      console.log('Full response:', response);
      
      const codeDisplay = document.getElementById('generatedCodeDisplay');
      const licenseCodeField = document.getElementById('licenseCode');
      
      if (response && codeDisplay) {
        // Handle different response formats
        let nextCode = response;
        if (typeof response === 'object' && response.result) {
          nextCode = response.result;
        } else if (typeof response === 'object' && response.code) {
          nextCode = response.code;
        } else if (typeof response === 'object') {
          nextCode = Object.values(response).find(v => typeof v === 'string') || String(response);
        }
        
        nextCode = String(nextCode).trim();
        console.log('Next code to display:', nextCode);
        
        if (nextCode && nextCode !== 'undefined' && nextCode !== '') {
          codeDisplay.innerHTML = '<span style="font-family: \'Courier New\', monospace; letter-spacing: 2px; color: #4361ee;">' + nextCode + '</span>';
          if (licenseCodeField) licenseCodeField.value = nextCode;
          console.log('✓ Updated code display to:', nextCode);
        } else {
          console.log('Invalid code response:', nextCode);
          codeDisplay.innerHTML = '<span class="code-placeholder">-</span>';
        }
      }
    })
    .catch(function(error) {
      console.error('Error fetching next subscription code:', error);
      const codeDisplay = document.getElementById('generatedCodeDisplay');
      if (codeDisplay) {
        codeDisplay.innerHTML = '<span class="code-placeholder">-</span>';
      }
    });
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
      
      const field = document.getElementById('categoryCode');
      const codeDisplay = document.getElementById('generatedCodeDisplay');
      const licenseCodeField = document.getElementById('licenseCode');
      
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
        
        field.value = mainCode;
        
        // Display the generated code with 001 suffix (new code, so always 001)
        const licenseCode = mainCode + '001';
        if (codeDisplay) {
          codeDisplay.innerHTML = '<span style="font-family: \'Courier New\', monospace; letter-spacing: 2px; color: #4361ee;">' + licenseCode + '</span>';
          console.log('Updated code display to:', licenseCode);
        }
        if (licenseCodeField) {
          licenseCodeField.value = licenseCode;
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
  
  // Load categories from sheet
  loadSubscriptionCategories();
  
  // Hide add-new category fields initially
  const addNewFields = document.getElementById('addNewCategoryFields');
  if (addNewFields) addNewFields.style.display = 'none';
}


function handlePaymentModeChange() {
  const paymentMode = document.getElementById('paymentMode').value;
  const frequencyGroup = document.getElementById('paymentFrequencyGroup');
  
  if (paymentMode === 'In Arrears') {
    frequencyGroup.style.display = 'block';
  } else {
    frequencyGroup.style.display = 'none';
  }
}

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
    category = categoryValue;
    categoryCode = categoryValue;
    categoryDescription = '';
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
    paymentFrequency: paymentFrequency || 'Yearly'
  };
  
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
  document.getElementById('paymentFrequency').value = 'Yearly';
  
  // Hide add-new category fields
  const addNewFields = document.getElementById('addNewCategoryFields');
  if (addNewFields) addNewFields.style.display = 'none';
  
  // Hide payment frequency initially
  const frequencyGroup = document.getElementById('paymentFrequencyGroup');
  if (frequencyGroup) frequencyGroup.style.display = 'none';
  
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
