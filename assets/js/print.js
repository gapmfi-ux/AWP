/* ============================================
   UNIFIED PRINT MODULE
   Handles printing for all reports and registers
   ============================================ */

// Global print utility
const printUtils = {
  // Get current date/time for report
  getPrintDateTime: function() {
    const now = new Date();
    return {
      date: now.toLocaleDateString(),
      time: now.toLocaleTimeString(),
      full: now.toLocaleString()
    };
  },

  // Format currency for print
  formatCurrency: function(value) {
    if (value === null || value === undefined || value === '') return '0.00';
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return '0.00';
    return numValue.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  },

  // Escape HTML to prevent XSS
  escapeHtml: function(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  // Get print styles - LANDSCAPE, NO HEADERS/FOOTERS, NO ACTION BUTTONS
  getPrintStyles: function() {
    return `
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        html, body {
          margin: 0;
          padding: 0;
          width: 100%;
          height: 100%;
        }
        
        body {
          font-family: 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
          padding: 15mm;
          font-size: 11px;
          line-height: 1.6;
          color: #2d3748;
          background: white;
        }
        
        /* Report Header */
        .print-report-header {
          text-align: center;
          margin-bottom: 18px;
          border-bottom: 3px solid #4361ee;
          padding-bottom: 12px;
          page-break-after: avoid;
        }
        
        .print-report-header h1 {
          font-size: 22px;
          color: #2d3748;
          margin: 0;
          font-weight: 700;
          letter-spacing: 1.5px;
        }
        
        .print-report-header .date-info {
          font-size: 10px;
          color: #718096;
          margin-top: 8px;
          padding-top: 6px;
          border-top: 1px dashed #e2e8f0;
        }
        
        .print-report-header .date-info div {
          margin: 2px 0;
        }
        
        /* Table Styles */
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 12px;
          margin-bottom: 12px;
          font-size: 11px;
        }
        
        th {
          background: #f7fafc;
          padding: 8px 6px;
          border: 1px solid #cbd5e0;
          text-align: center;
          font-weight: 700;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #2d3748;
        }
        
        td {
          padding: 7px 5px;
          border: 1px solid #e2e8f0;
          text-align: center;
          font-size: 10px;
          color: #4a5568;
          line-height: 1.4;
        }
        
        tbody tr:nth-child(even) {
          background: #fafbfc;
        }
        
        tbody tr:hover {
          background: #f0f4ff;
        }
        
        /* Group Title */
        .group-title {
          font-size: 13px;
          font-weight: 700;
          background: linear-gradient(135deg, #4361ee, #7209b7);
          color: white;
          padding: 8px 12px;
          margin: 12px 0 0 0;
          border-radius: 4px 4px 0 0;
          page-break-after: avoid;
        }
        
        .group-table-wrapper {
          border: 1px solid #e2e8f0;
          border-top: none;
          border-radius: 0 0 4px 4px;
          overflow-x: auto;
          margin-bottom: 8px;
          page-break-inside: avoid;
        }
        
        .group-table {
          width: 100%;
          border-collapse: collapse;
        }
        
        .grouped-report {
          margin-bottom: 12px;
          page-break-inside: avoid;
        }
        
        .subtotal-row {
          background: #f0f4ff !important;
          font-weight: 600;
          page-break-after: avoid;
        }
        
        .subtotal-row td {
          background: #f0f4ff !important;
          color: #4361ee !important;
          border: 1.5px solid #4361ee;
          font-weight: 600;
          padding: 7px 5px;
          font-size: 11px;
        }
        
        .grand-total-row {
          background: #e8f8f3 !important;
          font-weight: 700;
          page-break-after: avoid;
        }
        
        .grand-total-row td {
          background: #e8f8f3 !important;
          color: #118d57 !important;
          border: 1.5px solid #06d6a0;
          font-weight: 700;
          padding: 8px 6px;
          font-size: 11px;
        }
        
        .total-row {
          background: #e8f8f3 !important;
          font-weight: 700;
          page-break-after: avoid;
        }
        
        .total-row td {
          background: #e8f8f3 !important;
          color: #118d57 !important;
          border: 1.5px solid #06d6a0;
          font-weight: 700;
          padding: 8px 6px;
          font-size: 11px;
        }
        
        .text-right {
          text-align: right;
          padding-right: 6px;
        }
        
        .text-left {
          text-align: left;
          padding-left: 6px;
        }
        
        .text-center {
          text-align: center;
        }
        
        .action-btn {
          display: none !important;
        }
        
        /* LANDSCAPE AND PORTRAIT SUPPORT - NO HEADERS/FOOTERS */
        @page {
          size: A4 landscape;
          margin: 10mm;
          padding: 0;
        }
        
        @page :first {
          margin: 10mm;
        }
        
        @media print {
          * {
            margin: 0 !important;
            padding: 0 !important;
          }
          
          html {
            margin: 0;
            padding: 0;
          }
          
          body {
            margin: 0;
            padding: 12mm;
            width: 100%;
            height: 100%;
            font-size: 11px;
            line-height: 1.6;
            background: white !important;
          }
          
          table {
            page-break-inside: auto;
            width: 100%;
            margin-top: 8px;
            margin-bottom: 8px;
          }
          
          th, td {
            border: 1px solid #999;
            page-break-inside: avoid;
          }
          
          tbody tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          
          .grouped-report {
            page-break-inside: avoid;
            page-break-after: auto;
            margin-bottom: 10px;
          }
          
          .print-report-header {
            page-break-after: avoid;
          }
          
          .group-title {
            page-break-after: avoid;
          }
          
          thead {
            display: table-header-group;
          }
          
          tfoot {
            display: table-footer-group;
          }
          
          /* Remove browser headers and footers */
          @page {
            margin-top: 10mm;
            margin-bottom: 10mm;
            margin-left: 10mm;
            margin-right: 10mm;
          }
        }
      </style>
    `;
  },

  // Remove action button columns from tables
  removeActionColumns: function(table) {
    const clone = table.cloneNode(true);
    
    // Find action column index
    const headerCells = clone.querySelectorAll('thead th');
    let actionColumnIndex = -1;
    
    headerCells.forEach((th, index) => {
      if (th.textContent.toLowerCase().includes('action')) {
        actionColumnIndex = index;
      }
    });

    // Remove action column
    if (actionColumnIndex >= 0) {
      // Remove from header
      const headerRow = clone.querySelector('thead tr');
      if (headerRow && headerRow.cells[actionColumnIndex]) {
        headerRow.deleteCell(actionColumnIndex);
      }
      
      // Remove from all body rows
      clone.querySelectorAll('tbody tr').forEach(row => {
        if (row.cells[actionColumnIndex]) {
          row.deleteCell(actionColumnIndex);
        }
      });
    }
    
    return clone;
  },

  // Print investment report
  printInvestmentReport: function(tabName) {
    console.log('printInvestmentReport called for tab:', tabName);
    
    let title = '';
    let dateInfo = '';

    if (tabName === 'purchaseReport') {
      title = 'INVESTMENT PURCHASE REPORT';
      const fromDate = document.getElementById('purchaseFromDate')?.value || '';
      const toDate = document.getElementById('purchaseToDate')?.value || '';
      if (fromDate && toDate) {
        dateInfo = `Period: ${fromDate} to ${toDate}`;
      }
      this.printInvestmentTable('purchaseReportTable', title, dateInfo);
    } else if (tabName === 'fullReport') {
      title = 'INVESTMENT FULL REPORT';
      const toDate = document.getElementById('fullReportToDate')?.value || '';
      if (toDate) {
        dateInfo = `As at: ${toDate}`;
      }
      this.printInvestmentContainer('fullReportContainer', title, dateInfo);
    } else if (tabName === 'interestReport') {
      title = 'INVESTMENT INTEREST REPORT';
      const fromDate = document.getElementById('interestFromDate')?.value || '';
      const toDate = document.getElementById('interestToDate')?.value || '';
      if (fromDate && toDate) {
        dateInfo = `Period: ${fromDate} to ${toDate}`;
      }
      this.printInvestmentContainer('interestReportContainer', title, dateInfo);
    } else if (tabName === 'maturedReport') {
      title = 'MATURED INVESTMENTS REPORT';
      const toDate = new Date().toISOString().split('T')[0];
      dateInfo = `As at: ${toDate}`;
      this.printInvestmentTable('maturedReportTable', title, dateInfo);
    }
  },

  // Print investment table
  printInvestmentTable: function(tableId, title, dateInfo) {
    console.log('printInvestmentTable called with:', { tableId, title });
    
    const tableWrapper = document.getElementById(tableId);
    if (!tableWrapper) {
      console.error('Table not found:', tableId);
      alert('Report table not found. Please ensure report is loaded.');
      return;
    }

    const originalTable = tableWrapper.querySelector('table');
    if (!originalTable) {
      console.error('Table element not found in wrapper');
      alert('Table element not found.');
      return;
    }

    const tableClone = this.removeActionColumns(originalTable);
    
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${this.escapeHtml(title)}</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        ${this.getPrintStyles()}
      </head>
      <body>
        <div class="print-report-header">
          <h1>${this.escapeHtml(title)}</h1>
          ${dateInfo ? `<div class="date-info"><div>${this.escapeHtml(dateInfo)}</div></div>` : ''}
        </div>
        
        ${tableClone.outerHTML}
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please disable popup blocker to print.');
      return;
    }

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
      printWindow.print();
    }, 500);
  },

  // Print investment container (grouped reports)
  printInvestmentContainer: function(containerId, title, dateInfo) {
    console.log('printInvestmentContainer called with:', { containerId, title });
    
    const container = document.getElementById(containerId);
    if (!container) {
      console.error('Container not found:', containerId);
      alert('Report container not found. Please ensure report is loaded.');
      return;
    }

    let containerHTML = container.innerHTML;
    if (!containerHTML || containerHTML.trim() === '') {
      console.error('Container is empty');
      alert('Report is empty. Please generate the report first.');
      return;
    }

    // Remove action buttons from HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = containerHTML;
    tempDiv.querySelectorAll('.action-btn').forEach(btn => {
      btn.remove();
    });
    containerHTML = tempDiv.innerHTML;

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${this.escapeHtml(title)}</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        ${this.getPrintStyles()}
      </head>
      <body>
        <div class="print-report-header">
          <h1>${this.escapeHtml(title)}</h1>
          ${dateInfo ? `<div class="date-info"><div>${this.escapeHtml(dateInfo)}</div></div>` : ''}
        </div>
        
        ${containerHTML}
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please disable popup blocker to print.');
      return;
    }

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
      printWindow.print();
    }, 500);
  },

  // Print inventory report
  printInventoryReport: function(tabId) {
    let title = '';
    let dateInfo = '';
    let tableId = '';

    if (tabId === 'purchaseReport') {
      title = 'INVENTORY PURCHASE REPORT';
      tableId = 'purchaseReportTable';
      const fromDate = document.getElementById('purchaseFromDate')?.value || '';
      const toDate = document.getElementById('purchaseToDate')?.value || '';
      if (fromDate && toDate) {
        dateInfo = `Period: ${fromDate} to ${toDate}`;
      }
    } else if (tabId === 'usageReport') {
      title = 'INVENTORY USAGE REPORT';
      tableId = 'usageReportTable';
      const fromDate = document.getElementById('usageFromDate')?.value || '';
      const toDate = document.getElementById('usageToDate')?.value || '';
      if (fromDate && toDate) {
        dateInfo = `Period: ${fromDate} to ${toDate}`;
      }
    } else if (tabId === 'inventoryList') {
      title = 'INVENTORY LIST REPORT';
      tableId = 'inventoryListTable';
      const asAtDate = document.getElementById('inventoryToDate')?.value || '';
      if (asAtDate) {
        dateInfo = `As at: ${asAtDate}`;
      }
    }

    this.printInvestmentTable(tableId, title, dateInfo);
  },

  // Print asset register
  printAssetRegister: function(tabName) {
    if (tabName === 'detailedRegister') {
      const title = 'DETAILED ASSET REGISTER';
      const asAtDate = document.getElementById('detailedToDate')?.value || '';
      const dateInfo = asAtDate ? `As at: ${asAtDate}` : '';
      this.printInvestmentTable('detailedRegisterTable', title, dateInfo);
    } else if (tabName === 'summaryRegister') {
      const title = 'SUMMARY ASSET REGISTER';
      const toDate = document.getElementById('summaryToDate')?.value || '';
      const dateInfo = toDate ? `As at: ${toDate}` : '';
      
      // For summary register, print the table directly (not wrapped)
      const summaryTable = document.getElementById('summaryDetailsTable');
      if (!summaryTable) {
        console.error('summaryDetailsTable not found');
        alert('Summary table not found. Please generate the report first.');
        return;
      }
      
      const tableClone = summaryTable.cloneNode(true);
      
      const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${this.escapeHtml(title)}</title>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          ${this.getPrintStyles()}
        </head>
        <body>
          <div class="print-report-header">
            <h1>${this.escapeHtml(title)}</h1>
            ${dateInfo ? `<div class="date-info"><div>${this.escapeHtml(dateInfo)}</div></div>` : ''}
          </div>
          
          ${tableClone.outerHTML}
        </body>
        </html>
      `;

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Please disable popup blocker to print.');
        return;
      }

      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  },

  // Generic print message function
  showMessage: function(message, type) {
    const types = {
      success: '#06d6a0',
      error: '#ef476f',
      info: '#4361ee',
      warning: '#f59e0b'
    };

    const color = types[type] || types.info;
    
    const alertDiv = document.createElement('div');
    alertDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: white;
      color: ${color};
      padding: 15px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 9999;
      font-weight: 600;
      max-width: 400px;
      border-left: 4px solid ${color};
    `;
    alertDiv.textContent = message;
    document.body.appendChild(alertDiv);

    setTimeout(() => {
      alertDiv.remove();
    }, 3000);
  },

  // Generic loading function
  showLoading: function(message) {
    let modal = document.getElementById('printLoadingModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'printLoadingModal';
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div style="
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9998;
      ">
        <div style="
          background: white;
          padding: 30px;
          border-radius: 12px;
          text-align: center;
        ">
          <div style="
            width: 40px;
            height: 40px;
            border: 3px solid #e2e8f0;
            border-top: 3px solid #4361ee;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 15px;
          "></div>
          <p style="margin: 0; color: #2d3748; font-size: 14px;">${this.escapeHtml(message)}</p>
        </div>
        <style>
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        </style>
      </div>
    `;
  },

  // Hide loading
  hideLoading: function() {
    const modal = document.getElementById('printLoadingModal');
    if (modal) modal.remove();
  }
};

// Make printUtils available globally
window.printUtils = printUtils;
