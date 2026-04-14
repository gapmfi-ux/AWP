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

  // Get print styles - REMOVES HEADER/FOOTER
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
        }
        
        body {
          font-family: 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
          padding: 12mm;
          font-size: 9px;
          line-height: 1.3;
          color: #2d3748;
          background: white;
        }
        
        /* Report Header */
        .print-report-header {
          text-align: center;
          margin-bottom: 15px;
          border-bottom: 2px solid #4361ee;
          padding-bottom: 10px;
        }
        
        .print-report-header h1 {
          font-size: 18px;
          color: #2d3748;
          margin: 0 0 5px 0;
          font-weight: 600;
          letter-spacing: 1px;
        }
        
        .print-report-header .date-info {
          font-size: 9px;
          color: #718096;
          margin: 0;
          padding-top: 3px;
          border-top: 1px dashed #e2e8f0;
        }
        
        .print-report-header .date-info div {
          margin: 2px 0;
        }
        
        /* Table Styles */
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
          font-size: 9px;
        }
        
        th {
          background: #f7fafc;
          padding: 6px 4px;
          border: 1px solid #cbd5e0;
          text-align: center;
          font-weight: 700;
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          color: #2d3748;
        }
        
        td {
          padding: 5px 4px;
          border: 1px solid #e2e8f0;
          text-align: center;
          font-size: 9px;
          color: #4a5568;
        }
        
        tbody tr:nth-child(even) {
          background: #fafbfc;
        }
        
        tbody tr:hover {
          background: #f0f4ff;
        }
        
        /* Group Header */
        .group-header {
          background: #f0f4ff;
          font-weight: 600;
        }
        
        .group-header td {
          background: #f0f4ff !important;
          color: #4361ee !important;
          text-align: left;
          font-weight: 600;
          border: 1px solid #4361ee;
          padding: 8px 6px;
        }
        
        /* Group Subtotal */
        .group-subtotal {
          background: #f9fafc;
          font-weight: 600;
        }
        
        .group-subtotal td {
          background: #f9fafc !important;
          border: 1px solid #cbd5e0;
          font-weight: 600;
        }
        
        /* Row Styles */
        .total-row {
          background: #e8f8f3 !important;
          font-weight: 700;
        }
        
        .total-row td {
          background: #e8f8f3 !important;
          color: #118d57 !important;
          font-weight: 700;
          border: 1px solid #06d6a0;
        }
        
        .total-cell {
          background: #d0f0e6 !important;
          font-weight: 700;
          color: #06d6a0 !important;
          text-align: right;
        }
        
        .subtotal-row {
          background: #f0f4ff !important;
          font-weight: 600;
        }
        
        .subtotal-row td {
          background: #f0f4ff !important;
          color: #4361ee !important;
          border: 1px solid #4361ee;
          font-weight: 600;
        }
        
        .grand-total-row {
          background: #e8f8f3 !important;
          font-weight: 700;
        }
        
        .grand-total-row td {
          background: #e8f8f3 !important;
          color: #118d57 !important;
          border: 1px solid #06d6a0;
          font-weight: 700;
        }
        
        /* Amount Cell */
        .amount-cell {
          text-align: right;
          font-weight: 500;
        }
        
        /* Grouped Report Styles */
        .grouped-report {
          margin-bottom: 10px;
          page-break-inside: avoid;
        }
        
        .group-title {
          font-size: 11px;
          font-weight: 700;
          background: linear-gradient(135deg, #4361ee, #7209b7);
          color: white;
          padding: 6px 10px;
          margin: 10px 0 0 0;
          border-radius: 4px 4px 0 0;
        }
        
        .group-table-wrapper {
          border: 1px solid #e2e8f0;
          border-top: none;
          border-radius: 0 0 4px 4px;
          overflow-x: auto;
          margin-bottom: 5px;
        }
        
        .grand-total-report {
          margin-top: 10px;
          page-break-inside: avoid;
        }
        
        .group-table {
          width: 100%;
          border-collapse: collapse;
        }
        
        /* Highlight rows for summary register */
        .highlight-row {
          background: #f0f4ff !important;
          font-weight: 600;
        }
        
        .highlight-row td {
          background: #f0f4ff !important;
          border: 1px solid #4361ee;
          font-weight: 600;
        }
        
        .special-highlight {
          background: #e8f8f3 !important;
          font-weight: 700;
        }
        
        .special-highlight td {
          background: #e8f8f3 !important;
          color: #118d57 !important;
          border: 1px solid #06d6a0;
        }
        
        .green-row td {
          background: #d0f0e6 !important;
          color: #06d6a0 !important;
          border: 1px solid #06d6a0;
        }
        
        .date-col {
          min-width: 80px;
        }
        
        .details-col {
          text-align: left;
          font-weight: 500;
          min-width: 120px;
        }
        
        .total-col {
          background: #f7fafc;
          font-weight: 700;
          border: 1px solid #cbd5e0;
        }
        
        /* Text alignment utilities */
        .text-right {
          text-align: right;
        }
        
        .text-left {
          text-align: left;
        }
        
        .text-center {
          text-align: center;
        }
        
        .font-bold {
          font-weight: 700;
        }
        
        /* REMOVE BROWSER HEADERS AND FOOTERS */
        @page {
          margin: 0;
          padding: 0;
          size: A4;
        }
        
        @media print {
          * {
            margin: 0 !important;
            padding: 0 !important;
          }
          
          html, body {
            width: 100%;
            height: 100%;
            margin: 0;
            padding: 0;
          }
          
          body {
            padding: 12mm !important;
            font-size: 9px;
          }
          
          table {
            border-collapse: collapse;
            page-break-inside: avoid;
          }
          
          th, td {
            border: 1px solid #999;
            page-break-inside: avoid;
          }
          
          .grouped-report {
            page-break-inside: avoid;
          }
          
          thead {
            display: table-header-group;
          }
          
          tfoot {
            display: table-footer-group;
          }
          
          .noprint {
            display: none !important;
          }
        }
      </style>
    `;
  },

  // Print any table with title and date info
  printTable: function(tableId, title, dateInfo = '', options = {}) {
    console.log('printTable called with:', { tableId, title, dateInfo });
    
    const tableWrapper = document.getElementById(tableId);
    if (!tableWrapper) {
      console.error('Table wrapper not found:', tableId);
      alert('Report data not found. Please ensure data is loaded.');
      return;
    }

    const originalTable = tableWrapper.querySelector('table');
    if (!originalTable) {
      console.error('Table not found in wrapper:', tableId);
      alert('Table not found. Please ensure data is loaded.');
      return;
    }

    console.log('Found table:', originalTable);

    // Clone the table
    const tableClone = originalTable.cloneNode(true);
    
    // Remove action buttons column if present
    const headerCells = tableClone.querySelectorAll('thead th');
    let actionColumnIndex = -1;
    
    headerCells.forEach((th, index) => {
      if (th.textContent.toLowerCase().includes('action')) {
        actionColumnIndex = index;
      }
    });

    if (actionColumnIndex >= 0) {
      // Remove header
      const headerRow = tableClone.querySelector('thead tr');
      if (headerRow && headerRow.cells[actionColumnIndex]) {
        headerRow.deleteCell(actionColumnIndex);
      }
      
      // Remove from all body rows
      tableClone.querySelectorAll('tbody tr').forEach(row => {
        if (row.cells[actionColumnIndex]) {
          row.deleteCell(actionColumnIndex);
        }
      });
      
      // Remove from footer rows
      if (tableClone.querySelector('tfoot')) {
        tableClone.querySelectorAll('tfoot tr').forEach(row => {
          if (row.cells[actionColumnIndex]) {
            row.deleteCell(actionColumnIndex);
          }
        });
      }
    }

    const dateTime = this.getPrintDateTime();
    
    // Create print window content
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
          <div class="date-info">
            ${dateInfo ? `<div>${this.escapeHtml(dateInfo)}</div>` : ''}
            <div>Printed: ${dateTime.full}</div>
          </div>
        </div>
        
        <div class="print-table-container">
          ${tableClone.outerHTML}
        </div>
      </body>
      </html>
    `;

    console.log('Opening print window');

    // Open print window
    const printWindow = window.open('', '_blank', 'width=900,height=600');
    if (!printWindow) {
      alert('Please disable your browser popup blocker to print.');
      return;
    }

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    
    // Wait for content to load then print
    setTimeout(() => {
      try {
        printWindow.print();
        setTimeout(() => {
          printWindow.close();
        }, 500);
      } catch(e) {
        console.error('Print error:', e);
      }
    }, 300);
  },

  // Print inventory report
  printInventoryReport: function(tabId) {
    console.log('printInventoryReport called for tab:', tabId);
    
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

    this.printTable(tableId, title, dateInfo);
  },

  // Print asset register
  printAssetRegister: function(tabName) {
    console.log('printAssetRegister called for tab:', tabName);
    
    if (tabName === 'detailedRegister') {
      const title = 'DETAILED ASSET REGISTER';
      const asAtDate = document.getElementById('detailedToDate')?.value || '';
      const dateInfo = asAtDate ? `As at: ${asAtDate}` : '';
      this.printTable('detailedRegisterTable', title, dateInfo);
    } else if (tabName === 'summaryRegister') {
      const title = 'SUMMARY ASSET REGISTER';
      const toDate = document.getElementById('summaryToDate')?.value || '';
      const dateInfo = toDate ? `As at: ${toDate}` : '';
      
      // Print the summary table directly
      this.printSummaryRegisterTable(title, dateInfo);
    }
  },

  // Print summary register table
  printSummaryRegisterTable: function(title, dateInfo) {
    console.log('printSummaryRegisterTable called');
    
    // Get the summary details table
    const summaryDetailsTable = document.getElementById('summaryDetailsTable');
    if (!summaryDetailsTable) {
      console.error('summaryDetailsTable not found');
      alert('Summary table not found. Please generate the report first.');
      return;
    }

    const tableClone = summaryDetailsTable.cloneNode(true);
    const dateTime = this.getPrintDateTime();
    
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
          <div class="date-info">
            ${dateInfo ? `<div>${this.escapeHtml(dateInfo)}</div>` : ''}
            <div>Printed: ${dateTime.full}</div>
          </div>
        </div>
        
        ${tableClone.outerHTML}
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank', 'width=1000,height=700');
    if (!printWindow) {
      alert('Please disable your browser popup blocker to print.');
      return;
    }

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
      try {
        printWindow.print();
        setTimeout(() => {
          printWindow.close();
        }, 500);
      } catch(e) {
        console.error('Print error:', e);
      }
    }, 300);
  },

  // Print investment report
  printInvestmentReport: function(tabName) {
    console.log('printInvestmentReport called for tab:', tabName);
    
    let title = '';
    let tableId = '';
    let dateInfo = '';

    if (tabName === 'purchaseReport') {
      title = 'INVESTMENT PURCHASE REPORT';
      tableId = 'purchaseReportTable';
      const fromDate = document.getElementById('purchaseFromDate')?.value || '';
      const toDate = document.getElementById('purchaseToDate')?.value || '';
      if (fromDate && toDate) {
        dateInfo = `Period: ${fromDate} to ${toDate}`;
      }
      this.printTable(tableId, title, dateInfo);
    } else if (tabName === 'fullReport') {
      title = 'INVESTMENT FULL REPORT';
      const toDate = document.getElementById('fullReportToDate')?.value || '';
      if (toDate) {
        dateInfo = `As at: ${toDate}`;
      }
      this.printInvestmentGroupedReport('fullReportContainer', title, dateInfo);
    } else if (tabName === 'interestReport') {
      title = 'INVESTMENT INTEREST REPORT';
      const fromDate = document.getElementById('interestFromDate')?.value || '';
      const toDate = document.getElementById('interestToDate')?.value || '';
      if (fromDate && toDate) {
        dateInfo = `Period: ${fromDate} to ${toDate}`;
      }
      this.printInvestmentGroupedReport('interestReportContainer', title, dateInfo);
    } else if (tabName === 'maturedReport') {
      title = 'MATURED INVESTMENTS REPORT';
      tableId = 'maturedReportTable';
      const toDate = new Date().toISOString().split('T')[0];
      dateInfo = `As at: ${toDate}`;
      this.printTable(tableId, title, dateInfo);
    }
  },

  // Print investment grouped report
  printInvestmentGroupedReport: function(containerId, title, dateInfo) {
    console.log('printInvestmentGroupedReport called with:', { containerId, title, dateInfo });
    
    const container = document.getElementById(containerId);
    if (!container) {
      console.error('Container not found:', containerId);
      alert('Report container not found. Please generate the report first.');
      return;
    }

    // Get all the HTML from the container
    const containerHTML = container.innerHTML;
    if (!containerHTML || containerHTML.trim() === '') {
      console.error('Container is empty:', containerId);
      alert('Report is empty. Please generate the report first.');
      return;
    }

    const dateTime = this.getPrintDateTime();
    
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
          <div class="date-info">
            ${dateInfo ? `<div>${this.escapeHtml(dateInfo)}</div>` : ''}
            <div>Printed: ${dateTime.full}</div>
          </div>
        </div>
        
        ${containerHTML}
      </body>
      </html>
    `;

    console.log('Opening print window with content length:', printContent.length);

    const printWindow = window.open('', '_blank', 'width=1000,height=700');
    if (!printWindow) {
      alert('Please disable your browser popup blocker to print.');
      return;
    }

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
      try {
        printWindow.print();
        setTimeout(() => {
          printWindow.close();
        }, 500);
      } catch(e) {
        console.error('Print error:', e);
      }
    }, 300);
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

  // Print investment grouped report - WITH LANDSCAPE OPTION
  printInvestmentGroupedReport: function(containerId, title, dateInfo) {
    console.log('printInvestmentGroupedReport called with:', { containerId, title, dateInfo });
    
    const container = document.getElementById(containerId);
    if (!container) {
      console.error('Container not found:', containerId);
      alert('Report container not found. Please generate the report first.');
      return;
    }

    // Get all the HTML from the container
    const containerHTML = container.innerHTML;
    if (!containerHTML || containerHTML.trim() === '') {
      console.error('Container is empty:', containerId);
      alert('Report is empty. Please generate the report first.');
      return;
    }

    const dateTime = this.getPrintDateTime();
    
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
          <div class="date-info">
            ${dateInfo ? `<div>${this.escapeHtml(dateInfo)}</div>` : ''}
            <div>Printed: ${dateTime.full}</div>
          </div>
        </div>
        
        ${containerHTML}
      </body>
      </html>
    `;

    console.log('Opening print window with content length:', printContent.length);

    const printWindow = window.open('', '_blank', 'width=1200,height=700');
    if (!printWindow) {
      alert('Please disable your browser popup blocker to print.');
      return;
    }

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
      try {
        // Give user time to change orientation before printing
        alert('Adjust page orientation (Portrait/Landscape) in Print Settings if needed before clicking OK');
        printWindow.print();
        setTimeout(() => {
          printWindow.close();
        }, 500);
      } catch(e) {
        console.error('Print error:', e);
      }
    }, 300);
  },

// Make printUtils available globally
window.printUtils = printUtils;
