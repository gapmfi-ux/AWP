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

  // Get print styles
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
        
        /* Group Title */
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
        
        .group-table {
          width: 100%;
          border-collapse: collapse;
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
        
        .text-right {
          text-align: right;
        }
        
        @page {
          margin: 0.5in;
          size: A4;
        }
        
        @media print {
          * {
            margin: 0 !important;
            padding: 0 !important;
          }
          
          html, body {
            margin: 0;
            padding: 0.5in;
            width: 100%;
          }
          
          body {
            padding: 0.5in !important;
          }
          
          table {
            page-break-inside: avoid;
          }
          
          th, td {
            border: 1px solid #999;
          }
          
          .grouped-report {
            page-break-inside: avoid;
          }
          
          thead {
            display: table-header-group;
          }
        }
      </style>
    `;
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

    const tableClone = originalTable.cloneNode(true);
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
      alert('Please disable popup blocker to print.');
      return;
    }

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
      printWindow.print();
      setTimeout(() => {
        printWindow.close();
      }, 500);
    }, 300);
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

    const containerHTML = container.innerHTML;
    if (!containerHTML || containerHTML.trim() === '') {
      console.error('Container is empty');
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

    const printWindow = window.open('', '_blank', 'width=1200,height=700');
    if (!printWindow) {
      alert('Please disable popup blocker to print.');
      return;
    }

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
      printWindow.print();
      setTimeout(() => {
        printWindow.close();
      }, 500);
    }, 300);
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
      this.printInvestmentTable('summaryDetailsTable', title, dateInfo);
    }
  }
};

// Make printUtils available globally
window.printUtils = printUtils;
