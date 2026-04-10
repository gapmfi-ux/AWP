/* ============================================
   PAYMENT VOUCHER MODULE JAVASCRIPT
   ============================================ */

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
  modal.innerHTML = `<div class="modal-content">${html}</div>`;
  modal.style.display = 'flex';
}

function hideModal() {
  const modal = document.getElementById('loading-modal');
  if (modal) modal.style.display = 'none';
}

function showLoading() {
  showModal('<div class="loader"></div><div>Processing your voucher, please wait...</div>');
}

function showSuccess(action) {
  showModal(
    '<div class="success-message">✓ Voucher ' + action + ' successfully!</div>' +
    '<button class="download-button" onclick="previewVoucherFromLast(); hideModal();">View & Print</button>' +
    '<button class="modal-close-button" onclick="hideModal(); resetFormAfterUpdate();" style="margin-left: 10px;">Close</button>'
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
    '<div class="modal-error-message">✗ Error: ' + (error.message || error) + '</div>' +
    '<button class="modal-close-button" onclick="hideModal()">Close</button>'
  );
}

function clearFormExceptPVDateType() {
  var ids = [
    'invoiceNo', 'invoiceDate', 'address', 'payableTo', 'amount', 
    'transactionDetails', 'bank', 'chequeNumber', 'accountCode',
    'requestedBy', 'reviewedBy', 'authorizedBy', 'withholdingTaxAmount'
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
    .withSuccessHandler(function() { showSuccess('created'); })
    .withFailureHandler(function(error) { showError(error); })
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
    el.innerHTML = '<div style="color:#aaa; text-align:center; padding:8px;">None</div>';
    return;
  }
  
  const items = pvList.slice(-5).reverse().map(item => {
    return `<button class="pv-btn" onclick="openDropdownPortal(event, this, '${item.pvNumber}', '${item.voucherType}')">📄 ${item.pvNumber}</button>`;
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
      <button class="dropdown-item" onclick="viewVoucher('${pvNumber}', '${voucherType}')">👁 View</button>
      <button class="dropdown-item" onclick="editVoucher('${pvNumber}', '${voucherType}')">✏ Edit</button>
    </div>
  `;
  
  portal.style.display = 'block';
  portal.style.top = (rect.bottom + window.scrollY) + 'px';
  portal.style.left = (rect.left + window.scrollX) + 'px';
  
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
  
  document.getElementById('voucherType').value = voucherData.voucherType || '';
  document.getElementById('date').value = voucherData.date || '';
  document.getElementById('invoiceNo').value = voucherData.invoiceNo || '';
  document.getElementById('invoiceDate').value = voucherData.invoiceDate || '';
  document.getElementById('address').value = voucherData.address || '';
  document.getElementById('payableTo').value = voucherData.payableTo || '';
  document.getElementById('amount').value = voucherData.amount || '';
  document.getElementById('department').value = voucherData.department || 'Accounts';
  document.getElementById('accountCode').value = voucherData.accountCode || '';
  document.getElementById('transactionDetails').value = voucherData.transactionDetails || '';
  document.getElementById('bank').value = voucherData.bank || '';
  document.getElementById('chequeNumber').value = voucherData.chequeNumber || '';
  document.getElementById('requestedBy').value = voucherData.requestedBy || '';
  document.getElementById('reviewedBy').value = voucherData.reviewedBy || '';
  document.getElementById('authorizedBy').value = voucherData.authorizedBy || '';
  
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
  document.querySelector('.form-container').scrollIntoView({ behavior: 'smooth' });
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
    })
    .getNextPVNumber(voucherType);
}

function showVoucherPreview(voucherData) {
  if (!voucherData || typeof voucherData !== 'object') {
    alert('Error: Invalid voucher data.');
    return;
  }
  
  var typeMap = {
    'Payment Voucher': 'FUNDS TRANSFER VOUCHER',
    'Cash Payment Voucher': 'CASH PAYMENT VOUCHER',
    'Cheque Payment Voucher': 'CHEQUE DISBURSEMENT PAYMENT VOUCHER'
  };
  
  document.getElementById('voucherTypeHeading').innerHTML = typeMap[voucherData.voucherType] || 'PAYMENT VOUCHER';
  document.getElementById('preview-pvNumber').innerHTML = voucherData.pvNumber || '';
  document.getElementById('preview-payableTo').innerHTML = voucherData.payableTo || '';
  document.getElementById('preview-date').innerHTML = voucherData.date || '';
  document.getElementById('preview-address').innerHTML = voucherData.address || '';
  document.getElementById('preview-department').innerHTML = voucherData.department || '';
  document.getElementById('preview-accountCode').innerHTML = voucherData.accountCode || '';
  document.getElementById('preview-invoiceNo').innerHTML = voucherData.invoiceNo || '';
  document.getElementById('preview-invoiceDate').innerHTML = voucherData.invoiceDate || '';
  
  var amount = parseFloat(voucherData.amount) || 0;
  document.getElementById('preview-amount').innerHTML = 'GHS ' + amount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
  document.getElementById('preview-amountInWords').innerHTML = voucherData.amountInWords || convertNumberToWords(voucherData.amount);
  document.getElementById('preview-transactionDetails').innerHTML = voucherData.transactionDetails || '';
  document.getElementById('preview-requestedBy').innerHTML = voucherData.requestedBy || '________';
  document.getElementById('preview-reviewedBy').innerHTML = voucherData.reviewedBy || '________';
  document.getElementById('preview-authorizedBy').innerHTML = voucherData.authorizedBy || '________';
  document.getElementById('preview-receivedBy').innerHTML = '';
  
  // Withholding Tax
  var wtRow = document.getElementById('preview-withholdingTax-row');
  var wtValue = document.getElementById('preview-withholdingTax');
  if (voucherData.withholdingTaxAmount && voucherData.withholdingTaxAmount > 0) {
    wtRow.style.display = 'flex';
    wtValue.innerHTML = 'GHS ' + parseFloat(voucherData.withholdingTaxAmount).toFixed(2);
  } else {
    wtRow.style.display = 'none';
  }
  
  // Bank and Cheque fields - separate grid items
  var bankField = document.getElementById('preview-bank-field');
  var chequeField = document.getElementById('preview-cheque-field');
  var bankValue = document.getElementById('preview-bank');
  var chequeValue = document.getElementById('preview-chequeNumber');
  
  if (voucherData.voucherType === 'Cheque Payment Voucher') {
    if (bankField) {
      bankField.style.display = 'flex';
      if (bankValue) bankValue.innerHTML = voucherData.bank || '';
    }
    if (chequeField) {
      chequeField.style.display = 'flex';
      if (chequeValue) chequeValue.innerHTML = voucherData.chequeNumber || '';
    }
  } else {
    if (bankField) bankField.style.display = 'none';
    if (chequeField) chequeField.style.display = 'none';
  }
  
  document.getElementById('voucher-preview-modal').style.display = 'block';
}

function closeVoucherModal() {
  document.getElementById('voucher-preview-modal').style.display = 'none';
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
  setTimeout(function() {
    if (actions) actions.style.display = 'flex';
  }, 500);
}

function convertNumberToWords(amount) {
  if (!amount || isNaN(amount)) return '';
  var num = parseFloat(amount).toFixed(2);
  var parts = num.split('.');
  var cedis = parseInt(parts[0], 10);
  var pesewas = parseInt(parts[1], 10);
  
  var ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  var teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  var tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  var thousands = ['', 'Thousand', 'Million', 'Billion'];
  
  function convertChunk(n) {
    if (n === 0) return '';
    var str = '';
    if (n >= 100) {
      str += ones[Math.floor(n / 100)] + ' Hundred';
      n %= 100;
      if (n > 0) str += ' and ';
    }
    if (n >= 20) {
      str += tens[Math.floor(n / 10)];
      if (n % 10 > 0) str += ' ' + ones[n % 10];
    } else if (n >= 10) {
      str += teens[n - 10];
    } else if (n > 0) {
      str += ones[n];
    }
    return str.trim();
  }
  
  var cedisStr = '';
  if (cedis === 0) {
    cedisStr = 'Zero';
  } else {
    var tempCedis = cedis;
    var chunks = [];
    var chunkIndex = 0;
    while (tempCedis > 0) {
      var chunk = tempCedis % 1000;
      if (chunk > 0) {
        var chunkWord = convertChunk(chunk);
        if (thousands[chunkIndex]) chunkWord += ' ' + thousands[chunkIndex];
        chunks.unshift(chunkWord);
      }
      tempCedis = Math.floor(tempCedis / 1000);
      chunkIndex++;
    }
    cedisStr = chunks.join(' ');
  }
  
  cedisStr += (cedis === 1 ? ' Ghana Cedi' : ' Ghana Cedis');
  
  var pesewasStr = '';
  if (pesewas > 0) {
    pesewasStr = ' and ' + convertChunk(pesewas) + (pesewas === 1 ? ' Pesewa' : ' Pesewas');
  }
  
  return cedisStr + pesewasStr;
}

function toggleWithholdingTax() {
  var checkbox = document.getElementById('withholdingTaxCheckbox');
  var taxField = document.getElementById('withholdingTaxAmount');
  if (checkbox && taxField) {
    taxField.style.display = checkbox.checked ? 'block' : 'none';
    if (!checkbox.checked) taxField.value = '';
  }
}

function initPVModule() {
  var today = new Date().toISOString().split('T')[0];
  var dateField = document.getElementById('date');
  if (dateField) dateField.value = today;
  updateVoucherTypeFields();
  fetchPVTable();
}

// Event Listeners
window.addEventListener('click', function(event) {
  var voucherModal = document.getElementById('voucher-preview-modal');
  var loadingModal = document.getElementById('loading-modal');
  if (event.target === voucherModal) closeVoucherModal();
  if (event.target === loadingModal) hideModal();
  if (window.__pvPortalOpen) {
    var portal = document.getElementById('pv-dropdown-portal');
    if (portal && !portal.contains(event.target) && !event.target.classList.contains('pv-btn')) {
      closeDropdownPortal();
    }
  }
});

document.addEventListener('click', function(event) {
  var portal = document.getElementById('pv-dropdown-portal');
  if (portal && portal.contains(event.target)) event.stopPropagation();
});
