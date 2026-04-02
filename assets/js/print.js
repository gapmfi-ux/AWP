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

  // Print any table with title and date info
  printTable: function(tableId, title, dateInfo = '', options = {}) {
    const tableWrapper = document.getElementById(tableId);
    if (!tableWrapper) {
      console.error('Table wrapper not found:', tableId);
      alert('Report data not found. Please refresh and try again.');
      return;
    }

    const originalTable = tableWrapper.querySelector('table');
    if (!originalTable) {
      console.error('Table not found in wrapper:', tableId);
      alert('Table not found. Please refresh and try again.');
      return;
    }

    // Clone the table
    const tableClone = originalTable.cloneNode(true);
    
    // Remove action buttons column if present (last column with Action button)
    const actionColumn = tableClone.querySelector('th:last-child');
    if (actionColumn && (actionColumn.textContent.includes('Action') || actionColumn.textContent.includes('action'))) {
      // Remove last column from header
      const headerRow = tableClone.querySelector('thead tr');
      if (headerRow && headerRow.lastElementChild) {
        headerRow.removeChild(headerRow.lastElementChild);
      }
      // Remove last column from each row in tbody
      tableClone.querySelectorAll('tbody tr').forEach(row => {
        if (row.lastElementChild && !row.classList.contains('total-row')) {
          row.removeChild(row.lastElementChild);
        }
      });
      // Remove last column from tfoot if exists
      if (tableClone.querySelector('tfoot')) {
        tableClone.querySelectorAll('tfoot tr').forEach(row => {
          if (row.lastElementChild) {
            row.removeChild(row.lastElementChild);
          }
        });
      }
    }

    const dateTime = this.getPrintDateTime();
    
    // Create complete print window content with full styles
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${this.escapeHtml(title)}</title>
        <meta charset="UTF-8">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
            padding: 15mm;
            font-size: 11px;
            line-height: 1.4;
            color: #2d3748;
            background: white;
          }
          
          /* Report Header */
          .print-report-header {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 2px solid #4361ee;
            padding-bottom: 15px;
          }
          
          .print-report-header h1 {
            font-size: 20px;
            color: #2d3748;
            margin-bottom: 8px;
            font-weight: 600;
            letter-spacing: 1px;
          }
          
          .print-report-header .date-info {
            font-size: 10px;
            color: #718096;
            margin-top: 8px;
            padding-top: 5px;
            border-top: 1px dashed #e2e8f0;
          }
          
          /* Table Styles */
          .print-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
            font-size: 10px;
          }
          
          .print-table th {
            background: #f7fafc;
            padding: 10px 8px;
            border: 1px solid #cbd5e0;
            text-align: center;
            font-weight: 700;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #2d3748;
          }
          
          .print-table td {
            padding: 8px;
            border: 1px solid #e2e8f0;
            text-align: center;
            font-size: 10px;
            color: #4a5568;
          }
          
          .print-table tr:hover td {
            background: #f9fafb;
          }
          
          /* Total Row Styles */
          .total-row {
            background: #e8f8f3 !important;
            font-weight: 700;
          }
          
          .total-row td {
            background: #e8f8f3 !important;
            color: #118d57 !important;
            font-weight: 700;
          }
          
          .total-cell {
            background: #d0f0e6 !important;
            font-weight: 700;
            color: #06d6a0 !important;
          }
          
          /* Subtotal Row for Grouped Reports */
          .subtotal-row {
            background: #f0f4ff !important;
            font-weight: 600;
          }
          
          .subtotal-row td {
            background: #f0f4ff !important;
            color: #4361ee !important;
          }
          
          .grand-total-row {
            background: #e8f8f3 !important;
            font-weight: 700;
          }
          
          .grand-total-row td {
            background: #e8f8f3 !important;
            color: #118d57 !important;
          }
          
          /* Grouped Report Styles */
          .grouped-report {
            margin-bottom: 20px;
            page-break-inside: avoid;
          }
          
          .group-title {
            font-size: 13px;
            font-weight: 700;
            background: linear-gradient(135deg, #4361ee, #7209b7);
            color: white;
            padding: 10px 15px;
            margin: 15px 0 0 0;
            border-radius: 6px 6px 0 0;
          }
          
          .group-table-wrapper {
            border: 1px solid #e2e8f0;
            border-top: none;
            border-radius: 0 0 6px 6px;
            overflow-x: auto;
          }
          
          /* Print-specific adjustments */
          @media print {
            body {
              padding: 10mm;
            }
            
            .print-table th,
            .print-table td {
              border: 1px solid #ddd;
            }
            
            .grouped-report {
              break-inside: avoid;
              page-break-inside: avoid;
            }
          }
          
          /* Utility Classes */
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
        </style>
      </head>
      <body>
        <div class="print-report-header">
          <h1>${this.escapeHtml(title)}</h1>
          <div class="date-info">
            ${dateInfo ? `<div>${this.escapeHtml(dateInfo)}</div>` : ''}
            <div>Printed on: ${dateTime.date} at ${dateTime.time}</div>
          </div>
        </div>
        
        ${this.convertTableToHtml(tableClone, 'print-table')}
      </body>
      </html>
    `;

    // Open print window
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    
    // Wait for content to load then print
    setTimeout(() => {
      printWindow.print();
      setTimeout(() => {
        printWindow.close();
      }, 1000);
    }, 500);
  },

  // Convert table to HTML with proper classes
  convertTableToHtml: function(table, className) {
    const clone = table.cloneNode(true);
    clone.className = className;
    
    // Fix number formatting in cells
    clone.querySelectorAll('td').forEach(cell => {
      const text = cell.textContent;
      // Check if it looks like a number with commas
      if (text && /^[\d,]+\.\d{2}$/.test(text)) {
        // Keep as is - already formatted
      }
    });
    
    return clone.outerHTML;
  },

  // Print container report (for grouped reports)
  printContainerReport: function(containerId, title, dateInfo) {
    const container = document.getElementById(containerId);
    if (!container) {
      alert('Report data not found');
      return;
    }

    const content = container.cloneNode(true);
    const dateTime = this.getPrintDateTime();
    
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${this.escapeHtml(title)}</title>
        <meta charset="UTF-8">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
            padding: 15mm;
            font-size: 11px;
            line-height: 1.4;
            color: #2d3748;
            background: white;
          }
          
          .print-report-header {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 2px solid #4361ee;
            padding-bottom: 15px;
          }
          
          .print-report-header h1 {
            font-size: 20px;
            color: #2d3748;
            margin-bottom: 8px;
            font-weight: 600;
          }
          
          .print-report-header .date-info {
            font-size: 10px;
            color: #718096;
            margin-top: 8px;
            padding-top: 5px;
            border-top: 1px dashed #e2e8f0;
          }
          
          .grouped-report {
            margin-bottom: 20px;
            page-break-inside: avoid;
          }
          
          .group-title {
            font-size: 13px;
            font-weight: 700;
            background: linear-gradient(135deg, #4361ee, #7209b7);
            color: white;
            padding: 10px 15px;
            margin: 15px 0 0 0;
            border-radius: 6px 6px 0 0;
          }
          
          .group-table-wrapper {
            border: 1px solid #e2e8f0;
            border-top: none;
            border-radius: 0 0 6px 6px;
            overflow-x: auto;
          }
          
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10px;
          }
          
          th {
            background: #f7fafc;
            padding: 8px 6px;
            border: 1px solid #cbd5e0;
            text-align: center;
            font-weight: 700;
            font-size: 9px;
            text-transform: uppercase;
          }
          
          td {
            padding: 6px;
            border: 1px solid #e2e8f0;
            text-align: center;
            font-size: 9px;
          }
          
          .subtotal-row {
            background: #f0f4ff !important;
            font-weight: 600;
          }
          
          .subtotal-row td {
            background: #f0f4ff !important;
            color: #4361ee !important;
          }
          
          .grand-total-row {
            background: #e8f8f3 !important;
            font-weight: 700;
          }
          
          .grand-total-row td {
            background: #e8f8f3 !important;
            color: #118d57 !important;
          }
          
          @media print {
            body {
              padding: 10mm;
            }
            .grouped-report {
              break-inside: avoid;
              page-break-inside: avoid;
            }
          }
        </style>
      </head>
      <body>
        <div class="print-report-header">
          <h1>${this.escapeHtml(title)}</h1>
          <div class="date-info">
            ${dateInfo ? `<div>${this.escapeHtml(dateInfo)}</div>` : ''}
            <div>Printed on: ${dateTime.date} at ${dateTime.time}</div>
          </div>
        </div>
        
        ${content.innerHTML}
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
      printWindow.print();
      setTimeout(() => {
        printWindow.close();
      }, 1000);
    }, 500);
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

    this.printTable(tableId, title, dateInfo);
  },

  // Print asset register
  printAssetRegister: function(tabName) {
    if (tabName === 'detailedRegister') {
      const title = 'DETAILED ASSET REGISTER';
      const asAtDate = document.getElementById('detailedToDate')?.value || '';
      const dateInfo = asAtDate ? `As at: ${asAtDate}` : '';
      this.printTable('detailedRegisterTable', title, dateInfo);
    } else if (tabName === 'summaryRegister') {
      const title = 'SUMMARY ASSET REGISTER';
      const fromDate = document.getElementById('summaryFromDate')?.value || '';
      const toDate = document.getElementById('summaryToDate')?.value || '';
      const dateInfo = (fromDate && toDate) ? `Period: ${fromDate} to ${toDate}` : '';
      this.printTable('summaryRegisterTable', title, dateInfo);
    }
  },

  // Print investment report
  printInvestmentReport: function(tabName) {
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
      this.printContainerReport('fullReportContainer', title, dateInfo);
    } else if (tabName === 'interestReport') {
      title = 'INVESTMENT INTEREST REPORT';
      const fromDate = document.getElementById('interestFromDate')?.value || '';
      const toDate = document.getElementById('interestToDate')?.value || '';
      if (fromDate && toDate) {
        dateInfo = `Period: ${fromDate} to ${toDate}`;
      }
      this.printContainerReport('interestReportContainer', title, dateInfo);
    } else if (tabName === 'maturedReport') {
      title = 'MATURED INVESTMENTS REPORT';
      tableId = 'maturedReportTable';
      const toDate = new Date().toISOString().split('T')[0];
      dateInfo = `As at: ${toDate}`;
      this.printTable(tableId, title, dateInfo);
    }
  }
};

// Make printUtils available globally
window.printUtils = printUtils;
