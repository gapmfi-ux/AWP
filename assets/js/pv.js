// ---------- DATA & GLOBAL ----------
let vouchersDB = [];
let editingId = null;

function generatePVNumber(type) {
    let prefix = (type === "Cash Payment Voucher") ? "PV-CSH" : (type === "Cheque Payment Voucher") ? "PV-CHQ" : "PV-FT";
    let seq = (vouchersDB.length + 1).toString().padStart(4,'0');
    return `${prefix}${seq}`;
}

function refreshSavedLists() {
    const cashList = vouchersDB.filter(v => v.voucherType === "Cash Payment Voucher");
    const chequeList = vouchersDB.filter(v => v.voucherType === "Cheque Payment Voucher");
    const fundsList = vouchersDB.filter(v => v.voucherType === "Payment Voucher");
    const render = (arr, id) => { let container = document.getElementById(id); if(!container) return; if(!arr.length) { container.innerHTML = "<div style='padding:8px;color:#aaa;text-align:center;'>— none —</div>"; return; } container.innerHTML = arr.map(v => `<button class="pv-btn" onclick='editVoucher("${v.id}")'>📄 ${v.pvNumber} - ${v.payableTo.substring(0,18)}</button>`).join(''); };
    render(cashList, "cash-payment-list");
    render(chequeList, "cheque-list");
    render(fundsList, "payment-list");
}

function getFormObject() {
    return {
        id: editingId || crypto.randomUUID(),
        pvNumber: document.getElementById('pvNumberDisplay').innerText,
        voucherType: document.getElementById('voucherType').value,
        date: document.getElementById('date')?.value || new Date().toISOString().split('T')[0],
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
        withholdingTaxEnabled: document.getElementById('withholdingTaxCheckbox').checked,
        withholdingTaxAmount: document.getElementById('withholdingTaxCheckbox').checked ? document.getElementById('withholdingTaxAmount').value : null,
    };
}

function populateForm(data) {
    document.getElementById('voucherType').value = data.voucherType;
    document.getElementById('invoiceNo').value = data.invoiceNo || '';
    document.getElementById('invoiceDate').value = data.invoiceDate || '';
    document.getElementById('address').value = data.address || '';
    document.getElementById('payableTo').value = data.payableTo || '';
    document.getElementById('amount').value = data.amount || '';
    document.getElementById('department').value = data.department || 'Accounts';
    document.getElementById('accountCode').value = data.accountCode || '';
    document.getElementById('transactionDetails').value = data.transactionDetails || '';
    document.getElementById('bank').value = data.bank || '';
    document.getElementById('chequeNumber').value = data.chequeNumber || '';
    document.getElementById('requestedBy').value = data.requestedBy || '';
    document.getElementById('reviewedBy').value = data.reviewedBy || '';
    document.getElementById('authorizedBy').value = data.authorizedBy || '';
    document.getElementById('withholdingTaxCheckbox').checked = data.withholdingTaxEnabled === true;
    toggleTaxField();
    if(data.withholdingTaxEnabled) document.getElementById('withholdingTaxAmount').value = data.withholdingTaxAmount || '';
    document.getElementById('pvNumberDisplay').innerText = data.pvNumber;
    updateConditionalFields();
    if(document.getElementById('date')) document.getElementById('date').value = data.date || new Date().toISOString().split('T')[0];
}

if(!document.getElementById('date')) { let d = document.createElement('input'); d.type='date'; d.id='date'; d.style.display='none'; document.body.appendChild(d); }
document.getElementById('date').value = new Date().toISOString().split('T')[0];

function saveNewVoucher() {
    let fd = getFormObject();
    if(!fd.payableTo.trim() || !fd.amount) { alert("Payable To & Amount required"); return; }
    fd.pvNumber = generatePVNumber(fd.voucherType);
    document.getElementById('pvNumberDisplay').innerText = fd.pvNumber;
    fd.id = crypto.randomUUID();
    fd.date = document.getElementById('date').value;
    vouchersDB.push(fd);
    refreshSavedLists();
    showToast("✅ Saved: " + fd.pvNumber);
    resetEditingMode();
}

