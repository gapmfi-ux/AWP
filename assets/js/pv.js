/* ============================================
   PAYMENT VOUCHER MODULE JAVASCRIPT
   Fixed: Shows ALL saved vouchers (removed 5-item limit)
   ============================================ */

// Payment Voucher Module JavaScript
let lastSubmittedVoucherData = null;
let currentlyEditingPvNumber = null;
let nextPvNumber = null;

function updateVoucherTypeFields() {
  var voucherType = document.getElementById('voucherType').value;
  var bankField = document.getElementById('bankField');
  var chequeNumberField = document.getElementById('chequeNumberField');
  
  if (voucherType === 'Cheque Payment Voucher') {
    if (bankField) bankField.style.display = 'flex';
    if (chequeNumberField) chequeNumberField.style.display = 'flex';
  } else {
    if (bankField) bankField.style.display = 'none';
    if (chequeNumberField) chequeNumberField.style.display = 'none';
    var bankInput = document.getElementById('bank');
    var chequeInput = document.getElementById('chequeNumber');
    if (bankInput) bankInput.value = '';
    if (chequeInput) chequeInput.value = '';
  }
  
  fetchNextPVNumber(voucherType);
}

function showModal(html) {
  let modal = document.getElementById('loading-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'loading-modal';
    modal.className = 'modal';
    document.body.appendChild(modal);
  }
  modal.innerHTML = `<div class="modal-content" id="modal-message">${html}</div>`;
  modal.style.display = 'flex';
}

function hideModal() {
  const modal = document.getElementById('loading-modal');
  if (modal) modal.style.display = 'none';
}

function showLoading() {
  showModal('<div class="loader"></div><div>Processing your voucher, please wait...</div>');
}

function showSuccess(action = 'created') {
  showModal(
    '<div class="success-message">Voucher ' + action + ' successfully!</div>' +
    '<br><button class="download-button" style="background:#1976d2;margin-top:12px;" onclick="previewVoucherFromLast()">View & Print</button>' +
    '<br><button class="modal-close-button" onclick="hideModal(); resetFormAfterUpdate();">Close</button>'
  );
  
  setTimeout(function() {
    var voucherType = document.getElementById('voucherType');
    if (voucherType) fetchNextPVNumber(voucherType.value);
    if (action === 'created') {
      clearFormExceptPVDateType();
    }
    fetchPVTable();
  }, 500);
}

function showError(error) {
  showModal(
    '<div class="modal-error-message">Error: ' + (error.message || error) + '</div>' +
    '<button class="modal-close-button" onclick="hideModal()">Close</button>'
  );
}

function clearFormExceptPVDateType() {
  var ids = [
    'invoiceNo', 'invoiceDate', 'address',
    'payableTo', 'amount', 'transactionDetails',
    'bank', 'chequeNumber', 'accountCode',
    'requestedBy', 'reviewedBy', 'authorizedBy',
    'withholdingTaxAmount'
  ];
  ids.forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.value = '';
  });
  var deptSelect = document.getElementById('department');
  if (deptSelect) deptSelect.value = 'Accounts';
  var wtCheckbox = document.getElementById('withholdingTaxCheckbox');
  if (wtCheckbox) {
    wtCheckbox.checked = false;
    var wtField = document.getElementById('withholdingTaxAmount');
    if (wtField) {
      wtField.style.display = 'none';
      wtField.value = '';
    }
  }
}

function submitForm() {
  showLoading();
  const formObject = {
    voucherType: document.getElementById('voucherType').value,
    pvNumber: document.getElementById('pvNumber').value,
    date: document.getElementById('date').value,
    invoiceNo: document.getElementById('invoiceNo').value,
    invoiceDate: document.getElementById('invoiceDate').value,
    address: document.getElementById('address').value,
    payableTo: document.getElementById('payableTo').value,
    amount: document.getElementById('amount').value,
    department: document.getElementById('department').value,
    accountCode: document.getElementById('accountCode').value,
    transactionDetails: document.getElementById('transactionDetails').value,
    bank: document.getElementById('bank').value,
    chequeNumber: document.getElementById('chequeNumber').value,
    requestedBy: document.getElementById('requestedBy').value,
    reviewedBy: document.getElementById('reviewedBy').value,
    authorizedBy: document.getElementById('authorizedBy').value,
    withholdingTaxAmount: document.getElementById('withholdingTaxCheckbox').checked ? 
      document.getElementById('withholdingTaxAmount').value : null
  };
  formObject.amountInWords = convertNumberToWords(formObject.amount);
  lastSubmittedVoucherData = formObject;
  google.script.run
    .withSuccessHandler(function() { 
      showSuccess(); 
    })
    .withFailureHandler(function(error) { 
      showError(error); 
    })
    .processForm(formObject);
}

