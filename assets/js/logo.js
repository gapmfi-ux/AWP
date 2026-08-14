/**
 * LOGO - Base64 Encoded Image
 * Company logo for payslip and other documents
 */

const COMPANY_LOGO = {
  // Base64 encoded PNG image
  // (Your full base64 string goes here)
  base64: 'data:image/png;base64,PASTE_YOUR_FULL_BASE64_STRING_HERE',
  
  // Fallback text if image fails to load
  fallback: 'GAP'
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = COMPANY_LOGO;
}

// Make available globally in browser
if (typeof window !== 'undefined') {
  window.COMPANY_LOGO = COMPANY_LOGO;
}
