/* ============================================
   ADD INVESTMENT MODULE JAVASCRIPT
   With Bank Day Count Persistence & Proper Toggle
   ============================================ */

// Storage key for bank day counts
const BANK_DAY_COUNT_STORAGE_KEY = 'investment_bank_day_counts';

// ============================================
// INITIALIZATION
// ============================================

function initInvestmentModule() {
  console.log('Initializing Add Investment Module with Bank Day Count');
  
  const today = new Date().toISOString().split('T')[0];
  const dateField = document.getElementById('investmentDate');
  if (dateField) dateField.value = today;

  const bankSelect = document.getElementById('bankName');
  if (bankSelect) {
    // Load saved bank day counts into the select options
    loadBankDayCountsIntoSelect();
    bankSelect.addEventListener('change', handleBankChange);
  }

  // Add event listeners for real-time calculations
  const amountField = document.getElementById('amount');
  const rateField = document.getElementById('interestRate');
  const durationField = document.getElementById('duration');
  const investmentDateField = document.getElementById('investmentDate');
  const maturityDateField = document.getElementById('maturityDate');
  const dayCountField = document.getElementById('dayCount');

  if (amountField) {
    amountField.addEventListener('input', calculateMaturityAmount);
  }
  if (rateField) {
    rateField.addEventListener('input', calculateMaturityAmount);
  }
  if (durationField) {
    durationField.addEventListener('input', function() {
      calculateMaturityDate();
      calculateMaturityAmount();
    });
  }
  if (investmentDateField) {
    investmentDateField.addEventListener('change', function() {
      calculateMaturityDate();
      calculateMaturityAmount();
    });
  }
  if (maturityDateField) {
    maturityDateField.addEventListener('change', calculateMaturityAmount);
  }
  if (dayCountField) {
    dayCountField.addEventListener('change', calculateMaturityAmount);
  }

  // Set default day count
  if (dayCountField && !dayCountField.value) {
    dayCountField.value = '365';
  }

  // Close modal when clicking outside
  window.addEventListener('click', function(event) {
    const modal = document.getElementById('messageModal');
    if (modal && event.target === modal) {
      closeInvestmentModal();
    }
  });
}

// ============================================
// BANK DAY COUNT MANAGEMENT
// ============================================

function getBankDayCounts() {
  const stored = localStorage.getItem(BANK_DAY_COUNT_STORAGE_KEY);
  if (stored) {
    return JSON.parse(stored);
  }
  // Default day counts for common banks
  return {
    'Fidelity': 365,
    'CBG': 365,
    'Ecobank': 360,
    'GCB': 365
  };
}

function saveBankDayCount(bankName, dayCount) {
  const counts = getBankDayCounts();
  counts[bankName] = parseInt(dayCount);
  localStorage.setItem(BANK_DAY_COUNT_STORAGE_KEY, JSON.stringify(counts));
  console.log(`Saved day count ${dayCount} for bank: ${bankName}`);
}

function loadBankDayCountsIntoSelect() {
  const bankSelect = document.getElementById('bankName');
  if (!bankSelect) return;
  
  const counts = getBankDayCounts();
  
  // Add day count as data attribute to each option
  for (let i = 0; i < bankSelect.options.length; i++) {
    const option = bankSelect.options[i];
    const bankName = option.value;
    if (bankName && bankName !== 'add-new' && counts[bankName]) {
      option.setAttribute('data-day-count', counts[bankName]);
    }
  }
}

function getBankDayCount(bankName) {
  const counts = getBankDayCounts();
  return counts[bankName] || 365;
}

function setDayCountForBank(bankName) {
  const dayCountField = document.getElementById('dayCount');
  if (!dayCountField || !bankName || bankName === 'add-new') return;
  
  const dayCount = getBankDayCount(bankName);
  dayCountField.value = dayCount;
  console.log(`Set day count to ${dayCount} for bank: ${bankName}`);
  
  // Trigger recalculation
  calculateMaturityAmount();
}

// ============================================
// INVESTMENT TYPE & BANK HANDLERS
// ============================================