function fetchPVTable() {
  google.script.run
    .withSuccessHandler(function(data) {
      renderPVList('cash-payment-list', data['Cash Payment Voucher']);
      renderPVList('cheque-list', data['Cheque Payment Voucher']);
      renderPVList('payment-list', data['Payment Voucher']);
    })
    .withFailureHandler(function(error) {
      console.error('Error fetching PV table:', error);
    })
    .getPVNumbersByType();
}

function renderPVList(elementId, pvList) {
  const el = document.getElementById(elementId);
  if (!el) return;
  if (!pvList || !pvList.length) {
    el.innerHTML = '<div style="color:#aaa;">None</div>';
    return;
  }
  
  // FIXED: Show ALL vouchers, not just last 5
  const items = pvList.slice().reverse().map(item => {
    const match = item.pvNumber.match(/(PVNO\.[A-Z]{2})(\d+)/);
    let formattedPV = item.pvNumber;
    
    if (match) {
      const prefix = match[1];
      const num = match[2].padStart(5, '0');
      formattedPV = prefix + num;
    }
    
    return `<button class="pv-btn" onclick="openDropdownPortal(event, this, '${formattedPV}', '${item.voucherType}')">${formattedPV}</button>`;
  }).join('');
  
  el.innerHTML = items;
}

function openDropdownPortal(event, btn, pvNumber, voucherType) {
  closeDropdownPortal();
  const rect = btn.getBoundingClientRect();
  const portal = document.getElementById('pv-dropdown-portal');
  if (!portal) return;
  
  portal.innerHTML = `
    <div class="pv-dropdown-content-portal">
      <button class="dropdown-item" onclick="viewVoucher('${pvNumber}', '${voucherType}')">View</button>
      <button class="dropdown-item" onclick="editVoucher('${pvNumber}', '${voucherType}')">Edit</button>
    </div>
  `;
  
  portal.style.display = 'block';
  portal.style.position = 'fixed';
  portal.style.top = (rect.bottom + window.scrollY) + 'px';
  portal.style.left = (rect.left + window.scrollX) + 'px';
  portal.style.zIndex = '10000';
  
  window.__pvPortalOpen = true;
  event.stopPropagation();
}

function closeDropdownPortal() {
  const portal = document.getElementById('pv-dropdown-portal');
  if (portal) {
    portal.innerHTML = '';
    portal.style.display = 'none';
  }
  window.__pvPortalOpen = false;
}

function viewVoucher(pvNumber, voucherType) {
  closeDropdownPortal();
  showLoading();
  google.script.run
    .withSuccessHandler(function(voucherData) {
      hideModal();
      if (!voucherData || !voucherData.pvNumber) {
        alert('No voucher data found for PV Number: ' + pvNumber);
        return;
      }
      showVoucherPreview(voucherData);
    })
    .withFailureHandler(function(error) {
      hideModal();
      alert('Error loading voucher: ' + (error.message || error));
    })
    .getVoucherByNumber(pvNumber, voucherType);
}

function editVoucher(pvNumber, voucherType) {
  closeDropdownPortal();
  showLoading();
  
  currentlyEditingPvNumber = pvNumber;
  
  var pvDisplay = document.getElementById('pvNumberDisplay');
  if (pvDisplay) pvDisplay.textContent = pvNumber;
  
  google.script.run
    .withSuccessHandler(function(voucherData) {
      if (!voucherData || !voucherData.pvNumber) {
        hideModal();
        alert('No voucher data found for PV Number: ' + pvNumber);
        return;
      }
      populateFormForEditing(voucherData);
      fetchNextPVNumber(voucherData.voucherType);
      hideModal();
    })
    .withFailureHandler(function(error) {
      hideModal();
      alert('Error loading voucher for editing: ' + (error.message || error));
    })
    .getVoucherByNumber(pvNumber, voucherType);
}

