/* ============================================
   ADD ASSET MODULE JAVASCRIPT
   Using google.script.run (same pattern as inventory)
   ============================================ */

// ============================================
// INITIALIZATION
// ============================================

function initAssetModule() {
  console.log('Initializing Add Asset Module');
  
  const today = new Date().toISOString().split('T')[0];
  const dateField = document.getElementById('dateOfPurchase');
  if (dateField) dateField.value = today;
  
  // Add event listeners for real-time updates
  const costField = document.getElementById('assetCost');
  const purchaseDateField = document.getElementById('dateOfPurchase');
  const typeField = document.getElementById('assetType');
  
  if (costField) {
    costField.addEventListener('input', function() {
      if (typeField && typeField.value) updateDepreciationInfo();
    });
  }
  
  if (purchaseDateField) {
    purchaseDateField.addEventListener('change', function() {
      if (typeField && typeField.value) updateDepreciationInfo();
    });
  }
  
  // Close modal when clicking outside
  window.addEventListener('click', function(event) {
    const modal = document.getElementById('messageModal');
    if (modal && event.target === modal) {
      closeAssetModal();
    }
  });
}

// ============================================
// ASSET CODE GENERATION
// ============================================

function handleAssetTypeChange() {
  const assetType = document.getElementById('assetType').value;
  const codeField = document.getElementById('assetCode');
  const depreciationInfo = document.getElementById('depreciationInfo');
  
  if (assetType) {
    // Show depreciation info
    depreciationInfo.style.display = 'block';
    updateDepreciationInfo();
    
    if (assetType === 'Fittings' || assetType === 'Software') {
      codeField.value = 'N/A';
      codeField.readOnly = true;
    } else {
      codeField.value = 'Generating...';
      codeField.readOnly = true;
      generateAssetCode(assetType);
    }
  } else {
    depreciationInfo.style.display = 'none';
    codeField.value = '';
    codeField.readOnly = false;
  }
}

function generateAssetCode(assetType) {
  console.log('Generating asset code for:', assetType);
  
  google.script.run
    .withSuccessHandler(function(response) {
      const field = document.getElementById('assetCode');
      if (field && response) {
        field.value = response;
        console.log('Asset code generated:', response);
      }
    })
    .withFailureHandler(function(error) {
      console.error('Error generating asset code:', error);
      document.getElementById('assetCode').value = '';
      showAssetMessage('Error generating asset code: ' + (error.message || error), 'error');
    })
    .generateAssetCode(assetType);
}

// ============================================
// DEPRECIATION CALCULATIONS
// ============================================

function updateDepreciationInfo() {
  const assetType = document.getElementById('assetType').value;
  const cost = parseFloat(document.getElementById('assetCost').value) || 0;
  const purchaseDate = document.getElementById('dateOfPurchase').value;
  
  console.log('Updating depreciation info:', { assetType, cost, purchaseDate });
  
  if (!assetType) {
    return;
  }
  
  if (!cost || cost <= 0 || !purchaseDate) {
    // Show placeholders
    document.getElementById('lifeSpanDisplay').textContent = '—';
    document.getElementById('rateDisplay').textContent = '—';
    document.getElementById('monthlyDepDisplay').textContent = '—';
    document.getElementById('annualChargeDisplay').textContent = '—';
    document.getElementById('endOfLifeDisplay').textContent = '—';
    return;
  }
  
  // Get asset config
  const configs = {
    'Computers & Accessories': { lifeSpan: 3, rate: 33.33 },
    'Furniture and Fixtures': { lifeSpan: 3, rate: 33.33 },
    'Office Equipment': { lifeSpan: 3, rate: 33.33 },
    'Software': { lifeSpan: 3, rate: 33.33 },
    'Fittings': { lifeSpan: 5, rate: 20.00 },
    'Motor Vehicle': { lifeSpan: 5, rate: 20.00 }
  };
  
  const config = configs[assetType] || { lifeSpan: 3, rate: 33.33 };
  const annualCharge = (cost * config.rate) / 100;
  const monthlyDep = annualCharge / 12;
  
  // Calculate end of life span
  const purchase = new Date(purchaseDate);
  const endOfLife = new Date(purchase);
  endOfLife.setFullYear(purchase.getFullYear() + config.lifeSpan);
  // Subtract one day to get the actual end of life date
  endOfLife.setDate(endOfLife.getDate() - 1);
  
  // Update the display
  document.getElementById('lifeSpanDisplay').textContent = config.lifeSpan + ' years';
  document.getElementById('rateDisplay').textContent = config.rate + '%';
  document.getElementById('monthlyDepDisplay').textContent = formatCurrency(monthlyDep);
  document.getElementById('annualChargeDisplay').textContent = formatCurrency(annualCharge);
  document.getElementById('endOfLifeDisplay').textContent = formatDateForDisplay(endOfLife);
  
  console.log('Depreciation info updated:', {
    lifeSpan: config.lifeSpan,
    rate: config.rate,
    monthlyDep: monthlyDep,
    annualCharge: annualCharge,
    endOfLife: endOfLife
  });
}