function handleInvestmentTypeChange() {
  const investmentType = document.getElementById('investmentType').value;
  const codeField = document.getElementById('investmentCode');
  const addNewFields = document.getElementById('addNewInvestmentTypeFields');

  if (investmentType === 'add-new') {
    if (addNewFields) addNewFields.style.display = 'block';
    if (codeField) {
      codeField.value = '';
      codeField.readOnly = false;
    }
  } else {
    if (addNewFields) addNewFields.style.display = 'none';
    const newTypeField = document.getElementById('newInvestmentType');
    if (newTypeField) newTypeField.value = '';
    
    if (investmentType) {
      codeField.value = 'Generating...';
      codeField.readOnly = true;
      generateInvestmentCode(investmentType);
    } else {
      if (codeField) {
        codeField.value = '';
        codeField.readOnly = false;
      }
    }
  }
}

function handleBankChange() {
  const bankName = document.getElementById('bankName').value;
  const addNewBankFields = document.getElementById('addNewBankFields');
  const dayCountField = document.getElementById('dayCount');

  if (bankName === 'add-new') {
    // Show the add new bank fields
    if (addNewBankFields) {
      addNewBankFields.style.display = 'block';
    }
    // Clear the day count field for new bank entry
    if (dayCountField) {
      dayCountField.value = '365';
    }
  } else {
    // Hide the add new bank fields
    if (addNewBankFields) {
      addNewBankFields.style.display = 'none';
    }
    // Clear the new bank input fields
    const newBankField = document.getElementById('newBankName');
    if (newBankField) newBankField.value = '';
    
    const newBankDayCount = document.getElementById('newBankDayCount');
    if (newBankDayCount) newBankDayCount.value = '365';
    
    // Set day count for selected bank
    if (bankName && bankName !== '') {
      setDayCountForBank(bankName);
    }
  }
}

function generateInvestmentCode(investmentType) {
  console.log('Generating investment code for:', investmentType);
  
  google.script.run
    .withSuccessHandler(function(response) {
      const field = document.getElementById('investmentCode');
      if (field && response) {
        field.value = response;
        console.log('Investment code generated:', response);
      }
    })
    .withFailureHandler(function(error) {
      console.error('Error generating investment code:', error);
      const field = document.getElementById('investmentCode');
      if (field) {
        field.value = '';
        showInvestmentMessage('Error generating investment code: ' + (error.message || error), 'error');
      }
    })
    .generateInvestmentCode(investmentType);
}

// ============================================
// CALCULATIONS WITH DAY COUNT
// ============================================

function calculateMaturityDate() {
  const investmentDate = document.getElementById('investmentDate');
  const durationField = document.getElementById('duration');
  
  if (!investmentDate || !durationField) return;
  
  const investmentDateValue = investmentDate.value;
  const duration = parseInt(durationField.value) || 0;

  if (!investmentDateValue || duration <= 0) {
    const maturityDateField = document.getElementById('maturityDate');
    if (maturityDateField) maturityDateField.value = '';
    return;
  }

  const startDate = new Date(investmentDateValue);
  const maturityDate = new Date(startDate.getTime() + (duration * 24 * 60 * 60 * 1000));
  
  const year = maturityDate.getFullYear();
  const month = String(maturityDate.getMonth() + 1).padStart(2, '0');
  const day = String(maturityDate.getDate()).padStart(2, '0');
  
  const maturityDateField = document.getElementById('maturityDate');
  if (maturityDateField) maturityDateField.value = `${year}-${month}-${day}`;
  calculateMaturityAmount();
}

function calculateMaturityAmount() {
  const amountField = document.getElementById('amount');
  const interestRateField = document.getElementById('interestRate');
  const durationField = document.getElementById('duration');
  const dayCountField = document.getElementById('dayCount');
  
  if (!amountField || !interestRateField || !durationField || !dayCountField) return;
  
  const amount = parseFloat(amountField.value) || 0;
  const interestRate = parseFloat(interestRateField.value) || 0;
  const duration = parseInt(durationField.value) || 0;
  const dayCount = parseInt(dayCountField.value) || 365;

  const interestAmountField = document.getElementById('interestAmount');
  const maturityAmountField = document.getElementById('maturityAmount');
  
  if (amount <= 0 || interestRate < 0 || duration <= 0) {
    if (interestAmountField) interestAmountField.value = '0.00';
    if (maturityAmountField) maturityAmountField.value = '0.00';
    return;
  }

  // Interest = Principal * Rate * (Duration / DayCount)
  const timeInYears = duration / dayCount;
  const interestAmount = (amount * interestRate * timeInYears) / 100;
  const maturityAmount = amount + interestAmount;

  if (interestAmountField) interestAmountField.value = formatCurrency(interestAmount);
  if (maturityAmountField) maturityAmountField.value = formatCurrency(maturityAmount);
}

