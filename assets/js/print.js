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
        
        .print-report-header {
          text-align: center;
          margin-bottom: 16px;
          padding-bottom: 8px;
          page-break-after: avoid;
        }
        
        .report-title {
          font-size: 12pt !important;
          font-weight: 800 !important;
          color: #1e3a5f !important;
          margin: 0;
          padding: 0;
          letter-spacing: 0.3px;
        }
        
        .period-info {
          font-size: 8.5pt !important;
          color: #2c3e50 !important;
          margin-top: 5px;
          padding: 0;
          font-weight: 500;
        }
        
        .print-table-wrapper {
          margin: 0;
          page-break-inside: auto;
          overflow-x: visible;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 8pt !important;
          margin: 0;
          page-break-inside: auto;
        }
        
        th {
          background: #1e3a5f !important;
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
        
        .grouped-report {
          margin-bottom: 14px;
          page-break-inside: avoid;
          break-inside: avoid;
        }
        
        .group-title {
          font-size: 10.5pt !important;
          font-weight: 800 !important;
          background: #1e3a5f !important;
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
        
        @media print {
          @page {
            size: A4 landscape;
            margin: 15mm 12mm;
          }
          @page {
            @bottom-left { content: ''; }
            @bottom-center { content: ''; }
            @bottom-right { content: ''; }
            @top-left { content: ''; }
            @top-center { content: ''; }
            @top-right { content: ''; }
          }
          thead { display: table-header-group; }
          tr { page-break-inside: avoid; }
          .no-print, button, .action-btn { display: none !important; }
        }
      </style>
    `;
  },

  // Remove action button columns from tables
  removeActionColumns: function(table) {
    const clone = table.cloneNode(true);
    
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
  // PDF GENERATION - Using Google Apps Script
  // ============================================

  /**
   * Download report as PDF using server-side generation
   */
  downloadReportAsPDF: async function(contentHtml, title, periodInfo) {
    try {
      this.showMessage('Generating PDF, please wait...', 'info');
      
      // Call the Google Apps Script function
      // Using the existing API infrastructure
      const action = 'generateReportPDF'; // This must match your GAS action
      
      const response = await this.callApiAction(action, {
        htmlContent: contentHtml,
        reportTitle: title,
        periodInfo: periodInfo
      });
      
      if (response && response.success && response.pdfBase64) {
        // Convert base64 to blob and download
        this.triggerDownload(response.pdfBase64, response.filename || `${title.replace(/[^a-z0-9]/gi, '_')}.pdf`);
        this.showMessage('PDF downloaded successfully!', 'success');
      } else {
        throw new Error(response?.error || 'PDF generation failed');
      }
    } catch (error) {
      console.error('PDF download error:', error);
      this.showMessage('PDF generation failed: ' + error.message + '. Using browser print...', 'warning');
      this.fallbackToBrowserPrint(contentHtml, title, periodInfo);
    }
  },

  /**
   * Call API action through existing infrastructure
   */
  callApiAction: function(action, data) {
    return new Promise((resolve, reject) => {
      try {
        const callbackName = 'pdf_callback_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const baseUrl = 'https://script.google.com/macros/s/AKfycbyh-69v4qQbQYFJp6ZeHmnr_vOLuzBgRYjf0F2YeWa0W3k2RC_OMeCnT9V-Wq6Yu5G3/exec';
        
        const url = new URL(baseUrl);
        url.searchParams.append('action', action);
        url.searchParams.append('data', JSON.stringify(data));
        url.searchParams.append('callback', callbackName);
        
        const timeoutId = setTimeout(() => {
          if (window[callbackName]) {
            delete window[callbackName];
            reject(new Error('Request timeout after 30 seconds'));
          }
        }, 30000);
        
        window[callbackName] = (response) => {
          clearTimeout(timeoutId);
          delete window[callbackName];
          if (script.parentNode) script.parentNode.removeChild(script);
          
          if (response && response.success !== false) {
            resolve(response);
          } else {
            reject(new Error(response?.error || 'API request failed'));
          }
        };
        
        const script = document.createElement('script');
        script.src = url.toString();
        script.onerror = () => {
          clearTimeout(timeoutId);
          delete window[callbackName];
          reject(new Error('Network error - failed to connect to server'));
        };
        
        document.head.appendChild(script);
        
      } catch (error) {
        reject(error);
      }
    });
  },

  /**
   * Trigger browser download from base64 PDF data
   */
  triggerDownload: function(base64Data, filename) {
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'application/pdf' });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  /**
   * Fallback: Use browser print dialog
   */
  fallbackToBrowserPrint: function(contentHtml, title, periodInfo) {
    const printDocument = this.generatePrintDocument(title, contentHtml, periodInfo);
    this.openPrintWindow(printDocument, title);
  },

  /**
   * Open print window (fallback method)
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

  // ============================================
  // INVESTMENT REPORT METHODS
  // ============================================

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
    
    this.downloadReportAsPDF(tableHtml, title, periodInfo);
  },

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
    
    this.downloadReportAsPDF(containerHTML, title, periodInfo);
  },

  // ============================================
  // SUBSCRIPTION REPORT METHODS
  // ============================================

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

  printSubscriptionTable: function(tableBodyId, title, periodInfo, footerId) {
    const tbody = document.getElementById(tableBodyId);
    if (!tbody) {
      console.error('Table body not found:', tableBodyId);
      this.showMessage('Report table not found. Please ensure report is loaded.', 'error');
      return;
    }

    const table = document.createElement('table');
    const actualTable = tbody.closest('table');
    if (actualTable) {
      const theadClone = actualTable.querySelector('thead').cloneNode(true);
      table.appendChild(theadClone);
    }
    
    const tbodyClone = tbody.cloneNode(true);
    tbodyClone.querySelectorAll('.pay-btn, .renew-btn, button').forEach(btn => {
      btn.remove();
    });
    table.appendChild(tbodyClone);
    
    if (footerId) {
      const footer = document.getElementById(footerId);
      if (footer) {
        const tfootClone = footer.cloneNode(true);
        table.appendChild(tfootClone);
      }
    }
    
    const tableHtml = `<div class="print-table-wrapper">${table.outerHTML}</div>`;
    this.downloadReportAsPDF(tableHtml, title, periodInfo);
  },

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
    
    this.downloadReportAsPDF(containerHTML, title, periodInfo);
  },

  // ============================================
  // INVENTORY REPORT METHODS
  // ============================================

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
      
      this.downloadReportAsPDF(tableHtml, title, periodInfo);
    }
  },

  // ============================================
  // UTILITY METHODS
  // ============================================

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

window.printUtils = printUtils;