function populateFormForEditing(voucherData) {
  var pvContainer = document.getElementById('pvNumber-container');
  var dateContainer = document.getElementById('date-container');
  if (pvContainer) pvContainer.style.display = 'flex';
  if (dateContainer) dateContainer.style.display = 'flex';
  
  var pvDisplay = document.getElementById('pvNumberDisplay');
  var pvNumberField = document.getElementById('pvNumber');
  if (pvDisplay) pvDisplay.textContent = voucherData.pvNumber || '';
  if (pvNumberField) pvNumberField.value = voucherData.pvNumber || '';
  
  var updateBtn = document.getElementById('updateButton');
  var submitBtn = document.querySelector('#pvForm .submit-button');
  if (updateBtn) updateBtn.style.display = 'block';
  if (submitBtn) submitBtn.style.display = 'none';
  
  var voucherType = document.getElementById('voucherType');
  var dateField = document.getElementById('date');
  var invoiceNo = document.getElementById('invoiceNo');
  var invoiceDate = document.getElementById('invoiceDate');
  var address = document.getElementById('address');
  var payableTo = document.getElementById('payableTo');
  var amount = document.getElementById('amount');
  var department = document.getElementById('department');
  var accountCode = document.getElementById('accountCode');
  var transactionDetails = document.getElementById('transactionDetails');
  var bank = document.getElementById('bank');
  var chequeNumber = document.getElementById('chequeNumber');
  var requestedBy = document.getElementById('requestedBy');
  var reviewedBy = document.getElementById('reviewedBy');
  var authorizedBy = document.getElementById('authorizedBy');
  
  if (voucherType) voucherType.value = voucherData.voucherType || '';
  if (dateField) dateField.value = voucherData.date || '';
  if (invoiceNo) invoiceNo.value = voucherData.invoiceNo || '';
  if (invoiceDate) invoiceDate.value = voucherData.invoiceDate || '';
  if (address) address.value = voucherData.address || '';
  if (payableTo) payableTo.value = voucherData.payableTo || '';
  if (amount) amount.value = voucherData.amount || '';
  if (department) department.value = voucherData.department || 'Accounts';
  if (accountCode) accountCode.value = voucherData.accountCode || '';
  if (transactionDetails) transactionDetails.value = voucherData.transactionDetails || '';
  if (bank) bank.value = voucherData.bank || '';
  if (chequeNumber) chequeNumber.value = voucherData.chequeNumber || '';
  if (requestedBy) requestedBy.value = voucherData.requestedBy || '';
  if (reviewedBy) reviewedBy.value = voucherData.reviewedBy || '';
  if (authorizedBy) authorizedBy.value = voucherData.authorizedBy || '';
  
  var wtCheckbox = document.getElementById('withholdingTaxCheckbox');
  var wtField = document.getElementById('withholdingTaxAmount');
  if (wtCheckbox && wtField) {
    if (voucherData.withholdingTaxAmount) {
      wtCheckbox.checked = true;
      wtField.value = voucherData.withholdingTaxAmount;
      wtField.style.display = 'block';
    } else {
      wtCheckbox.checked = false;
      wtField.value = '';
      wtField.style.display = 'none';
    }
  }
  
  updateVoucherTypeFields();
  
  var formContainer = document.querySelector('.form-container');
  if (formContainer) formContainer.scrollIntoView({ behavior: 'smooth' });
}

function updateForm() {
  showLoading();
  const formObject = {
    pvNumber: document.getElementById('pvNumber').value,
    voucherType: document.getElementById('voucherType').value,
    date: document.getElementById('date').value,
    invoiceNo: document.getElementById('invoiceNo').value,
    invoiceDate: document.getElementById('invoiceDate').value,
    address: document.getElementById('address').value,
    payableTo: document.getElementById('payableTo').value,
    amount: document.getElementById('amount').value,
    department: document.getElementById('department').value,
    accountCode: document.getElementById('accountCode').value,
    transactionDetails: document.getElementById('transactionDetails').value,
    bank: document.getElementById('bank').value,
    chequeNumber: document.getElementById('chequeNumber').value,
    requestedBy: document.getElementById('requestedBy').value,
    reviewedBy: document.getElementById('reviewedBy').value,
    authorizedBy: document.getElementById('authorizedBy').value,
    withholdingTaxAmount: document.getElementById('withholdingTaxCheckbox').checked ? 
      document.getElementById('withholdingTaxAmount').value : null
  };
  formObject.amountInWords = convertNumberToWords(formObject.amount);
  lastSubmittedVoucherData = formObject;
  
  google.script.run
    .withSuccessHandler(function() {
      showSuccess('updated');
      fetchPVTable();
    })
    .withFailureHandler(function(error) {
      showError(error);
    })
    .updateVoucher(formObject);
}