function editVoucher(id) { let v=vouchersDB.find(v=>v.id===id); if(v){ editingId=id; populateForm(v); document.getElementById('mainSubmitBtn').style.display='none'; document.getElementById('updateButton').style.display='block'; showToast("Editing "+v.pvNumber); } }
function performUpdate() { if(editingId){ let upd=getFormObject(); upd.id=editingId; upd.pvNumber=document.getElementById('pvNumberDisplay').innerText; upd.date=document.getElementById('date').value; let idx=vouchersDB.findIndex(v=>v.id===editingId); if(idx!==-1){ vouchersDB[idx]=upd; refreshSavedLists(); showToast("✅ Updated"); } resetEditingMode(); } }
function resetEditingMode() { editingId=null; document.getElementById('mainSubmitBtn').style.display='block'; document.getElementById('updateButton').style.display='none'; document.getElementById('pvForm').reset(); document.getElementById('pvNumberDisplay').innerText="PVNO.AUTO001"; document.getElementById('withholdingTaxCheckbox').checked=false; toggleTaxField(); updateConditionalFields(); document.getElementById('date').value=new Date().toISOString().split('T')[0]; }
function handleSubmitOrUpdate() { editingId ? performUpdate() : saveNewVoucher(); }

function loadDemoData() {
    resetEditingMode();
    document.getElementById('voucherType').value = 'Cheque Payment Voucher';
    document.getElementById('department').value = 'Finance';
    document.getElementById('accountCode').value = 'FIN-8872';
    document.getElementById('invoiceNo').value = 'INV-DEMO42';
    document.getElementById('invoiceDate').value = '2026-04-10';
    document.getElementById('address').value = '15 Ridge Road, Accra';
    document.getElementById('payableTo').value = 'Swift Logistics Ltd';
    document.getElementById('amount').value = '9850.00';
    document.getElementById('transactionDetails').value = 'Freight & custom clearance services';
    document.getElementById('requestedBy').value = 'Janet Osei';
    document.getElementById('reviewedBy').value = 'Michael Tetteh';
    document.getElementById('authorizedBy').value = 'Dr. Nana Addo';
    document.getElementById('bank').value = 'Stanbic Bank';
    document.getElementById('chequeNumber').value = 'CHQ-214567';
    updateConditionalFields();
    showToast("✅ Demo data ready (Cheque Voucher)");
}

function quickPrintChequeDemo() {
    let demo = { voucherType:'Cheque Payment Voucher', pvNumber:'PV-CHQ-DEMO', date:new Date().toISOString().split('T')[0], invoiceNo:'DEMO/24', invoiceDate:'2026-04-10', address:'Accra Digital Centre', payableTo:'DEMO ENTERPRISE', amount:'12500.50', department:'Operations', accountCode:'OP-998', transactionDetails:'DEMO: Procurement of IT equipment', bank:'GCB Bank', chequeNumber:'GCB-998877', requestedBy:'Felix Asare', reviewedBy:'Grace Mensah', authorizedBy:'Dr. Kofi Boateng', withholdingTaxEnabled:true, withholdingTaxAmount:'1250.05' };
    demo.amountInWords = convertNumberToWords(demo.amount);
    showVoucherPreview(demo);
}

function previewCurrentForm() {
    let f = getFormObject();
    if(!f.payableTo) { alert("Enter Payable To"); return; }
    if(!f.amount) { alert("Enter Amount"); return; }
    f.date = document.getElementById('date').value;
    if(f.pvNumber === "PVNO.AUTO001") f.pvNumber = generatePVNumber(f.voucherType);
    f.amountInWords = convertNumberToWords(f.amount);
    showVoucherPreview(f);
}