// ============================================
// SUBMIT NEW INVESTMENT - WITH BANK SAVING
// ============================================

function submitNewInvestment() {
  let investmentType = document.getElementById('investmentType').value;
  const investmentCode = document.getElementById('investmentCode').value;
  let bankName = document.getElementById('bankName').value;
  const amount = document.getElementById('amount').value;
  const interestRate = document.getElementById('interestRate').value;
  const duration = document.getElementById('duration').value;
  const investmentDate = document.getElementById('investmentDate').value;
  const maturityDate = document.getElementById('maturityDate').value;
  let dayCount = document.getElementById('dayCount').value;

  // Validation
  if (!investmentType || investmentType === 'add-new') {
    if (investmentType === 'add-new') {
      const newType = document.getElementById('newInvestmentType').value;
      if (!newType || newType.trim() === '') {
        showInvestmentMessage('Please enter a new investment type', 'error');
        return;
      }
      investmentType = newType;
    } else {
      showInvestmentMessage('Please select an investment type', 'error');
      return;
    }
  }

  if (!investmentCode || investmentCode.trim() === '' || investmentCode === 'Generating...') {
    showInvestmentMessage('Please wait for the investment code to be generated', 'error');
    return;
  }

  // Handle new bank addition
  let isNewBank = false;
  if (bankName === 'add-new') {
    const newBankName = document.getElementById('newBankName').value;
    const newBankDayCount = document.getElementById('newBankDayCount').value;
    
    if (!newBankName || newBankName.trim() === '') {
      showInvestmentMessage('Please enter a new bank name', 'error');
      return;
    }
    
    bankName = newBankName.trim();
    dayCount = newBankDayCount;
    isNewBank = true;
  }

  if (!bankName || bankName === '') {
    showInvestmentMessage('Please select a bank', 'error');
    return;
  }

  if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
    showInvestmentMessage('Please enter a valid amount', 'error');
    return;
  }

  if (!interestRate || isNaN(interestRate) || parseFloat(interestRate) < 0) {
    showInvestmentMessage('Please enter a valid interest rate', 'error');
    return;
  }

  if (!duration || isNaN(duration) || parseInt(duration) <= 0) {
    showInvestmentMessage('Please enter a valid duration', 'error');
    return;
  }

  if (!investmentDate) {
    showInvestmentMessage('Please select an investment date', 'error');
    return;
  }

  if (!maturityDate) {
    showInvestmentMessage('Please enter a maturity date', 'error');
    return;
  }

  // Save the bank's day count if it's a new bank
  if (isNewBank) {
    saveBankDayCount(bankName, dayCount);
    // Add the new bank to the dropdown for future use
    addBankToDropdown(bankName, dayCount);
  }

  // Calculate final amounts with day count
  const dayCountValue = parseInt(dayCount) || 365;
  const timeInYears = parseInt(duration) / dayCountValue;
  const calculatedInterestAmount = (parseFloat(amount) * parseFloat(interestRate) * timeInYears) / 100;
  const calculatedMaturityAmount = parseFloat(amount) + calculatedInterestAmount;

  showInvestmentLoadingModal('Adding Investment...');

  // Create data object
  const investmentData = {
    investmentType: investmentType.trim(),
    investmentCode: investmentCode.trim(),
    bankName: bankName.trim(),
    amount: parseFloat(amount),
    interestRate: parseFloat(interestRate),
    duration: parseInt(duration),
    investmentDate: investmentDate,
    maturityDate: maturityDate,
    interestAmount: calculatedInterestAmount,
    maturityAmount: calculatedMaturityAmount,
    dayCount: dayCountValue
  };

  console.log('Submitting investment data with day count:', investmentData);

  google.script.run
    .withSuccessHandler(function(response) {
      console.log('Success response:', response);
      hideInvestmentLoadingModal();
      if (response && response.success) {
        showInvestmentMessage('✓ Investment added successfully!', 'success');
        setTimeout(() => {
          resetInvestmentForm();
        }, 1500);
      } else {
        showInvestmentMessage('Error: ' + (response?.error || 'Unknown error'), 'error');
      }
    })
    .withFailureHandler(function(error) {
      console.error('Error details:', error);
      hideInvestmentLoadingModal();
      showInvestmentMessage('Error adding investment: ' + (error.message || error), 'error');
    })
    .addNewInvestment(investmentData);
}

