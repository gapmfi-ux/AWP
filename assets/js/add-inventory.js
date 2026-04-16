
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
    // Selected existing category - fetch the next inventory code
    addNewFields.style.display = 'none';
    displayNextInventoryCode(select.value);
  } else {
    addNewFields.style.display = 'none';
    codeDisplay.innerHTML = '<span class="code-placeholder">-</span>';
    document.getElementById('categoryName').value = '';
    document.getElementById('categoryCode').value = '';
    document.getElementById('categoryDescription').value = '';
  }
}

function displayNextInventoryCode(mainCode) {
  console.log('Fetching next inventory code for main code:', mainCode);
  
  if (typeof API === 'undefined' || !API) {
    console.error('API not available');
    const codeDisplay = document.getElementById('generatedCodeDisplay');
    if (codeDisplay) {
      codeDisplay.innerHTML = '<span class="code-placeholder">Error loading code</span>';
    }
    return;
  }
  
  // Call API to get the next inventory code
  API.getNextInventoryCode(mainCode)
    .then(function(response) {
      console.log('Full response:', response);
      console.log('Response type:', typeof response);
      
      const codeDisplay = document.getElementById('generatedCodeDisplay');
      
      if (response && codeDisplay) {
        // Handle if response is wrapped in an object
        let nextCode = response;
        if (typeof response === 'object' && response.result) {
          nextCode = response.result;
        }
        
        nextCode = String(nextCode).trim();
        console.log('Next code to display:', nextCode);
        
        if (nextCode && nextCode !== 'undefined' && nextCode !== '') {
          codeDisplay.innerHTML = '<span style="font-family: \'Courier New\', monospace; letter-spacing: 2px; color: #4361ee;">' + nextCode + '</span>';
          console.log('✓ Updated code display to:', nextCode);
        } else {
          console.log('Invalid code response:', nextCode);
          codeDisplay.innerHTML = '<span class="code-placeholder">-</span>';
        }
      } else {
        console.log('No response or codeDisplay not found');
        if (codeDisplay) {
          codeDisplay.innerHTML = '<span class="code-placeholder">-</span>';
        }
      }
    })
    .catch(function(error) {
      console.error('Error fetching next inventory code:', error);
      const codeDisplay = document.getElementById('generatedCodeDisplay');
      if (codeDisplay) {
        codeDisplay.innerHTML = '<span class="code-placeholder">-</span>';
      }
    });
}

function generateCategoryCode() {
  console.log('Generating inventory category code via API');
  
  if (typeof API === 'undefined' || !API) {
    console.error('API not available');
    showInventoryMessage('API not available', 'error');
    return;
  }
  
  showInventoryLoadingModal('Generating code...');
  
  API.generateInventoryCategoryCode()
    .then(function(response) {
      hideInventoryLoadingModal();
      console.log('Category code response:', response);
      console.log('Response type:', typeof response);
      
      const field = document.getElementById('categoryCode');
      const codeDisplay = document.getElementById('generatedCodeDisplay');
      
      if (response) {
        const mainCode = String(response).trim();
        console.log('Extracted main code:', mainCode);
        
        field.value = mainCode;
        
        // Display the generated code with 001 suffix (new code, so always 001)
        const inventoryCode = mainCode + '001';
        if (codeDisplay) {
          codeDisplay.innerHTML = '<span style="font-family: \'Courier New\', monospace; letter-spacing: 2px; color: #4361ee;">' + inventoryCode + '</span>';
          console.log('Updated code display to:', inventoryCode);
        }
      } else {
        console.error('No response for category code');
        showInventoryMessage('Error generating category code', 'error');
      }
    })
    .catch(function(error) {
      hideInventoryLoadingModal();
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
        let message = '✓ Inventory Added Successfully\n\n';
        message += 'Code: ' + response.fullCode + '\n';
        message += 'Category: ' + categoryName + '\n';
        message += 'Quantity: ' + quantity;
        
        if (response.wasMerged) {
          message = '✓ ' + response.fullCode + ' Restocked\n\n';
          message += 'Category: ' + categoryName + '\n';
          message += 'Additional Qty: ' + quantity;
        }
        
        showSuccessModal(message, function() {
          resetInventoryForm();
        });
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
  document.getElementById('generatedCodeDisplay').innerHTML = '<span class="code-placeholder">-</span>';
  
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

function showSuccessModal(message, callback) {
  let modal = document.getElementById('successModal');
  
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'successModal';
    modal.className = 'success-modal';
    document.body.appendChild(modal);
  }
  
  const htmlMessage = message.split('\n').map(function(line) {
    return escapeHtml(line);
  }).join('<br>');
  
  modal.innerHTML = `
    <div class="success-modal-content">
      <div class="success-modal-icon">
        <i class="fas fa-check-circle"></i>
      </div>
      <div class="success-modal-message">${htmlMessage}</div>
      <button class="success-modal-btn" onclick="closeSuccessModal(true)">
        Close
      </button>
    </div>
  `;
  
  modal.style.display = 'flex';
  
  // Store callback for later
  window._successCallback = callback;
}

function closeSuccessModal(executeCallback) {
  const modal = document.getElementById('successModal');
  if (modal) modal.style.display = 'none';
  
  if (executeCallback && typeof window._successCallback === 'function') {
    window._successCallback();
    window._successCallback = null;
  }
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

  messageDiv.innerHTML = '<div class="' + (types[type] || types.info) + '">' + escapeHtml(message) + '</div>';
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
window.closeSuccessModal = closeSuccessModal;

/* Add CSS for success modal */
const style = document.createElement('style');
style.textContent = `
  .success-modal {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: none;
    align-items: center;
    justify-content: center;
    z-index: 2000;
  }

  .success-modal-content {
    background: white;
    padding: 30px;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
    max-width: 380px;
    text-align: center;
    animation: successSlideIn 0.3s ease-out;
  }

  @keyframes successSlideIn {
    from {
      transform: translateY(-30px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  .success-modal-icon {
    margin-bottom: 15px;
  }

  .success-modal-icon i {
    font-size: 50px;
    color: #06d6a0;
  }

  .success-modal-message {
    font-size: 14px;
    color: #2d3748;
    line-height: 1.6;
    margin-bottom: 20px;
  }

  .success-modal-btn {
    padding: 10px 28px;
    background: linear-gradient(135deg, #4361ee, #7209b7);
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 600;
    transition: all 0.3s;
  }

  .success-modal-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(67, 97, 238, 0.3);
  }
`;
document.head.appendChild(style);
