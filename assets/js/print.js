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
          line-height: 1.3;
          color: #1a202c;
          background: white;
          margin: 0 !important;
          padding: 0 !important;
        }
        
        /* Report Header */
        .print-report-header {
          text-align: center;
          margin-bottom: 8px;
          padding-bottom: 4px;
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
          font-size: 9pt;
          color: #4a5568;
          margin-top: 3px;
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
          font-size: 8pt;
          margin: 0;
          page-break-inside: auto;
        }
        
        th {
          background: #2c3e66;
          color: white;
          padding: 6px 4px;
          border: 1px solid #1a2a4a;
          text-align: center;
          font-weight: 700;
          font-size: 8pt;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        
        td {
          padding: 5px 4px;
          border: 1px solid #cbd5e0;
          text-align: center;
          font-size: 8pt;
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
          padding-right: 6px !important;
        }
        
        .text-center {
          text-align: center !important;
        }
        
        /* Group Report Styles */
        .grouped-report {
          margin-bottom: 10px;
          page-break-inside: avoid;
          break-inside: avoid;
        }
        
        .group-title {
          font-size: 10pt;
          font-weight: 800;
          background: linear-gradient(135deg, #2c3e66, #4361ee);
          color: white;
          padding: 5px 8px;
          margin: 8px 0 0 0;
          border-radius: 3px 3px 0 0;
          page-break-after: avoid;
          break-after: avoid;
        }
        
        .group-table-wrapper {
          border: 1px solid #cbd5e0;
          border-top: none;
          border-radius: 0 0 3px 3px;
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
          font-size: 9pt;
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
        
        .group-header {
          background: #e2e8f0 !important;
          font-weight: 700 !important;
        }
        
        .group-header td {
          background: #e2e8f0 !important;
          color: #1e293b !important;
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
        
        /* CRITICAL: Aggressively remove browser headers/footers */
        @media print {
          @page {
            size: A4 landscape;
            margin: 10mm 8mm;
          }
          
          /* Hide browser-generated headers and footers */
          @page :first {
            margin-top: 10mm;
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
          
          /* Ensure consistent spacing on all pages - reduce gaps */
          .print-table-wrapper,
          .grouped-report {
            page-break-inside: avoid;
            margin-bottom: 0;
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
          
          /* Remove extra spacing between elements */
          div, section, article {
            margin: 0;
            padding: 0;
          }
        }
      </style>
    `;
  },
  
  // Remove action button columns from tables - Enhanced version
  removeActionColumns: function(table) {
    const clone = table.cloneNode(true);
    
    // Helper function to check if a cell is an action column
    const isActionColumn = (cell) => {
      const text = cell.textContent.toLowerCase().trim();
      // Check header text for action-related words
      if (text === 'action' || text === 'actions' || text === 'menu' || 
          text === 'pay' || text === 'renew' || text === 'edit' || 
          text === 'delete' || text === 'manage' || text === 'options' ||
          text.includes('action') || text.includes('menu')) {
        return true;
      }
      
      // Check if cell contains any buttons
      const buttons = cell.querySelectorAll('button, .btn, .action-btn, .dropdown-item, [onclick]');
      if (buttons.length > 0) {
        return true;
      }
      
      // Check for common action icons or text
      const html = cell.innerHTML.toLowerCase();
      if (html.includes('fa-') && (html.includes('edit') || html.includes('delete') || 
          html.includes('trash') || html.includes('pencil'))) {
        return true;
      }
      
      return false;
    };
    
    // Remove action columns from thead
    const thead = clone.querySelector('thead');
    if (thead) {
      const headerRows = thead.querySelectorAll('tr');
      headerRows.forEach(headerRow => {
        const cells = Array.from(headerRow.cells);
        // Find indices of action columns (from right to left to avoid index shifting)
        const actionIndices = [];
        cells.forEach((cell, idx) => {
          if (isActionColumn(cell)) {
            actionIndices.push(idx);
          }
        });
        
        // Remove from highest index first
        actionIndices.sort((a, b) => b - a);
        actionIndices.forEach(idx => {
          if (headerRow.cells[idx]) {
            headerRow.deleteCell(idx);
          }
        });
      });
    }
    
    // Remove action columns and buttons from tbody
    const tbody = clone.querySelector('tbody');
    if (tbody) {
      // First, determine which columns to remove based on thead after removal
      // Get remaining column count from first row
      const firstBodyRow = tbody.querySelector('tr');
      let columnsToRemove = [];
      
      if (firstBodyRow) {
        // Check each cell in first row for action content
        Array.from(firstBodyRow.cells).forEach((cell, idx) => {
          if (isActionColumn(cell)) {
            columnsToRemove.push(idx);
          }
        });
        
        // Remove from highest index first
        columnsToRemove.sort((a, b) => b - a);
        
        // Remove cells from all rows
        tbody.querySelectorAll('tr').forEach(row => {
          columnsToRemove.forEach(idx => {
            if (row.cells[idx]) {
              row.deleteCell(idx);
            }
          });
        });
      }
      
      // Also remove any remaining buttons that might be standalone
      tbody.querySelectorAll('button, .action-btn, .dropdown-item, .pay-btn, .renew-btn').forEach(btn => {
        const cell = btn.closest('td');
        if (cell && cell.cells) {
          // If the cell only contains buttons, remove the entire cell
          if (cell.children.length === 1 && cell.querySelector('button')) {
            const row = cell.parentNode;
            const idx = Array.from(row.cells).indexOf(cell);
            if (idx !== -1) {
              row.deleteCell(idx);
            }
          } else {
            // Otherwise just remove the button
            btn.remove();
          }
        } else {
          btn.remove();
        }
      });
    }
    
    // Also check tfoot if exists
    const tfoot = clone.querySelector('tfoot');
    if (tfoot) {
      tfoot.querySelectorAll('tr').forEach(row => {
        const cells = Array.from(row.cells);
        const actionIndices = [];
        cells.forEach((cell, idx) => {
          if (isActionColumn(cell)) {
            actionIndices.push(idx);
          }
        });
        actionIndices.sort((a, b) => b - a);
        actionIndices.forEach(idx => {
          if (row.cells[idx]) {
            row.deleteCell(idx);
          }
        });
      });
    }
    
    // Final cleanup: remove any remaining button elements
    clone.querySelectorAll('button, .action-btn, .dropdown-item, .pay-btn, .renew-btn, .edit-btn, .delete-btn').forEach(btn => {
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
      </head>
      <body>
        ${headerHtml}
        ${contentHtml}
      </body>
      </html>
    `;
  },

  /* ============== PAYROLL PRINT FUNCTION ============== */
  
  printPayrollTable: function() {
    const table = document.getElementById('payrollTable');
    if (!table) {
      this.showMessage('Payroll table not found.', 'error');
      return;
    }

    // Get the period from the header
    const headerTitle = document.querySelector('.payroll-header h2');
    let title = 'PAYROLL REPORT';
    let periodInfo = '';

    if (headerTitle) {
      const text = headerTitle.textContent.trim();
      if (text.includes('PAYROLL FOR')) {
        title = text;
        // Extract period from header
        const match = text.match(/PAYROLL FOR (.+)/);
        if (match) {
          periodInfo = `Period: ${match[1]}`;
        }
      }
    }

    // If no period in header, try to get from period input
    if (!periodInfo) {
      const periodInput = document.getElementById('payPeriodSelect');
      if (periodInput && periodInput.value) {
        const [year, month] = periodInput.value.split('-');
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                            'July', 'August', 'September', 'October', 'November', 'December'];
        const monthName = monthNames[parseInt(month) - 1] || month;
        periodInfo = `Period: ${monthName} ${year}`;
      }
    }

    // Clone the table and remove action columns
    const tableClone = this.removeActionColumns(table);
    
    // Remove the "zero" class spans from numbers (they show dashes)
    tableClone.querySelectorAll('.zero').forEach(el => {
      el.textContent = '—';
    });

    const tableHtml = `<div class="print-table-wrapper">${tableClone.outerHTML}</div>`;
    const printDocument = this.generatePrintDocument(title, tableHtml, periodInfo);
    this.openPrintWindow(printDocument, title);
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

  // Print subscription schedule report
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
