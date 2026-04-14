/* ============================================
   ADD INVENTORY MODULE JAVASCRIPT
   Using API wrapper (JSONP)
   ============================================ */

// ============================================
// INITIALIZATION
// ============================================

function initInventoryModule() {
  console.log('Initializing Add Inventory Module');
  
  const today = new Date().toISOString().split('T')[0];
  const dateField = document.getElementById('newDateOfPurchase');
  if (dateField) dateField.value = today;
  
  loadExistingCategories();

  // Close modal when clicking outside
  window.addEventListener('click', function(event) {
    const modal = document.getElementById('messageModal');
    if (modal && event.target === modal) {
      closeInventoryModal();
    }
  });
}

// ============================================
// CATEGORY MANAGEMENT
// ============================================

function handleNewCategoryChange() {
  const select = document.getElementById('newCategory');
  const addNewFields = document.getElementById('addNewCategoryFields');
  const codeDisplay = document.getElementById('generatedCodeDisplay');

  if (select.value === 'add-new') {
    addNewFields.style.display = 'block';
    generateCategoryCode();
  } else if (select.value) {
    // Selected existing category - show the next inventory code
    addNewFields.style.display = 'none';
    displayNextInventoryCode(select.value);
  } else {
    addNewFields.style.display = 'none';
    codeDisplay.innerHTML = '<span class="code-placeholder">Select category to generate code</span>';
    document.getElementById('categoryName').value = '';
    document.getElementById('categoryCode').value = '';
    document.getElementById('categoryDescription').value = '';
  }
}

function displayNextInventoryCode(mainCode) {
  console.log('Displaying next inventory code for main code:', mainCode);
  
  // Calculate the next sub code (001)
  const nextInventoryCode = mainCode + '001';
  
  const codeDisplay = document.getElementById('generatedCodeDisplay');
  if (codeDisplay) {
    codeDisplay.innerHTML = '<span style="font-family: \'Courier New\', monospace; letter-spacing: 2px;">' + nextInventoryCode + '</span>';
  }
}

function generateCategoryCode() {
  console.log('Generating inventory category code via API');
  
  if (typeof API === 'undefined' || !API) {
    console.error('API not available');
    showInventoryMessage('API not available', 'error');
    return;
  }
  
  API.generateInventoryCategoryCode()
    .then(function(response) {
      console.log('Category code response:', response);
      const field = document.getElementById('categoryCode');
      const codeDisplay = document.getElementById('generatedCodeDisplay');
      
      if (field && response) {
        field.value = response;
        
        // Display the generated code with 001 suffix
        const inventoryCode = response + '001';
        if (codeDisplay) {
          codeDisplay.innerHTML = '<span style="font-family: \'Courier New\', monospace; letter-spacing: 2px;">' + inventoryCode + '</span>';
        }
        
        console.log('Category code generated:', response);
      } else {
        console.error('No response for category code');
        showInventoryMessage('Error generating category code', 'error');
      }
    })
    .catch(function(error) {
      console.error('Error generating category code:', error);
      showInventoryMessage('Error generating category code: ' + (error.message || error), 'error');
    });
}

function loadExistingCategories() {
  console.log('Loading existing categories via API');
  
  if (typeof API === 'undefined' || !API) {
    console.error('API not available');
    return;
  }
  
  API.getInventoryCategories()
    .then(function(response) {
      console.log('Categories response:', response);
      const select = document.getElementById('newCategory');
      if (!select) return;
      
      // Clear existing options except the first two
      while (select.options.length > 2) {
        select.remove(2);
      }
      
      if (response && Array.isArray(response)) {
        response.forEach(function(cat) {
          const option = document.createElement('option');
          option.value = cat.code;
          option.textContent = cat.name + ' (' + cat.code + ')';
          select.appendChild(option);
        });
        console.log('Loaded ' + response.length + ' categories');
      } else {
        console.error('Unexpected response format:', response);
      }
    })
    .catch(function(error) {
      console.error('Error loading categories:', error);
      showInventoryMessage('Error loading categories: ' + (error.message || error), 'error');
    });
}

// ============================================
// CALCULATIONS
// ============================================

function calculateUnitPrice() {
  const totalCost = parseFloat(document.getElementById('newTotalCost').value) || 0;
  const quantity = parseFloat(document.getElementById('newQuantity').value) || 0;
  const unitPrice = quantity > 0 ? (totalCost / quantity).toFixed(2) : '0.00';
  document.getElementById('newUnitPrice').value = unitPrice;
}

// ============================================
// SUBMIT NEW INVENTORY - USING API WRAPPER
// ============================================