function showVoucherPreview(vd) {
    const typeMap = {'Payment Voucher':'FUNDS TRANSFER VOUCHER','Cash Payment Voucher':'CASH PAYMENT VOUCHER','Cheque Payment Voucher':'CHEQUE DISBURSEMENT PAYMENT VOUCHER'};
    document.getElementById('voucherTypeHeading').innerText = typeMap[vd.voucherType] || 'PAYMENT VOUCHER';
    document.getElementById('preview-pvNumber').innerText = vd.pvNumber;
    document.getElementById('preview-payableTo').innerText = vd.payableTo;
    document.getElementById('preview-date').innerText = vd.date;
    document.getElementById('preview-address').innerText = vd.address;
    document.getElementById('preview-department').innerText = vd.department;
    document.getElementById('preview-accountCode').innerText = vd.accountCode;
    document.getElementById('preview-invoiceNo').innerText = vd.invoiceNo || '—';
    document.getElementById('preview-invoiceDate').innerText = vd.invoiceDate || '—';
    document.getElementById('preview-amount').innerHTML = `GHS ${parseFloat(vd.amount).toLocaleString()}`;
    document.getElementById('preview-amountInWords').innerText = vd.amountInWords;
    document.getElementById('preview-transactionDetails').innerText = vd.transactionDetails;
    document.getElementById('preview-requestedBy').innerText = vd.requestedBy || '________';
    document.getElementById('preview-reviewedBy').innerText = vd.reviewedBy || '________';
    document.getElementById('preview-authorizedBy').innerText = vd.authorizedBy || '________';
    document.getElementById('preview-receivedBy').innerText = '';
    if(vd.withholdingTaxEnabled && vd.withholdingTaxAmount) {
        document.getElementById('withholdingPreviewRow').style.display = 'flex';
        document.getElementById('preview-withholdingTax').innerText = `GHS ${parseFloat(vd.withholdingTaxAmount).toFixed(2)}`;
    } else { document.getElementById('withholdingPreviewRow').style.display = 'none'; }
    if(vd.voucherType === 'Cheque Payment Voucher') {
        document.getElementById('chequePreviewFields').style.display = 'flex';
        document.getElementById('preview-bank').innerText = vd.bank || 'N/A';
        document.getElementById('preview-chequeNumber').innerText = vd.chequeNumber || 'N/A';
    } else { document.getElementById('chequePreviewFields').style.display = 'none'; }
    document.getElementById('voucher-preview-modal').style.display = 'block';
}

