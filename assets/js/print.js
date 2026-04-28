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
  // UPDATED: Reduced font sizes for investment reports + bolder heading colors for print
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
        
        /* Report Header - Enhanced colors for print */
        .print-report-header {
          text-align: center;
          margin-bottom: 16px;
          padding-bottom: 8px;
          page-break-after: avoid;
        }
        
        .report-title {
          font-size: 12pt !important;      /* REDUCED: was 14pt */
          font-weight: 800 !important;
          color: #1e3a5f !important;       /* Enhanced: deeper navy for better print contrast */
          margin: 0;
          padding: 0;
          letter-spacing: 0.3px;
        }
        
        .period-info {
          font-size: 8.5pt !important;     /* REDUCED: was 10pt */
          color: #2c3e50 !important;
          margin-top: 5px;
          padding: 0;
          font-weight: 500;
        }
        
        /* Table Styles - Reduced font size */
        .print-table-wrapper {
          margin: 0;
          page-break-inside: auto;
          overflow-x: visible;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 8pt !important;       /* REDUCED: was 9pt */
          margin: 0;
          page-break-inside: auto;
        }
        
        th {
          background: #1e3a5f !important;   /* Enhanced: solid deep navy, not faint */
          color: white !important;
          padding: 8px 6px;
          border: 1px solid #0f2c45;
          text-align: center;
          font-weight: 800 !important;
          font-size: 8pt !important;
          text-transform: uppercase;
          letter-spacing: 0.4px;
        }
        
        td {
          padding: 6px 5px;
          border: 1px solid #cbd5e0;
          text-align: center;
          font-size: 8pt !important;
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
        
        /* Group Report Styles - Enhanced colors */
        .grouped-report {
          margin-bottom: 14px;
          page-break-inside: avoid;
          break-inside: avoid;
        }
        
        .group-title {
          font-size: 10.5pt !important;     /* REDUCED: was 11pt */
          font-weight: 800 !important;
          background: #1e3a5f !important;   /* Enhanced: solid navy for print */
          color: white !important;
          padding: 6px 12px;
          margin: 10px 0 0 0;
          border-radius: 4px 4px 0 0;
          page-break-after: avoid;
          break-after: avoid;
          border-bottom: 1px solid #2d4a74;
        }
        
        .group-table-wrapper {
          border: 1px solid #cbd5e0;
          border-top: none;
          border-radius: 0 0 4px 4px;
          overflow-x: auto;
          margin-bottom: 0;
        }
        
        .subtotal-row {
          background: #eef2ff !important;
          font-weight: 800 !important;
        }
        
        .subtotal-row td {
          background: #eef2ff !important;
          color: #1e3a5f !important;
          border-top: 1px solid #4361ee;
          border-bottom: 1px solid #4361ee;
          font-weight: 800 !important;
        }
        
        .grand-total-row {
          background: #e6f7f0 !important;
          font-weight: 800 !important;
        }
        
        .grand-total-row td {
          background: #e6f7f0 !important;
          color: #0b5e35 !important;
          border-top: 2px solid #0d6e42;
          border-bottom: 2px solid #0d6e42;
          font-weight: 800 !important;
          font-size: 9pt !important;
        }
        
        .total-row {
          background: #e6f7f0 !important;
          font-weight: 800 !important;
        }
        
        .total-row td {
          background: #e6f7f0 !important;
          color: #0b5e35 !important;
          border-top: 2px solid #0d6e42;
          font-weight: 800 !important;
        }
        
        .group-header {
          background: #e2e8f0 !important;
          font-weight: 700 !important;
        }
        
        .group-header td {
          background: #e2e8f0 !important;
          color: #0f2c45 !important;
          border-top: 2px solid #cbd5e0;
          border-bottom: 1px solid #cbd5e0;
          font-weight: 700;
        }
        
        .group-total-row {
          background: #fef3c7 !important;
          font-weight: 600 !important;
        }
        
        .group-total-row td {
          background: #fef3c7 !important;
          color: #1a202c !important;
          border-top: 1px solid #f59e0b;
          border-bottom: 1px solid #f59e0b;
          font-weight: 600;
        }
        
        /* PDF print optimization */
        @media print {
          @page {
            size: A4 landscape;
            margin: 15mm 12mm;
          }
          
          @page :first {
            margin-top: 15mm;
          }
          
          /* Hide URL, date, page numbers */
          @page {
            @bottom-left {
              content: '';
            }
            @bottom-center {
              content: '';
            }
            @bottom-right {
              content: '';
            }
            @top-left {
              content: '';
            }
            @top-center {
              content: '';
            }
            @top-right {
              content: '';
            }
          }
          
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: auto !important;
          }
          
          body {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            background: white !important;
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
          .dropdown-item,
          .btn,
          [type="button"],
          [type="submit"] {
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
      if (thText.includes('action') || thText.includes('menu') || thText.includes('pay') || thText.includes('renew')) {
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
    clone.querySelectorAll('button, .action-btn, .dropdown-item, .pay-btn, .renew-btn').forEach(btn => {
      btn.remove();
    });
    
    return clone;
  },

  // Generate clean print document (fallback for browser print)
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
      </head>
      <body>
        ${headerHtml}
        ${contentHtml}
      </body>
      </html>
    `;
  },

  // ============================================
  // NEW: Download PDF via Google Apps Script (Server-side)
  // ============================================
  
  /**
   * Download report as PDF directly (no print dialog)
   * Uses Google Apps Script server-side PDF generation
   */
  downloadReportAsPDF: async function(contentHtml, title, periodInfo) {
    try {
      this.showMessage('Generating PDF, please wait...', 'info');
      
      // Check if API is available
      if (!window.API || typeof window.API.downloadReportAsPDF !== 'function') {
        console.warn('API.downloadReportAsPDF not found, falling back to browser print');
        this.fallbackToPrint(contentHtml, title, periodInfo);
        return;
      }
      
      // Use server-side PDF generation
      const result = await window.API.downloadReportAsPDF(contentHtml, title, periodInfo);
      
      if (result && result.success) {
        this.showMessage(`PDF downloaded: ${result.filename}`, 'success');
      } else {
        throw new Error(result?.error || 'PDF generation failed');
      }
    } catch (error) {
      console.error('PDF download error:', error);
      this.showMessage('PDF generation failed: ' + error.message, 'error');
      // Fallback to browser print
      this.fallbackToPrint(contentHtml, title, periodInfo);
    }
  },

  /**
   * Fallback method: Use browser print dialog if server-side fails
   */
  fallbackToPrint: function(contentHtml, title, periodInfo) {
    this.showMessage('Using browser print dialog as fallback...', 'warning');
    const printDocument = this.generatePrintDocument(title, contentHtml, periodInfo);
    this.openPrintWindow(openPrintWindow, title);
  },

  /**
   * Open print window with proper handling (fallback)
   */
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

  /**
   * Save PDF directly to Google Drive (optional)
   */
  savePDFToDrive: async function(contentHtml, title, periodInfo, folderId = null) {
    try {
      this.showMessage('Saving PDF to Google Drive...', 'info');
      
      if (!window.API || typeof window.API.savePDFToDrive !== 'function') {
        throw new Error('API.savePDFToDrive not available');
      }
      
      const result = await window.API.savePDFToDrive(contentHtml, title, periodInfo, folderId);
      
      if (result && result.success) {
        this.showMessage(`PDF saved to Drive: ${result.fileName}`, 'success');
        // Optionally open the file in new tab
        if (result.fileUrl) {
          window.open(result.fileUrl, '_blank');
        }
      } else {
        throw new Error(result?.error || 'Save to Drive failed');
      }
    } catch (error) {
      console.error('Save to Drive error:', error);
      this.showMessage('Failed to save to Drive: ' + error.message, 'error');
    }
  },

  // ============================================
  // INVESTMENT REPORT METHODS
  // ============================================

  // Print investment report (now downloads as PDF)
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

  // Print investment table (now downloads as PDF)
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
    
    // Download as PDF directly (server-side)
    this.downloadReportAsPDF(tableHtml, title, periodInfo);
  },

  // Print investment container (grouped reports) - now downloads as PDF
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
    
    // Download as PDF directly (server-side)
    this.downloadReportAsPDF(containerHTML, title, periodInfo);
  },

  // ============================================
  // SUBSCRIPTION REPORT METHODS
  // ============================================

  // Print subscription schedule report (now downloads as PDF)
  printSubscriptionReport: function(tabName) {
    console.log('printSubscriptionReport called for tab:', tabName);
    
    let title = '';
    let periodInfo = '';
    
    if (tabName === 'allSchedule') {
      title = 'SUBSCRIPTION & LICENSE SCHEDULE';
      const fromDate = document.getElementById('fromDate')?.value || '';
      const toDate = document.getElementById('toDate')?.value || '';
      if (fromDate && toDate) {
        periodInfo = `Period: ${fromDate} to ${toDate}`;
      }
      this.printSubscriptionContainer('allScheduleWrapper', title, periodInfo);
    } else if (tabName === 'prepaid') {
      title = 'PREPAID SUBSCRIPTIONS REPORT';
      const fromDate = document.getElementById('fromDatePrepaid')?.value || '';
      const toDate = document.getElementById('toDatePrepaid')?.value || '';
      if (fromDate && toDate) {
        periodInfo = `Period: ${fromDate} to ${toDate}`;
      }
      this.printSubscriptionTable('prepaidTableBody', title, periodInfo, 'prepaidTableFooter');
    } else if (tabName === 'arrears') {
      title = 'IN ARREARS SUBSCRIPTIONS REPORT';
      const fromDate = document.getElementById('fromDateArrears')?.value || '';
      const toDate = document.getElementById('toDateArrears')?.value || '';
      if (fromDate && toDate) {
        periodInfo = `Period: ${fromDate} to ${toDate}`;
      }
      this.printSubscriptionTable('arrearsTableBody', title, periodInfo, 'arrearsTableFooter');
    } else if (tabName === 'expired') {
      title = 'EXPIRED SUBSCRIPTIONS REPORT';
      periodInfo = `As at: ${new Date().toLocaleDateString('en-GB')}`;
      this.printSubscriptionTable('expiredTableBody', title, periodInfo);
    }
  },

  // Print subscription table (now downloads as PDF)
  printSubscriptionTable: function(tableBodyId, title, periodInfo, footerId) {
    const tbody = document.getElementById(tableBodyId);
    if (!tbody) {
      console.error('Table body not found:', tableBodyId);
      this.showMessage('Report table not found. Please ensure report is loaded.', 'error');
      return;
    }

    // Create table structure
    const table = document.createElement('table');
    
    // Get headers from the actual table if it exists
    const actualTable = tbody.closest('table');
    if (actualTable) {
      const theadClone = actualTable.querySelector('thead').cloneNode(true);
      table.appendChild(theadClone);
    }
    
    // Clone tbody and remove action columns
    const tbodyClone = tbody.cloneNode(true);
    
    // Remove Pay and Renew buttons
    tbodyClone.querySelectorAll('.pay-btn, .renew-btn, button').forEach(btn => {
      btn.remove();
    });
    
    table.appendChild(tbodyClone);
    
    // Add footer if exists
    if (footerId) {
      const footer = document.getElementById(footerId);
      if (footer) {
        const tfootClone = footer.cloneNode(true);
        table.appendChild(tfootClone);
      }
    }
    
    const tableHtml = `<div class="print-table-wrapper">${table.outerHTML}</div>`;
    
    // Download as PDF directly
    this.downloadReportAsPDF(tableHtml, title, periodInfo);
  },

  // Print subscription container (grouped reports) - now downloads as PDF
  printSubscriptionContainer: function(containerId, title, periodInfo) {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error('Container not found:', containerId);
      this.showMessage('Report container not found. Please ensure report is loaded.', 'error');
      return;
    }

    let containerHTML = container.innerHTML;
    if (!containerHTML || containerHTML.trim() === '' || containerHTML.includes('Loading') || containerHTML.includes('No subscriptions')) {
      this.showMessage('Report is empty. Please generate the report first.', 'error');
      return;
    }

    // Remove action buttons and interactive elements
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = containerHTML;
    tempDiv.querySelectorAll('.action-btn, button, .dropdown-item, .pay-btn, .renew-btn, [onclick]').forEach(el => {
      el.remove();
    });
    tempDiv.querySelectorAll('*').forEach(el => {
      el.removeAttribute('onclick');
      el.removeAttribute('onchange');
    });
    containerHTML = tempDiv.innerHTML;
    
    // Download as PDF directly
    this.downloadReportAsPDF(containerHTML, title, periodInfo);
  },

  // ============================================
  // INVENTORY REPORT METHODS
  // ============================================

  // Print inventory report (now downloads as PDF)
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

  // ============================================
  // ASSET REGISTER METHODS
  // ============================================

  // Print asset register (now downloads as PDF)
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
      
      // Download as PDF directly
      this.downloadReportAsPDF(tableHtml, title, periodInfo);
    }
  },

  // ============================================
  // UTILITY METHODS
  // ============================================

  // Show message notification
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