function submitNewInventory() {
  const categorySelect = document.getElementById('newCategory');
  const categoryValue = categorySelect.value;

  let categoryCode, categoryName, categoryDescription;

  if (categoryValue === 'add-new') {
    categoryName = document.getElementById('categoryName').value;
    categoryCode = document.getElementById('categoryCode').value;
    categoryDescription = document.getElementById('categoryDescription').value;

    if (!categoryName || !categoryCode) {
      showInventoryMessage('Please fill in all category fields', 'error');
      return;
    }
  } else if (categoryValue) {
    categoryCode = categoryValue;
    categoryName = categorySelect.options[categorySelect.selectedIndex].text.split('(')[0].trim();
    categoryDescription = '';
  } else {
    showInventoryMessage('Please select a category', 'error');
    return;
  }

  const totalCost = document.getElementById('newTotalCost').value;
  const quantity = document.getElementById('newQuantity').value;
  const unitPrice = document.getElementById('newUnitPrice').value;
  const dateOfPurchase = document.getElementById('newDateOfPurchase').value;

  if (!totalCost || !quantity || !dateOfPurchase) {
    showInventoryMessage('Please fill in all required fields', 'error');
    return;
  }

  showInventoryLoadingModal('Adding Inventory...');

  const formData = {
    categoryCode: categoryCode,
    categoryName: categoryName,
    categoryDescription: categoryDescription || '',
    totalCost: parseFloat(totalCost),
    quantity: parseInt(quantity),
    unitPrice: parseFloat(unitPrice),
    dateOfPurchase: dateOfPurchase
  };

  console.log('Submitting form data via API:', formData);

  if (typeof API === 'undefined' || !API) {
    hideInventoryLoadingModal();
    showInventoryMessage('API not available', 'error');
    return;
  }

  // Use API wrapper
  API.addNewInventory(formData)
    .then(function(response) {
      console.log('Success response:', response);
      hideInventoryLoadingModal();
      
      if (response && response.success) {
        let message = '✓ Inventory added successfully!\n\n';
        message += 'Code: ' + response.fullCode + '\n';
        message += 'Category: ' + categoryName;
        
        if (response.wasMerged) {
          message += '\n\n(Same price detected - merged with existing batch)';
        }
        
        showInventoryMessage(message, 'success');
        setTimeout(function() {
          resetInventoryForm();
        }, 1500);
      } else {
        showInventoryMessage('Error adding inventory: ' + (response?.error || 'Unknown error'), 'error');
      }
    })
    .catch(function(error) {
      console.error('Error submitting inventory:', error);
      hideInventoryLoadingModal();
      showInventoryMessage('Error adding inventory: ' + (error.message || error), 'error');
    });
}

// ============================================
// RESET FORM
// ============================================

function resetInventoryForm() {
  document.getElementById('newInventoryForm').reset();
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('newDateOfPurchase').value = today;
  document.getElementById('addNewCategoryFields').style.display = 'none';
  document.getElementById('newCategory').value = '';
  document.getElementById('categoryCode').value = '';
  document.getElementById('categoryName').value = '';
  document.getElementById('categoryDescription').value = '';
  document.getElementById('newUnitPrice').value = '';
  document.getElementById('generatedCodeDisplay').innerHTML = '<span class="code-placeholder">Select category to generate code</span>';
  
  // Reload categories to include newly added one
  loadExistingCategories();
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
  let modal = document.getElementById('messageModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'messageModal';
    modal.className = 'modal';
    document.body.appendChild(modal);
  }
  
  let messageDiv = document.getElementById('modalMessage');
  if (!messageDiv) {
    const div = document.createElement('div');
    div.id = 'modalMessage';
    modal.appendChild(div);
    messageDiv = div;
  }
  
  const types = {
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
      const modalElem = document.getElementById('messageModal');
      if (modalElem) modalElem.style.display = 'none';
    }, 3000);
  }
}

function closeInventoryModal() {
  const modal = document.getElementById('messageModal');
  if (modal) modal.style.display = 'none';
}

function showInventoryLoadingModal(message) {
  message = message || 'Processing...';
  let modal = document.getElementById('inventoryLoadingModal');
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
  const modal = document.getElementById('inventoryLoadingModal');
  if (modal) modal.style.display = 'none';
}

// Export functions for global use
window.initInventoryModule = initInventoryModule;
window.handleNewCategoryChange = handleNewCategoryChange;
window.calculateUnitPrice = calculateUnitPrice;
window.submitNewInventory = submitNewInventory;
window.closeInventoryModal = closeInventoryModal;