function resetFormAfterUpdate() {
  var updateBtn = document.getElementById('updateButton');
  var submitBtn = document.querySelector('#pvForm .submit-button');
  if (updateBtn) updateBtn.style.display = 'none';
  if (submitBtn) submitBtn.style.display = 'block';
  
  currentlyEditingPvNumber = null;
  
  clearFormExceptPVDateType();
  
  var pvDisplay = document.getElementById('pvNumberDisplay');
  if (pvDisplay && nextPvNumber) pvDisplay.textContent = nextPvNumber;
  
  var pvContainer = document.getElementById('pvNumber-container');
  var dateContainer = document.getElementById('date-container');
  if (pvContainer) pvContainer.style.display = 'none';
  if (dateContainer) dateContainer.style.display = 'none';
}

function fetchNextPVNumber(voucherType) {
  google.script.run
    .withSuccessHandler(function(pvNumber) {
      nextPvNumber = pvNumber;
      if (!currentlyEditingPvNumber) {
        var pvField = document.getElementById('pvNumber');
        var pvDisplay = document.getElementById('pvNumberDisplay');
        if (pvField) pvField.value = pvNumber;
        if (pvDisplay) pvDisplay.textContent = pvNumber;
      }
    })
    .withFailureHandler(function(error) {
      console.error('Error fetching next PV number:', error);
      const fallbackNumber = generateFallbackPVNumber(voucherType);
      if (!currentlyEditingPvNumber) {
        var pvField = document.getElementById('pvNumber');
        var pvDisplay = document.getElementById('pvNumberDisplay');
        if (pvField) pvField.value = fallbackNumber;
        if (pvDisplay) pvDisplay.textContent = fallbackNumber;
      }
    })
    .getNextPVNumber(voucherType);
}

function generateFallbackPVNumber(voucherType) {
  const prefixes = {
    'Payment Voucher': 'PVNO.FT',
    'Cash Payment Voucher': 'PVNO.CH',
    'Cheque Payment Voucher': 'PVNO.CQ'
  };
  const prefix = prefixes[voucherType] || 'PVNO';
  const timestamp = Date.now().toString().slice(-5);
  return prefix + timestamp.padStart(5, '0');
}

