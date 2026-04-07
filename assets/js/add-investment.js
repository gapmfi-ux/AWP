/* ============================================
   ADD INVESTMENT MODULE JAVASCRIPT
   Uses google.script.run for server communication
   ============================================ */

// Global variables
let allInvestments = [];

// ============================================
// INITIALIZATION
// ============================================

function initInvestmentModule() {
  const today = new Date().toISOString().split('T')[0];
  const dateField = document.getElementById('investmentDate');
  if (dateField) dateField.value = today;

  const bankSelect = document.getElementById('bankName');
  if (bankSelect) {
    bankSelect.addEventListener('change', handleBankChange);
  }

  window.addEventListener('click', function(event) {
    const modal = document.getElementById('messageModal');
    if (modal && event.target === modal) {
      closeInvestmentModal();
    }
  });
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
    if (codeField) codeField.value = '';
  } else {
    if (addNewFields) addNewFields.style.display = 'none';
    const newTypeField = document.getElementById('newInvestmentType');
    if (newTypeField) newTypeField.value = '';
    
    if (investmentType) {
      generateInvestmentCode(investmentType);
    } else {
      if (codeField) codeField.value = '';
    }
  }
}

function handleBankChange() {
  const bankName = document.getElementById('bankName').value;
  const addNewFields = document.getElementById('addNewBankFields');

  if (bankName === 'add-new') {
    if (addNewFields) addNewFields.style.display = 'block';
  } else {
    if (addNewFields) addNewFields.style.display = 'none';
    const newBankField = document.getElementById('newBankName');
    if (newBankField) newBankField.value = '';
  }
}

function generateInvestmentCode(investmentType) {
  google.script.run
    .withSuccessHandler(function(response) {
      const field = document.getElementById('investmentCode');
      if (field && response) {
        field.value = response;
      }
    })
    .withFailureHandler(function(error) {
      console.error('Error generating investment code:', error);
      showInvestmentMessage('Error generating investment code: ' + (error.message || error), 'error');
    })
    .generateInvestmentCode(investmentType);
}

// ============================================
// CALCULATIONS
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
  
  if (!amountField || !interestRateField || !durationField) return;
  
  const amount = parseFloat(amountField.value) || 0;
  const interestRate = parseFloat(interestRateField.value) || 0;
  const duration = parseInt(durationField.value) || 0;

  const interestAmountField = document.getElementById('interestAmount');
  const maturityAmountField = document.getElementById('maturityAmount');
  
  if (amount <= 0 || interestRate < 0 || duration <= 0) {
    if (interestAmountField) interestAmountField.value = '0.00';
    if (maturityAmountField) maturityAmountField.value = '0.00';
    return;
  }

  const timeInYears = duration / 365;
  const interestAmount = (amount * interestRate * timeInYears) / 100;
  const maturityAmount = amount + interestAmount;

  if (interestAmountField) interestAmountField.value = formatCurrency(interestAmount);
  if (maturityAmountField) maturityAmountField.value = formatCurrency(maturityAmount);
}

// ============================================
// SUBMIT INVESTMENT
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
  const interestAmount = document.getElementById('interestAmount').value;
  const maturityAmount = document.getElementById('maturityAmount').value;

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

  if (!investmentCode || investmentCode.trim() === '') {
    showInvestmentMessage('Please generate an investment code', 'error');
    return;
  }

  if (!bankName || bankName === 'add-new') {
    if (bankName === 'add-new') {
      const newBank = document.getElementById('newBankName').value;
      if (!newBank || newBank.trim() === '') {
        showInvestmentMessage('Please enter a new bank name', 'error');
        return;
      }
      bankName = newBank;
    } else {
      showInvestmentMessage('Please select a bank', 'error');
      return;
    }
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

  showInvestmentLoadingModal('Adding Investment...');

  const formData = {
    investmentType: investmentType.trim(),
    investmentCode: investmentCode.trim(),
    bankName: bankName.trim(),
    amount: parseFloat(amount),
    interestRate: parseFloat(interestRate),
    duration: parseInt(duration),
    investmentDate: investmentDate,
    maturityDate: maturityDate,
    interestAmount: parseFloat(interestAmount),
    maturityAmount: parseFloat(maturityAmount)
  };

  google.script.run
    .withSuccessHandler(function(response) {
      hideInvestmentLoadingModal();
      if (response && !response.error) {
        showInvestmentMessage('✓ Investment added successfully!', 'success');
        setTimeout(() => {
          const form = document.getElementById('newInvestmentForm');
          if (form) form.reset();
          const today = new Date().toISOString().split('T')[0];
          const investmentDateField = document.getElementById('investmentDate');
          if (investmentDateField) investmentDateField.value = today;
          const codeField = document.getElementById('investmentCode');
          if (codeField) codeField.value = '';
          const interestAmountField = document.getElementById('interestAmount');
          if (interestAmountField) interestAmountField.value = '0.00';
          const maturityAmountField = document.getElementById('maturityAmount');
          if (maturityAmountField) maturityAmountField.value = '0.00';
          const typeField = document.getElementById('investmentType');
          if (typeField) typeField.value = '';
          const bankField = document.getElementById('bankName');
          if (bankField) bankField.value = '';
          const addNewTypeFields = document.getElementById('addNewInvestmentTypeFields');
          if (addNewTypeFields) addNewTypeFields.style.display = 'none';
          const addNewBankFields = document.getElementById('addNewBankFields');
          if (addNewBankFields) addNewBankFields.style.display = 'none';
        }, 1500);
      } else {
        showInvestmentMessage('Error adding investment: ' + (response?.error || 'Unknown error'), 'error');
      }
    })
    .withFailureHandler(function(error) {
      hideInvestmentLoadingModal();
      showInvestmentMessage('Error adding investment: ' + (error.message || error), 'error');
    })
    .addNewInvestment(JSON.stringify(formData));
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
  const modal = document.getElementById('messageModal');
  const messageDiv = document.getElementById('modalMessage');

  if (!modal || !messageDiv) return;

  const types = {
    success: 'success-message',
    error: 'error-message',
    info: 'info-message'
  };

  messageDiv.innerHTML = `<div class="${types[type] || types.info}">${message}</div>`;
  modal.style.display = 'flex';
}

function closeInvestmentModal() {
  const modal = document.getElementById('messageModal');
  if (modal) modal.style.display = 'none';
}

function showInvestmentLoadingModal(message = 'Processing...') {
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

// Export for global use
window.initInvestmentModule = initInvestmentModule;
window.handleInvestmentTypeChange = handleInvestmentTypeChange;
window.calculateMaturityDate = calculateMaturityDate;
window.calculateMaturityAmount = calculateMaturityAmount;
window.submitNewInvestment = submitNewInvestment;
window.closeInvestmentModal = closeInvestmentModal;
