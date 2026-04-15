/* ============================================
   ENHANCED UNIFIED PRINT MODULE
   COMPLETELY REMOVE browser headers/footers - Consistent margins on ALL pages
   ============================================ */

// Global print utility with clean formatting
const printUtils = {
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
      .replace(/'/g, '&#39;');
  },

  // Get clean print styles - Aggressively remove browser headers/footers
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
          font-size: 10pt;
          line-height: 1.4;
          color: #1a202c;
          background: white;
        }
        
        /* Report Header */
        .print-report-header {
          text-align: center;
          margin-bottom: 16px;
          padding-bottom: 8px;
          page-break-after: avoid;
        }
        
        .report-title {
          font-size: 14pt;
          font-weight: 700;
          color: #2c3e66;
          margin: 0;
          padding: 0;
        }
        
        .period-info {
          font-size: 10pt;
          color: #4a5568;
          margin-top: 5px;
          padding: 0;
        }
        
        /* Table Styles */
        .print-table-wrapper {
          margin: 0;
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
          padding: 8px 6px;
          border: 1px solid #1a2a4a;
          text-align: center;
          font-weight: 700;
          font-size: 9pt;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        td {
          padding: 6px 5px;
          border: 1px solid #cbd5e0;
          text-align: center;
          font-size: 9pt;
          color: #2d3748;
          vertical-align: middle;
        }
        
        tbody tr:nth-child(even) {
          background: #f9fafb;
        }
        
        /* Text alignment classes */
        .text-left {
          text-align: left !important;
        }
        
        .text-right {
          text-align: right !important;
          padding-right: 8px !important;
        }
        
        .text-center {
          text-align: center !important;
        }
        
        /* Group Report Styles */
        .grouped-report {
          margin-bottom: 14px;
          page-break-inside: avoid;
          break-inside: avoid;
        }
        
        .group-title {
          font-size: 11pt;
          font-weight: 800;
          background: linear-gradient(135deg, #2c3e66, #4361ee);
          color: white;
          padding: 6px 10px;
          margin: 10px 0 0 0;
          border-radius: 4px 4px 0 0;
          page-break-after: avoid;
          break-after: avoid;
        }
        
        .group-table-wrapper {
          border: 1px solid #cbd5e0;
          border-top: none;
          border-radius: 0 0 4px 4px;
          overflow-x: auto;
          margin-bottom: 0;
        }
        
        .subtotal-row {
          background: #e8f0fe !important;
          font-weight: 700;
        }
        
        .subtotal-row td {
          background: #e8f0fe !important;
          color: #2c3e66 !important;
          border-top: 1px solid #4361ee;
          border-bottom: 1px solid #4361ee;
          font-weight: 700;
        }
        
        .grand-total-row {
          background: #e6f7f0 !important;
          font-weight: 800;
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
        
        /* CRITICAL: Aggressively remove browser headers/footers */
        @media print {
          /* Remove default browser print header/footer completely */
          @page {
            size: A4 landscape;
            margin: 15mm 12mm;
          }
          
          /* Hide URL, date, page numbers, and any browser-generated content */
          @page :header {
            display: none;
          }
          
          @page :footer {
            display: none;
          }
          
          /* Reset all margins */
          html, body {
            margin: 0 !important;
            padding: 0 !important;
          }
          
          body {
            margin: 0 !important;
            padding: 0 !important;
            width: 100%;
          }
          
          /* Hide any potential browser-generated elements */
          header, footer, nav, aside, .no-print {
            display: none !important;
          }
          
          /* Ensure consistent spacing on all pages */
          .print-table-wrapper,
          .grouped-report {
            page-break-inside: avoid;
          }
          
          /* Hide action buttons */
          .action-btn, 
          button, 
          .dropdown-item {
            display: none !important;
          }
          
          /* Prevent orphaned headers */
          thead {
            display: table-header-group;
          }
          
          tr {
            page-break-inside: avoid;
          }
        }
      </style>
    `;
  },

  // Remove action button columns from tables
  removeActionColumns: function(table) {
    const clone = table.cloneNode(true);
    
    // Find and remove action column
    const headerCells = clone.querySelectorAll('thead th');
    let actionColumnIndex = -1;
    
    headerCells.forEach((th, index) => {
      const thText = th.textContent.toLowerCase();
      if (thText.includes('action') || thText.includes('menu')) {
        actionColumnIndex = index;
      }
    });

    if (actionColumnIndex >= 0) {
      const headerRow = clone.querySelector('thead tr');
      if (headerRow && headerRow.cells[actionColumnIndex]) {
        headerRow.deleteCell(actionColumnIndex);
      }
      
      clone.querySelectorAll('tbody tr').forEach(row => {
        if (row.cells[actionColumnIndex]) {
          row.deleteCell(actionColumnIndex);
        }
      });
    }
    
    // Remove any buttons
    clone.querySelectorAll('button, .action-btn, .dropdown-item').forEach(btn => {
      btn.remove();
    });
    
    return clone;
  },

  // Generate clean print document - NO browser headers/footers
  generatePrintDocument: function(title, contentHtml, periodInfo) {
    let headerHtml = '';
    if (title || periodInfo) {
      headerHtml = `
        <div class="print-report-header">
          ${title ? `<div class="report-title">${this.escapeHtml(title)}</div>` : ''}
          ${periodInfo ? `<div class="period-info">${this.escapeHtml(periodInfo)}</div>` : ''}
        </div>
      `;
    }
    
    return `<!DOCTYPE html>
      <html>
      <head>
        <title>${this.escapeHtml(title || 'Report')}</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        ${this.getPrintStyles()}
        <style>
          /* Multiple overrides to ensure no browser headers/footers */
          @media print {
            @page {
              margin: 15mm 12mm;
            }
            @page :header {
              display: none;
            }
            @page :footer {
              display: none;
            }
            body {
              margin: 0;
              padding: 0;
            }
            /* Hide any potential print headers */
              }
            }
          }
        </style>
      </head>
      <body>
        ${headerHtml}
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
    const container = document.getElementById(containerId);
    if (!container) {
      console.error('Container not found:', containerId);
      this.showMessage('Report container not found. Please ensure report is loaded.', 'error');
      return;
    }

    let containerHTML = container.innerHTML;
    if (!containerHTML || containerHTML.trim() === '' || containerHTML.includes('Loading') || containerHTML.includes('No investments')) {
      this.showMessage('Report is empty. Please generate the report first.', 'error');
      return;
    }

    // Remove action buttons and interactive elements
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = containerHTML;
    tempDiv.querySelectorAll('.action-btn, button, .dropdown-item, [onclick]').forEach(el => {
      el.remove();
    });
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
      
      const summaryTable = document.getElementById('summaryDetailsTable');
      if (!summaryTable) {
        this.showMessage('Summary table not found. Please generate the report first.', 'error');
        return;
      }
      
      const tableClone = summaryTable.cloneNode(true);
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
    
    setTimeout(() => {
      printWindow.print();
    }, 500);
  },

  // Show message
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
    `;
    alertDiv.textContent = message;
    document.body.appendChild(alertDiv);

    setTimeout(() => {
      alertDiv.remove();
    }, 3000);
  }
};

// Make printUtils available globally
window.printUtils = printUtils;