function showVoucherPreview(voucherData) {
  if (!voucherData || typeof voucherData !== 'object') {
    console.error('Invalid voucher data received:', voucherData);
    alert('Error: Invalid voucher data. Please try again.');
    return;
  }

  voucherData = voucherData || {};
  voucherData.voucherType = voucherData.voucherType || 'Payment Voucher';
  voucherData.pvNumber = voucherData.pvNumber || '';
  voucherData.date = voucherData.date || '';
  voucherData.payableTo = voucherData.payableTo || '';
  voucherData.address = voucherData.address || '';
  voucherData.department = voucherData.department || '';
  voucherData.accountCode = voucherData.accountCode || '';
  voucherData.invoiceDate = voucherData.invoiceDate || '';
  voucherData.invoiceNo = voucherData.invoiceNo || '';
  voucherData.amount = voucherData.amount || '';
  voucherData.amountInWords = voucherData.amountInWords || '';
  voucherData.transactionDetails = voucherData.transactionDetails || '';
  voucherData.bank = voucherData.bank || '';
  voucherData.chequeNumber = voucherData.chequeNumber || '';
  voucherData.requestedBy = voucherData.requestedBy || '';
  voucherData.reviewedBy = voucherData.reviewedBy || '';
  voucherData.authorizedBy = voucherData.authorizedBy || '';
  voucherData.withholdingTaxAmount = voucherData.withholdingTaxAmount || '';

  const typeHeading = {
    'Payment Voucher': 'FUNDS TRANSFER PAYMENT VOUCHER',
    'Cash Payment Voucher': 'CASH PAYMENT VOUCHER',
    'Cheque Payment Voucher': 'CHEQUE DISBURSEMENT PAYMENT VOUCHER'
  };

  var voucherTypeHeading = document.getElementById('voucherTypeHeading');
  if (voucherTypeHeading) {
    voucherTypeHeading.innerHTML = `<b>${typeHeading[voucherData.voucherType] || 'PAYMENT VOUCHER'}</b>`;
  }

  var chequeFields = document.getElementById('preview-cheque-fields');
  if (chequeFields) {
    if (voucherData.voucherType === 'Cheque Payment Voucher') {
      chequeFields.style.display = 'flex';
      var previewBank = document.getElementById('preview-bank');
      var previewCheque = document.getElementById('preview-chequeNumber');
      if (previewBank) previewBank.textContent = voucherData.bank;
      if (previewCheque) previewCheque.textContent = voucherData.chequeNumber;
    } else {
      chequeFields.style.display = 'none';
    }
  }

  var withholdingTaxRow = document.getElementById('preview-withholdingTax-row');
  if (withholdingTaxRow) {
    if (voucherData.withholdingTaxAmount) {
      withholdingTaxRow.style.display = 'flex';
      var previewTax = document.getElementById('preview-withholdingTax');
      if (previewTax) previewTax.textContent = voucherData.withholdingTaxAmount;
    } else {
      withholdingTaxRow.style.display = 'none';
    }
  }

  var previewPvNumber = document.getElementById('preview-pvNumber');
  var previewPayableTo = document.getElementById('preview-payableTo');
  var previewDate = document.getElementById('preview-date');
  var previewAddress = document.getElementById('preview-address');
  var previewDepartment = document.getElementById('preview-department');
  var previewAccountCode = document.getElementById('preview-accountCode');
  var previewInvoiceDate = document.getElementById('preview-invoiceDate');
  var previewInvoiceNo = document.getElementById('preview-invoiceNo');
  var previewAmount = document.getElementById('preview-amount');
  var previewAmountInWords = document.getElementById('preview-amountInWords');
  var previewTransactionDetails = document.getElementById('preview-transactionDetails');
  var previewRequestedBy = document.getElementById('preview-requestedBy');
  var previewReviewedBy = document.getElementById('preview-reviewedBy');
  var previewAuthorizedBy = document.getElementById('preview-authorizedBy');
  
  if (previewPvNumber) previewPvNumber.textContent = voucherData.pvNumber;
  if (previewPayableTo) previewPayableTo.textContent = voucherData.payableTo;
  if (previewDate) previewDate.textContent = voucherData.date;
  if (previewAddress) previewAddress.textContent = voucherData.address;
  if (previewDepartment) previewDepartment.textContent = voucherData.department;
  if (previewAccountCode) previewAccountCode.textContent = voucherData.accountCode;
  if (previewInvoiceDate) previewInvoiceDate.textContent = voucherData.invoiceDate;
  if (previewInvoiceNo) previewInvoiceNo.textContent = voucherData.invoiceNo;
  
  if (previewAmount) {
    const amountNum = parseFloat(voucherData.amount);
    previewAmount.textContent = amountNum.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      useGrouping: true
    });
  }
  
  if (previewAmountInWords) previewAmountInWords.textContent = voucherData.amountInWords;
  if (previewTransactionDetails) previewTransactionDetails.textContent = voucherData.transactionDetails;
  if (previewRequestedBy) previewRequestedBy.textContent = voucherData.requestedBy;
  if (previewReviewedBy) previewReviewedBy.textContent = voucherData.reviewedBy;
  if (previewAuthorizedBy) previewAuthorizedBy.textContent = voucherData.authorizedBy;
  
  var previewReceivedBy = document.getElementById('preview-receivedBy');
  if (previewReceivedBy) previewReceivedBy.textContent = '';
  
  var voucherModal = document.getElementById('voucher-preview-modal');
  if (voucherModal) voucherModal.style.display = 'block';
}

function closeVoucherModal() {
  var voucherModal = document.getElementById('voucher-preview-modal');
  if (voucherModal) voucherModal.style.display = 'none';
}