// ============================================
// SUBMIT NEW ASSET - USING google.script.run
// ============================================

function submitNewAsset() {
  const assetType = document.getElementById('assetType').value;
  const assetCode = document.getElementById('assetCode').value;
  const assetName = document.getElementById('assetName').value;
  const dateOfPurchase = document.getElementById('dateOfPurchase').value;
  const assetCost = document.getElementById('assetCost').value;
  const assetLocation = document.getElementById('assetLocation').value;

  // Validation
  if (!assetType) {
    showAssetMessage('Please select an asset type', 'error');
    return;
  }

  if (!assetName || assetName.trim() === '') {
    showAssetMessage('Please enter the name of the asset', 'error');
    return;
  }

  if (!dateOfPurchase) {
    showAssetMessage('Please select a date of purchase', 'error');
    return;
  }

  if (!assetCost || isNaN(assetCost) || assetCost <= 0) {
    showAssetMessage('Please enter a valid cost', 'error');
    return;
  }

  if (!assetLocation || assetLocation.trim() === '') {
    showAssetMessage('Please enter the asset location', 'error');
    return;
  }

  if ((assetType !== 'Fittings' && assetType !== 'Software') && (!assetCode || assetCode === 'Generating...')) {
    showAssetMessage('Please wait for the asset code to be generated', 'error');
    return;
  }

  showAssetLoadingModal('Adding Asset...');

  const formData = {
    assetType: assetType,
    assetCode: assetCode === 'N/A' ? '' : assetCode,
    assetName: assetName.trim(),
    dateOfPurchase: dateOfPurchase,
    assetCost: parseFloat(assetCost),
    location: assetLocation.trim(),
    status: 'Active'
  };

  console.log('Submitting form data:', formData);

  google.script.run
    .withSuccessHandler(function(response) {
      console.log('Success response:', response);
      hideAssetLoadingModal();
      showAssetMessage('✓ Asset added successfully!', 'success');
      setTimeout(() => {
        resetAssetForm();
      }, 1500);
    })
    .withFailureHandler(function(error) {
      console.error('Error:', error);
      hideAssetLoadingModal();
      showAssetMessage('Error adding asset: ' + (error.message || error), 'error');
    })
    .addNewAsset(formData);
}

// ============================================
// RESET FORM
// ============================================

function resetAssetForm() {
  document.getElementById('newAssetForm').reset();
  document.getElementById('depreciationInfo').style.display = 'none';
  document.getElementById('assetCode').value = '';
  document.getElementById('assetCode').readOnly = false;
  const today = new Date().toISOString().split('T')[0];
  const dateField = document.getElementById('dateOfPurchase');
  if (dateField) dateField.value = today;
  document.getElementById('assetType').value = '';
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function formatDateForDisplay(date) {
  if (!date) return '';
  if (!(date instanceof Date)) date = new Date(date);
  if (isNaN(date.getTime())) return '';
  
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

function formatCurrency(value) {
  if (isNaN(value) || value === null || value === undefined) return '0.00';
  return parseFloat(value).toLocaleString('en-US', {
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

function showAssetMessage(message, type) {
  let modal = document.getElementById('messageModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'messageModal';
    modal.className = 'asset-message-modal';
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

  messageDiv.innerHTML = `<div class="${types[type] || types.info}">${message}</div>`;
  modal.style.display = 'flex';
  
  setTimeout(() => {
    if (modal) modal.style.display = 'none';
  }, 3000);
}

function closeAssetModal() {
  const modal = document.getElementById('messageModal');
  if (modal) modal.style.display = 'none';
}

function showAssetLoadingModal(message = 'Adding Asset...') {
  let modal = document.getElementById('assetLoadingModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'assetLoadingModal';
    modal.className = 'asset-loading-modal';
    document.body.appendChild(modal);
  }
  
  modal.innerHTML = `
    <div class="loading-modal-content">
      <div class="loading-spinner"></div>
      <p>${message}</p>
    </div>
  `;
  modal.style.display = 'flex';
}

function hideAssetLoadingModal() {
  const modal = document.getElementById('assetLoadingModal');
  if (modal) modal.style.display = 'none';
}

// Export functions for global use
window.initAssetModule = initAssetModule;
window.handleAssetTypeChange = handleAssetTypeChange;
window.submitNewAsset = submitNewAsset;
window.updateDepreciationInfo = updateDepreciationInfo;
window.resetAssetForm = resetAssetForm;
window.generateAssetCode = generateAssetCode;
window.closeAssetModal = closeAssetModal;
