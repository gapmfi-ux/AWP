/* ============================================
   ENHANCED UNIFIED PRINT MODULE
   Clean print view with only report name and period
   ============================================ */

// Global print utility with clean formatting
const printUtils = {
  // Get current date/time for report
  getPrintDateTime: function() {
    const now = new Date();
    return {
      date: now.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }),
      time: now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      }),
      full: now.toLocaleString(),
      timestamp: now.toISOString()
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

  // Format number with thousand separators
  formatNumber: function(value) {
    if (value === null || value === undefined || value === '') return '0';
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return '0';
    return numValue.toLocaleString('en-US');
  },

  // Escape HTML to prevent XSS
  escapeHtml: function(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/\n/g, '<br>');
  },

  // Get clean print styles - LANDSCAPE, NO HEADERS/FOOTERS, NO SIGNATURES
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
          background: white;
        }
        
        body {
          font-family: 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
          padding: 12mm 10mm;
          font-size: 10pt;
          line-height: 1.5;
          color: #1a202c;
          background: white;
        }
        
        /* Clean Report Header - Only Title and Period */
        .print-report-header {
          text-align: center;
          margin-bottom: 20px;
          page-break-after: avoid;
        }
        
        .report-title {
          font-size: 16pt;
          font-weight: 700;
          color: #2c3e66;
          margin: 0 0 8px 0;
          padding-bottom: 8px;
          border-bottom: 2px solid #4361ee;
          display: inline-block;
        }
        
        .period-info {
          font-size: 11pt;
          color: #4a5568;
          margin-top: 8px;
        }
        
        /* Enhanced Table Styles */
        .print-table-wrapper {
          margin: 15px 0;
          page-break-inside: auto;
          overflow-x: visible;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 9pt;
          margin: 0;
          page-break-inside: auto;
        }
        
        th {
          background: #2c3e66;
          color: white;
          padding: 10px 8px;
          border: 1px solid #1a2a4a;
          text-align: center;
          font-weight: 700;
          font-size: 9pt;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        td {
          padding: 8px 6px;
          border: 1px solid #cbd5e0;
          text-align: center;
          font-size: 9pt;
          color: #2d3748;
          vertical-align: middle;
        }
        
        tbody tr:nth-child(even) {
          background: #f9fafb;
        }
        
        tbody tr:hover {
          background: #edf2f7;
        }
        
        /* Text alignment classes */
        .text-left {
          text-align: left !important;
        }
        
        .text-right {
          text-align: right !important;
          padding-right: 10px !important;
        }
        
        .text-center {
          text-align: center !important;
        }
        
        /* Group Report Styles */
        .grouped-report {
          margin-bottom: 20px;
          page-break-inside: avoid;
          break-inside: avoid;
        }
        
        .group-title {
          font-size: 12pt;
          font-weight: 800;
          background: linear-gradient(135deg, #2c3e66, #4361ee);
          color: white;
          padding: 10px 15px;
          margin: 15px 0 0 0;
          border-radius: 6px 6px 0 0;
          page-break-after: avoid;
          break-after: avoid;
        }
        
        .group-table-wrapper {
          border: 1px solid #cbd5e0;
          border-top: none;
          border-radius: 0 0 6px 6px;
          overflow-x: auto;
          margin-bottom: 5px;
        }
        
        .subtotal-row {
          background: #e8f0fe !important;
          font-weight: 700;
          page-break-after: avoid;
        }
        
        .subtotal-row td {
          background: #e8f0fe !important;
          color: #2c3e66 !important;
          border-top: 1.5px solid #4361ee;
          border-bottom: 1.5px solid #4361ee;
          font-weight: 700;
        }
        
        .grand-total-row {
          background: #e6f7f0 !important;
          font-weight: 800;
          page-break-after: avoid;
        }
        
        .grand-total-row td {
          background: #e6f7f0 !important;
          color: #0d6e42 !important;
          border-top: 2px solid #0d6e42;
          border-bottom: 2px solid #0d6e42;
          font-weight: 800;
          font-size: 10pt;
        }
        
        .total-row {
          background: #e6f7f0 !important;
          font-weight: 800;
        }
        
        .total-row td {
          background: #e6f7f0 !important;
          color: #0d6e42 !important;
          border-top: 2px solid #0d6e42;
          font-weight: 800;
        }
        
        /* Page break utilities */
        .page-break-before {
          page-break-before: always;
          break-before: page;
        }
        
        .page-break-after {
          page-break-after: always;
          break-after: page;
        }
        
        .avoid-break {
          page-break-inside: avoid;
          break-inside: avoid;
        }
        
        /* Print-specific optimizations */
        @media print {
          body {
            margin: 0;
            padding: 10mm;
            width: 100%;
            height: 100%;
          }
          
          table {
            page-break-inside: auto;
          }
          
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          
          thead {
            display: table-header-group;
          }
          
          tfoot {
            display: table-footer-group;
          }
          
          .grouped-report {
            page-break-inside: avoid;
          }
          
          /* Hide action buttons and interactive elements */
          .action-btn, 
          button, 
          .no-print,
          .dropdown-item {
            display: none !important;
          }
          
          /* Page margins */
          @page {
            size: A4 landscape;
            margin: 15mm 12mm;
          }
          
          @page :first {
            margin-top: 20mm;
          }
        }
      </style>
    `;
  },

  // Remove action button columns from tables
  removeActionColumns: function(table) {
    const clone = table.cloneNode(true);
    
    // Find and remove action column (any column with Action in header or containing buttons)
    const headerCells = clone.querySelectorAll('thead th');
    let actionColumnIndex = -1;
    
    headerCells.forEach((th, index) => {
      const thText = th.textContent.toLowerCase();
      if (thText.includes('action') || thText.includes('menu')) {
        actionColumnIndex = index;
      }
    });

    // Remove action column if found
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
    
    // Also remove any buttons anywhere in the table
    clone.querySelectorAll('button, .action-btn, .dropdown-item').forEach(btn => {
      btn.remove();
    });
    
    return clone;
  },

  // Generate clean print document - only report name and period
  generatePrintDocument: function(title, contentHtml, periodInfo) {
    return `<!DOCTYPE html>
      <html>
      <head>
        <title>${this.escapeHtml(title)}</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        ${this.getPrintStyles()}
      </head>
      <body>
        <div class="print-report-header">
          <div class="report-title">${this.escapeHtml(title)}</div>
          ${periodInfo ? `<div class="period-info">${this.escapeHtml(periodInfo)}</div>` : ''}
        </div>
        
        ${contentHtml}
      </body>
      </html>
    `;
  },

  // Print investment report
  printInvestmentReport: function(tabName) {
    console.log('printInvestmentReport called for tab:', tabName);
    
    let title = '';
    let periodInfo = '';
    
    if (tabName === 'purchaseReport') {
      title = 'INVESTMENT PURCHASE REPORT';
      const fromDate = document.getElementById('purchaseFromDate')?.value || '';
      const toDate = document.getElementById('purchaseToDate')?.value || '';
      if (fromDate && toDate) {
        periodInfo = `Period: ${fromDate} to ${toDate}`;
      }
      this.printInvestmentTable('purchaseReportTable', title, periodInfo);
    } else if (tabName === 'fullReport') {
      title = 'ACTIVE INVESTMENTS REPORT';
      const toDate = document.getElementById('fullReportToDate')?.value || '';
      const groupBy = document.getElementById('reportTypeSelect')?.value || 'By Type';
      if (toDate) {
        periodInfo = `As at: ${toDate} | Grouped By: ${groupBy}`;
      }
      this.printInvestmentContainer('fullReportContainer', title, periodInfo);
    } else if (tabName === 'interestReport') {
      title = 'INTEREST ACCRUAL REPORT';
      const fromDate = document.getElementById('interestFromDate')?.value || '';
      const toDate = document.getElementById('interestToDate')?.value || '';
      const groupBy = document.getElementById('interestReportTypeSelect')?.value || 'By Type';
      if (fromDate && toDate) {
        periodInfo = `Period: ${fromDate} to ${toDate} | Grouped By: ${groupBy}`;
      }
      this.printInvestmentContainer('interestReportContainer', title, periodInfo);
    } else if (tabName === 'maturedReport') {
      title = 'MATURED INVESTMENTS REPORT';
      const toDate = document.getElementById('maturedToDate')?.value || new Date().toISOString().split('T')[0];
      periodInfo = `As at: ${toDate}`;
      this.printInvestmentTable('maturedReportTable', title, periodInfo);
    }
  },

  // Print investment table
  printInvestmentTable: function(tableId, title, periodInfo) {
    console.log('printInvestmentTable called with:', { tableId, title });
    
    const tableWrapper = document.getElementById(tableId);
    if (!tableWrapper) {
      console.error('Table not found:', tableId);
      this.showMessage('Report table not found. Please ensure report is loaded.', 'error');
      return;
    }

    const originalTable = tableWrapper.querySelector('table');
    if (!originalTable) {
      console.error('Table element not found in wrapper');
      this.showMessage('Table element not found.', 'error');
      return;
    }

    const tableClone = this.removeActionColumns(originalTable);
    const tableHtml = `<div class="print-table-wrapper">${tableClone.outerHTML}</div>`;
    
    const printDocument = this.generatePrintDocument(title, tableHtml, periodInfo);
    
    this.openPrintWindow(printDocument, title);
  },

  // Print investment container (grouped reports)
  printInvestmentContainer: function(containerId, title, periodInfo) {
    console.log('printInvestmentContainer called with:', { containerId, title });
    
    const container = document.getElementById(containerId);
    if (!container) {
      console.error('Container not found:', containerId);
      this.showMessage('Report container not found. Please ensure report is loaded.', 'error');
      return;
    }

    let containerHTML = container.innerHTML;
    if (!containerHTML || containerHTML.trim() === '' || containerHTML.includes('Loading') || containerHTML.includes('No investments')) {
      console.error('Container is empty or contains no data');
      this.showMessage('Report is empty. Please generate the report first.', 'error');
      return;
    }

    // Remove action buttons and interactive elements from HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = containerHTML;
    tempDiv.querySelectorAll('.action-btn, button, .dropdown-item, [onclick]').forEach(el => {
      el.remove();
    });
    // Remove any onclick attributes
    tempDiv.querySelectorAll('*').forEach(el => {
      el.removeAttribute('onclick');
      el.removeAttribute('onchange');
    });
    containerHTML = tempDiv.innerHTML;
    
    const printDocument = this.generatePrintDocument(title, containerHTML, periodInfo);
    
    this.openPrintWindow(printDocument, title);
  },

  // Print inventory report
  printInventoryReport: function(tabId) {
    let title = '';
    let periodInfo = '';
    let tableId = '';

    if (tabId === 'purchaseReport') {
      title = 'INVENTORY PURCHASE REPORT';
      tableId = 'purchaseReportTable';
      const fromDate = document.getElementById('purchaseFromDate')?.value || '';
      const toDate = document.getElementById('purchaseToDate')?.value || '';
      if (fromDate && toDate) {
        periodInfo = `Period: ${fromDate} to ${toDate}`;
      }
    } else if (tabId === 'usageReport') {
      title = 'INVENTORY USAGE REPORT';
      tableId = 'usageReportTable';
      const fromDate = document.getElementById('usageFromDate')?.value || '';
      const toDate = document.getElementById('usageToDate')?.value || '';
      if (fromDate && toDate) {
        periodInfo = `Period: ${fromDate} to ${toDate}`;
      }
    } else if (tabId === 'inventoryList') {
      title = 'INVENTORY STOCK LIST';
      tableId = 'inventoryListTable';
      const asAtDate = document.getElementById('inventoryToDate')?.value || '';
      if (asAtDate) {
        periodInfo = `As at: ${asAtDate}`;
      }
    }

    this.printInvestmentTable(tableId, title, periodInfo);
  },

  // Print asset register
  printAssetRegister: function(tabName) {
    if (tabName === 'detailedRegister') {
      const title = 'DETAILED FIXED ASSET REGISTER';
      const asAtDate = document.getElementById('detailedToDate')?.value || '';
      const groupBy = document.getElementById('groupBySelect')?.value || '';
      let periodInfo = asAtDate ? `As at: ${asAtDate}` : '';
      if (groupBy && groupBy !== 'full') {
        const groupLabels = {
          'type': 'Grouped by Asset Type',
          'fittings': 'Fittings Only',
          'software': 'Software Only', 
          'computers': 'Computers & Accessories Only',
          'furniture': 'Furniture Only',
          'office': 'Office Equipment Only',
          'motor': 'Motor Vehicle Only'
        };
        periodInfo += ` | ${groupLabels[groupBy] || ''}`;
      }
      this.printInvestmentTable('detailedRegisterTable', title, periodInfo);
    } else if (tabName === 'summaryRegister') {
      const title = 'SUMMARY FIXED ASSET REGISTER';
      const toDate = document.getElementById('summaryToDate')?.value || '';
      const periodInfo = toDate ? `As at: ${toDate}` : '';
      
      // For summary register, print the table directly
      const summaryTable = document.getElementById('summaryDetailsTable');
      if (!summaryTable) {
        console.error('summaryDetailsTable not found');
        this.showMessage('Summary table not found. Please generate the report first.', 'error');
        return;
      }
      
      const tableClone = summaryTable.cloneNode(true);
      // Remove any action buttons from summary table
      tableClone.querySelectorAll('button, .action-btn').forEach(btn => btn.remove());
      const tableHtml = `<div class="print-table-wrapper">${tableClone.outerHTML}</div>`;
      
      const printDocument = this.generatePrintDocument(title, tableHtml, periodInfo);
      this.openPrintWindow(printDocument, title);
    }
  },

  // Open print window with proper handling
  openPrintWindow: function(printContent, title) {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      this.showMessage('Please disable popup blocker to print.', 'error');
      return;
    }

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    
    // Wait for content to load before printing
    setTimeout(() => {
      printWindow.print();
    }, 500);
  },

  // Export to PDF (opens print dialog - user can choose Save as PDF)
  exportToPdf: function(tabName, reportType) {
    this.showMessage('Preparing PDF. In print dialog, choose "Save as PDF" as destination.', 'info');
    
    if (reportType === 'investment') {
      this.printInvestmentReport(tabName);
    } else if (reportType === 'inventory') {
      this.printInventoryReport(tabName);
    } else if (reportType === 'asset') {
      this.printAssetRegister(tabName);
    }
  },

  // Generic print message function
  showMessage: function(message, type) {
    const types = {
      success: { bg: '#c6f6d5', color: '#22543d', border: '#48bb78' },
      error: { bg: '#fed7d7', color: '#742a2a', border: '#f56565' },
      info: { bg: '#bee3f8', color: '#2c5282', border: '#4299e1' },
      warning: { bg: '#feebc8', color: '#7b341e', border: '#ed8936' }
    };

    const style = types[type] || types.info;
    
    const alertDiv = document.createElement('div');
    alertDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${style.bg};
      color: ${style.color};
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      font-weight: 600;
      max-width: 400px;
      border-left: 4px solid ${style.border};
      font-size: 13px;
      animation: slideInRight 0.3s ease-out;
    `;
    alertDiv.textContent = message;
    document.body.appendChild(alertDiv);

    // Add animation style if not exists
    if (!document.getElementById('print-animation-style')) {
      const styleSheet = document.createElement('style');
      styleSheet.id = 'print-animation-style';
      styleSheet.textContent = `
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes slideOutRight {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(100%);
            opacity: 0;
          }
        }
      `;
      document.head.appendChild(styleSheet);
    }

    setTimeout(() => {
      alertDiv.style.animation = 'slideOutRight 0.3s ease-in';
      setTimeout(() => alertDiv.remove(), 300);
    }, 3000);
  }
};

// Make printUtils available globally
window.printUtils = printUtils;

// Auto-initialize
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', function() {
    console.log('Print utils initialized - clean print view ready');
  });
}