function printVoucherPerfect() {
    const originalContent = document.getElementById('voucher-print');
    const cloneContent = originalContent.cloneNode(true);
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Payment Voucher</title>
            <meta charset="UTF-8">
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                @page { size: A4; margin: 0mm; }
                body { font-family: 'Inter', 'Segoe UI', Arial, sans-serif; background: white; margin: 0; padding: 0; }
                .voucher-page { max-width: 100%; background: white; padding: 12mm 10mm; border: none; }
                .voucher-header { text-align: center; margin-bottom: 18px; }
                .voucher-title { font-size: 20px; font-weight: 800; color: #0b3b5f; }
                .voucher-type { font-size: 12px; font-weight: 800; background: #e9f1f9; display: inline-block; padding: 4px 24px; border-radius: 40px; margin-top: 6px; }
                .voucher-row { display: flex; flex-wrap: wrap; margin-bottom: 18px; align-items: baseline; width: 100%; }
                .voucher-row-spaced { margin-bottom: 24px; }
                .half-width { width: 48%; min-width: 200px; }
                .full-width { width: 100%; }
                .label-text { font-weight: 700; min-width: 125px; font-size: 11px; color: #1f3a4b; }
                .dots-line { flex: 1; border-bottom: 1px dotted #2c3e50; margin: 0 8px; height: 1.2em; }
                .input-value { font-size: 11.5px; font-weight: 500; color: #000; border-bottom: 1px dotted #2c3e50; padding-bottom: 2px; display: inline-block; min-width: 130px; }
                .signature-section { margin-top: 28px; border-top: 1px dashed #b9d0e5; padding-top: 20px; }
                .sig-headers { display: flex; justify-content: space-between; margin-bottom: 16px; padding-bottom: 6px; border-bottom: 1px solid #cbdde9; }
                .sig-header-name, .sig-header-signature, .sig-header-date { font-weight: 800; font-size: 10px; text-transform: uppercase; color: #2c5282; }
                .sig-header-name { flex: 1; text-align: left; margin-left: 120px; }
                .sig-header-signature { flex: 1; text-align: center; }
                .sig-header-date { flex: 1; text-align: center; }
                .sig-row-item { display: flex; align-items: center; margin-bottom: 24px; gap: 12px; flex-wrap: wrap; }
                .sig-role { min-width: 120px; font-weight: 800; font-size: 11px; color: #1e3a5f; }
                .sig-name-field { flex: 1; border-bottom: 1px dotted #2d3748; min-height: 28px; position: relative; }
                .sig-name-text { position: absolute; bottom: 2px; left: 5px; font-size: 10px; font-weight: 500; }
                .sig-dotted-col { flex: 1; border-bottom: 1px dotted #2d3748; margin: 0 4px; min-height: 28px; position: relative; }
                .placeholder-text { position: absolute; bottom: 2px; left: 6px; font-size: 8px; color: #94a3b8; font-style: italic; }
            </style>
        </head>
        <body>${cloneContent.outerHTML}</body>
        </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
}

function closeVoucherModal() { document.getElementById('voucher-preview-modal').style.display = 'none'; }
function updateConditionalFields() { let type=document.getElementById('voucherType').value; let b=document.getElementById('bankField'), c=document.getElementById('chequeNumberField'); if(type==='Cheque Payment Voucher'){ b.style.display='flex'; c.style.display='flex'; } else { b.style.display='none'; c.style.display='none'; } }
function toggleTaxField() { let tax=document.getElementById('withholdingTaxAmount'); tax.style.display = document.getElementById('withholdingTaxCheckbox').checked ? 'block' : 'none'; }
function convertNumberToWords(amount) { if(!amount) return "Zero Ghana Cedis"; let num=parseFloat(amount).toFixed(2); let parts=num.split('.'); let cedis=parseInt(parts[0]), pesewas=parseInt(parts[1]); const ones=['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine']; const teens=['Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen']; const tens=['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety']; function underThousand(n){ let s=''; if(n>=100){ s+=ones[Math.floor(n/100)]+' Hundred '; n%=100; if(n) s+='and '; } if(n>=20){ s+=tens[Math.floor(n/10)]+' '; n%=10; } if(n>=10&&n<=19) s+=teens[n-10]+' '; if(n>0&&n<10) s+=ones[n]+' '; return s.trim(); } let cedisStr=''; if(cedis===0) cedisStr='Zero'; else{ let thousands=Math.floor(cedis/1000); let rem=cedis%1000; if(thousands>0) cedisStr=underThousand(thousands)+' Thousand '; if(rem>0) cedisStr+=underThousand(rem); } cedisStr=cedisStr.trim()+(cedis===1?' Ghana Cedi':' Ghana Cedis'); let pesewaStr=''; if(pesewas>0) pesewaStr=' and '+underThousand(pesewas)+(pesewas===1?' Pesewa':' Pesewas'); return cedisStr+pesewaStr; }
function showToast(msg) { let t=document.createElement('div'); t.className='toast-message'; t.innerText=msg; document.body.appendChild(t); setTimeout(()=>t.remove(), 2500); }

window.onload = () => {
    refreshSavedLists();
    updateConditionalFields();
    document.getElementById('date').value = new Date().toISOString().split('T')[0];
    window.updateConditionalFields = updateConditionalFields;
    window.toggleTaxField = toggleTaxField;
    window.loadDemoData = loadDemoData;
    window.previewCurrentForm = previewCurrentForm;
    window.printVoucherPerfect = printVoucherPerfect;
    window.closeVoucherModal = closeVoucherModal;
    window.editVoucher = editVoucher;
    window.performUpdate = performUpdate;
    window.handleSubmitOrUpdate = handleSubmitOrUpdate;
    window.quickPrintChequeDemo = quickPrintChequeDemo;
};