// Helper function to add new bank to dropdown
function addBankToDropdown(bankName, dayCount) {
  const bankSelect = document.getElementById('bankName');
  if (!bankSelect) return;
  
  // Check if bank already exists
  for (let i = 0; i < bankSelect.options.length; i++) {
    if (bankSelect.options[i].value === bankName) {
      return; // Bank already exists
    }
  }
  
  // Create new option
  const option = document.createElement('option');
  option.value = bankName;
  option.textContent = bankName;
  option.setAttribute('data-day-count', dayCount);
  
  // Insert before the "add-new" option
  const addNewOption = bankSelect.querySelector('option[value="add-new"]');
  if (addNewOption) {
    bankSelect.insertBefore(option, addNewOption);
  } else {
    bankSelect.appendChild(option);
  }
  
  console.log(`Added ${bankName} to dropdown with day count ${dayCount}`);
}

// ============================================
// RESET FORM
// ============================================

function resetInvestmentForm() {
  const form = document.getElementById('newInvestmentForm');
  if (form) form.reset();
  
  const today = new Date().toISOString().split('T')[0];
  const investmentDateField = document.getElementById('investmentDate');
  if (investmentDateField) investmentDateField.value = today;
  
  const codeField = document.getElementById('investmentCode');
  if (codeField) {
    codeField.value = '';
    codeField.readOnly = false;
  }
  
  const interestAmountField = document.getElementById('interestAmount');
  if (interestAmountField) interestAmountField.value = '0.00';
  
  const maturityAmountField = document.getElementById('maturityAmount');
  if (maturityAmountField) maturityAmountField.value = '0.00';
  
  const typeField = document.getElementById('investmentType');
  if (typeField) typeField.value = '';
  
  const bankField = document.getElementById('bankName');
  if (bankField) bankField.value = '';
  
  const dayCountField = document.getElementById('dayCount');
  if (dayCountField) dayCountField.value = '365';
  
  // Hide toggle fields
  const addNewTypeFields = document.getElementById('addNewInvestmentTypeFields');
  if (addNewTypeFields) addNewTypeFields.style.display = 'none';
  
  const addNewBankFields = document.getElementById('addNewBankFields');
  if (addNewBankFields) addNewBankFields.style.display = 'none';
  
  // Clear input fields
  const newTypeField = document.getElementById('newInvestmentType');
  if (newTypeField) newTypeField.value = '';
  
  const newBankField = document.getElementById('newBankName');
  if (newBankField) newBankField.value = '';
  
  const newBankDayCount = document.getElementById('newBankDayCount');
  if (newBankDayCount) newBankDayCount.value = '365';
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function formatCurrency(value) {
  if (value === null || value === undefined || value === '') return '0.00';
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

function showInvestmentMessage(message, type) {
  let modal = document.getElementById('messageModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'messageModal';
    modal.className = 'investment-message-modal';
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

function closeInvestmentModal() {
  const modal = document.getElementById('messageModal');
  if (modal) modal.style.display = 'none';
}

function showInvestmentLoadingModal(message = 'Adding Investment...') {
  let modal = document.getElementById('investmentLoadingModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'investmentLoadingModal';
    modal.className = 'investment-loading-modal';
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

function hideInvestmentLoadingModal() {
  const modal = document.getElementById('investmentLoadingModal');
  if (modal) modal.style.display = 'none';
}

// Export functions for global use
window.initInvestmentModule = initInvestmentModule;
window.handleInvestmentTypeChange = handleInvestmentTypeChange;
window.handleBankChange = handleBankChange;
window.calculateMaturityDate = calculateMaturityDate;
window.calculateMaturityAmount = calculateMaturityAmount;
window.submitNewInvestment = submitNewInvestment;
window.resetInvestmentForm = resetInvestmentForm;
window.generateInvestmentCode = generateInvestmentCode;
window.closeInvestmentModal = closeInvestmentModal;