function previewVoucherFromLast() {
  if (!lastSubmittedVoucherData) {
    alert("No voucher data to preview.");
    return;
  }
  hideModal();
  showVoucherPreview(lastSubmittedVoucherData);
}

function printVoucher() {
  var actions = document.querySelector('.modal-actions');
  if (actions) actions.style.display = 'none';
  window.print();
  setTimeout(() => {
    if (actions) actions.style.display = 'flex';
  }, 500);
}

function convertNumberToWords(amount) {
  if (!amount || isNaN(amount)) return '';
  var amt = parseFloat(amount).toFixed(2);
  var parts = amt.split('.');
  var cedis = parseInt(parts[0], 10);
  var pesewas = parseInt(parts[1], 10);
  var ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  var teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  var tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  var thousands = ['', 'Thousand', 'Million', 'Billion'];
  
  function chunkToWords(n) {
    let str = '';
    if (n >= 100) {
      str += ones[Math.floor(n / 100)] + ' Hundred';
      n %= 100;
      if (n > 0) str += ' and ';
      else str += ' ';
    }
    if (n >= 10 && n < 20) {
      str += teens[n - 10] + ' ';
    } else if (n >= 20 || n === 10) {
      str += tens[Math.floor(n / 10)] + ' ';
      n %= 10;
    }
    if (n > 0 && n < 10) {
      str += ones[n] + ' ';
    }
    return str.trim();
  }
  
  let wordChunks = [];
  let chunkCount = 0;
  let tempCedis = cedis;
  while (tempCedis > 0) {
    let chunk = tempCedis % 1000;
    if (chunk > 0) {
      let chunkWord = chunkToWords(chunk);
      if (chunkWord) {
        chunkWord += thousands[chunkCount] ? ' ' + thousands[chunkCount] : '';
        wordChunks.unshift(chunkWord.trim());
      }
    }
    tempCedis = Math.floor(tempCedis / 1000);
    chunkCount++;
  }
  
  if (wordChunks.length > 1 && wordChunks[wordChunks.length - 1].startsWith('and ')) {
    wordChunks[wordChunks.length - 1] = wordChunks[wordChunks.length - 1].replace(/^and /, '');
  }
  if (wordChunks.length === 1 && wordChunks[0].startsWith('and ')) {
    wordChunks[0] = wordChunks[0].replace(/^and /, '');
  }
  
  let cedisStr = wordChunks.length ? wordChunks.join(' ') + (cedis === 1 ? ' Ghana Cedi' : ' Ghana Cedis') : '';
  let pesewasStr = '';
  if (pesewas > 0) {
    let pesewaWords = chunkToWords(pesewas);
    pesewasStr = (cedisStr ? ' and ' : '') + pesewaWords + (pesewas === 1 ? ' Pesewa' : ' Pesewas');
  }
  return (cedisStr + pesewasStr).trim();
}

function toggleWithholdingTax() {
  const checkbox = document.getElementById('withholdingTaxCheckbox');
  const taxField = document.getElementById('withholdingTaxAmount');
  if (checkbox && taxField) {
    taxField.style.display = checkbox.checked ? 'block' : 'none';
    if (!checkbox.checked) {
      taxField.value = '';
    }
  }
}

function initPVModule() {
  const today = new Date().toISOString().split('T')[0];
  var dateField = document.getElementById('date');
  if (dateField) dateField.value = today;
  updateVoucherTypeFields();
  fetchPVTable();
}

window.addEventListener('click', function(event) {
  var voucherModal = document.getElementById('voucher-preview-modal');
  var loadingModal = document.getElementById('loading-modal');
  
  if (event.target === voucherModal) {
    closeVoucherModal();
  }
  if (event.target === loadingModal) {
    hideModal();
  }
  if (window.__pvPortalOpen) {
    const portal = document.getElementById('pv-dropdown-portal');
    if (portal && !portal.contains(event.target) && !event.target.classList.contains('pv-btn')) {
      closeDropdownPortal();
    }
  }
});

document.addEventListener('click', function(event) {
  var portal = document.getElementById('pv-dropdown-portal');
  if (portal && portal.contains(event.target)) {
    event.stopPropagation();
  }
});

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPVModule);
} else {
  initPVModule();
}
