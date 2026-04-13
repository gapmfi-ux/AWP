/* ============================================
   ADD INVESTMENT MODULE JAVASCRIPT
   With Auto-loaded Banks from Google Sheet
   ============================================ */

(function() {
  // Use IIFE to avoid global variable conflicts
  
  // Storage key for bank day counts
  var BANK_DAY_COUNT_STORAGE_KEY = 'investment_bank_day_counts';
  
  // Flag to track if module is already initialized
  var isModuleInitialized = false;

  // ============================================
  // INITIALIZATION
  // ============================================

  window.initInvestmentModule = function() {
    // Prevent duplicate initialization
    if (isModuleInitialized) {
      console.log('Investment module already initialized');
      return;
    }
    isModuleInitialized = true;
    
    console.log('Initializing Add Investment Module');
    
    const today = new Date().toISOString().split('T')[0];
    const dateField = document.getElementById('investmentDate');
    if (dateField) dateField.value = today;

    // Load banks from Google Sheet
    loadBanksFromSheet();

    // Add event listeners for real-time calculations
    const amountField = document.getElementById('amount');
    const interestRateField = document.getElementById('interestRate');
    const durationField = document.getElementById('duration');
    const investmentDateField = document.getElementById('investmentDate');
    const maturityDateField = document.getElementById('maturityDate');

    if (amountField) {
      amountField.addEventListener('input', calculateMaturityAmount);
    }
    if (interestRateField) {
      interestRateField.addEventListener('input', calculateMaturityAmount);
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

    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
      const modal = document.getElementById('messageModal');
      if (modal && event.target === modal) {
        closeInvestmentModal();
      }
    });
  };

  // ============================================
  // LOAD BANKS FROM GOOGLE SHEET
  // ============================================

  function loadBanksFromSheet() {
    console.log('Loading banks from Google Sheet...');
    
    if (typeof google !== 'undefined' && google.script && google.script.run) {
      google.script.run
        .withSuccessHandler(function(banks) {
          console.log('Banks loaded:', banks);
          populateBankDropdown(banks);
        })
        .withFailureHandler(function(error) {
          console.error('Error loading banks:', error);
          // Fallback to default banks if sheet fails
          const defaultBanks = ['Fidelity', 'CBG', 'Ecobank', 'GCB'];
          populateBankDropdown(defaultBanks);
        })
        .getUniqueBanks();
    } else {
      // Fallback for testing without Google Apps Script
      console.log('Google Apps Script not available, using default banks');
      const defaultBanks = ['Fidelity', 'CBG', 'Ecobank', 'GCB'];
      populateBankDropdown(defaultBanks);
    }
  }

  function populateBankDropdown(banks) {
    const bankSelect = document.getElementById('bankName');
    if (!bankSelect) return;
    
    // Clear existing options
    while (bankSelect.options.length > 0) {
      bankSelect.remove(0);
    }
    
    // Add placeholder option
    const placeholderOption = document.createElement('option');
    placeholderOption.value = '';
    placeholderOption.textContent = 'Select Bank';
    bankSelect.appendChild(placeholderOption);
    
    // Add bank options
    if (banks && banks.length > 0) {
      banks.forEach(function(bank) {
        if (bank && bank.trim() !== '') {
          const option = document.createElement('option');
          option.value = bank;
          option.textContent = bank;
          
          // Add day count attribute if available
          const dayCount = getBankDayCount(bank);
          option.setAttribute('data-day-count', dayCount);
          
          bankSelect.appendChild(option);
        }
      });
    }
    
    // Add "Add New Bank" option at the end
    const addNewOption = document.createElement('option');
    addNewOption.value = 'add-new';
    addNewOption.textContent = '+ Add New Bank';
    bankSelect.appendChild(addNewOption);
    
    console.log('Populated ' + banks.length + ' banks into dropdown');
  }

  // ============================================
  // BANK DAY COUNT MANAGEMENT
  // ============================================

  function getBankDayCounts() {
    try {
      const stored = localStorage.getItem(BANK_DAY_COUNT_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch(e) {
      console.warn('Error parsing bank day counts:', e);
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
    console.log('Saved day count ' + dayCount + ' for bank: ' + bankName);
  }

  function getBankDayCount(bankName) {
    const counts = getBankDayCounts();
    return counts[bankName] || 365;
  }

  // ============================================
  // INVESTMENT TYPE HANDLER
  // ============================================

  window.handleInvestmentTypeChange = function() {
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
  };

  window.handleBankChange = function() {
    const bankName = document.getElementById('bankName').value;
    const addNewBankFields = document.getElementById('addNewBankFields');

    if (bankName === 'add-new') {
      if (addNewBankFields) {
        addNewBankFields.style.display = 'block';
      }
    } else {
      if (addNewBankFields) {
        addNewBankFields.style.display = 'none';
      }
      // Clear the new bank input fields
      const newBankField = document.getElementById('newBankName');
      if (newBankField) newBankField.value = '';
      
      const newBankDayCount = document.getElementById('newBankDayCount');
      if (newBankDayCount) newBankDayCount.value = '365';
      
      // Recalculate maturity amount when bank changes (day count may affect)
      calculateMaturityAmount();
    }
  };

  function addNewBankToDropdown(bankName, dayCount) {
    const bankSelect = document.getElementById('bankName');
    if (!bankSelect) return;
    
    // Check if bank already exists
    for (var i = 0; i < bankSelect.options.length; i++) {
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
    
    // Select the new bank
    bankSelect.value = bankName;
    
    console.log('Added ' + bankName + ' to dropdown with day count ' + dayCount);
  }

  function generateInvestmentCode(investmentType) {
    console.log('Generating investment code for:', investmentType);
    
    if (typeof google !== 'undefined' && google.script && google.script.run) {
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
    } else {
      // Fallback for testing
      const field = document.getElementById('investmentCode');
      if (field) {
        const prefix = investmentType.substring(0, 4).toUpperCase();
        const timestamp = Date.now().toString().slice(-5);
        field.value = prefix + timestamp;
      }
    }
  }

  // ============================================
  // CALCULATIONS WITH DAY COUNT
  // ============================================

  window.calculateMaturityDate = function() {
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
    if (maturityDateField) maturityDateField.value = year + '-' + month + '-' + day;
    calculateMaturityAmount();
  };

  window.calculateMaturityAmount = function() {
    const amountField = document.getElementById('amount');
    const interestRateField = document.getElementById('interestRate');
    const durationField = document.getElementById('duration');
    const bankSelect = document.getElementById('bankName');
    
    if (!amountField || !interestRateField || !durationField) return;
    
    const amount = parseFloat(amountField.value) || 0;
    const interestRate = parseFloat(interestRateField.value) || 0;
    const duration = parseInt(durationField.value) || 0;
    
    // Get day count from selected bank or use default
    let dayCount = 365;
    const selectedBank = bankSelect ? bankSelect.value : '';
    if (selectedBank && selectedBank !== 'add-new' && selectedBank !== '') {
      dayCount = getBankDayCount(selectedBank);
    }

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
    const maturityAmountValue = amount + interestAmount;

    if (interestAmountField) interestAmountField.value = formatCurrency(interestAmount);
    if (maturityAmountField) maturityAmountField.value = formatCurrency(maturityAmountValue);
  };

  // ============================================
  // SUBMIT NEW INVESTMENT
  // ============================================

  window.submitNewInvestment = function() {
    let investmentType = document.getElementById('investmentType').value;
    const investmentCode = document.getElementById('investmentCode').value;
    let bankName = document.getElementById('bankName').value;
    const amount = document.getElementById('amount').value;
    const interestRate = document.getElementById('interestRate').value;
    const duration = document.getElementById('duration').value;
    const investmentDate = document.getElementById('investmentDate').value;
    const maturityDate = document.getElementById('maturityDate').value;
    let dayCount = 365;

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
      dayCount = parseInt(newBankDayCount);
      isNewBank = true;
    } else {
      // Get day count for existing bank
      dayCount = getBankDayCount(bankName);
    }

    if (!bankName || bankName === '' || bankName === 'add-new') {
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
      addNewBankToDropdown(bankName, dayCount);
    }

    // Calculate final amounts with day count
    const timeInYears = parseInt(duration) / dayCount;
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
      dayCount: dayCount
    };

    console.log('Submitting investment data:', investmentData);

    if (typeof google !== 'undefined' && google.script && google.script.run) {
      google.script.run
        .withSuccessHandler(function(response) {
          console.log('Success response:', response);
          hideInvestmentLoadingModal();
          if (response && response.success) {
            showInvestmentMessage('✓ Investment added successfully!', 'success');
            setTimeout(function() {
              resetInvestmentForm();
              // Refresh bank list after adding new investment
              loadBanksFromSheet();
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
    } else {
      // Fallback for testing
      hideInvestmentLoadingModal();
      showInvestmentMessage('✓ Investment added successfully! (Demo)', 'success');
      setTimeout(function() {
        resetInvestmentForm();
      }, 1500);
    }
  };

  // ============================================
  // RESET FORM
  // ============================================

  window.resetInvestmentForm = function() {
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
  };

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

  function showInvestmentMessage(message, type) {
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
    
    setTimeout(function() {
      if (modal) modal.style.display = 'none';
    }, 3000);
  }

  window.closeInvestmentModal = function() {
    const modal = document.getElementById('messageModal');
    if (modal) modal.style.display = 'none';
  };

  function showInvestmentLoadingModal(message) {
    message = message || 'Adding Investment...';
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

  // Export additional functions for global use
  window.generateInvestmentCode = generateInvestmentCode;
  window.calculateMaturityDate = window.calculateMaturityDate;
  window.calculateMaturityAmount = window.calculateMaturityAmount;
  
})();
