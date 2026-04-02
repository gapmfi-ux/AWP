/* ============================================
   ACCOUNTS WORKSPACE - CONFIGURATION
   ============================================ */

window.APP_CONFIG = {
  API_URL: 'https://script.google.com/macros/s/AKfycbyh-69v4qQbQYFJp6ZeHmnr_vOLuzBgRYjf0F2YeWa0W3k2RC_OMeCnT9V-Wq6Yu5G3/exec',
  
  // Google Sheet IDs (keep these as they are)
  SHEETS: {
    PV: '1vb3sUPMXWi455HVG6PbeWiWGLt-ek9DbwrY7Bw_yuKw',
    INVENTORY: '1tgE_a9Bv5uuBSDcRYqtfifxHTAXhTILxHDI22z4C1TA',
    ASSETS: '1PnGJmfxZjdDxGhC7ddJE4dh3jhzdIz7Vo9UuzweptfU',
    INVESTMENTS: '1JxY5-A2A4xOKIF2NnB9n9yqTYO34Q7oP1N3D9wHfbkw'
  },
  
  // Voucher prefixes
  VOUCHER_PREFIXES: {
    'Payment Voucher': 'PVNO.FT',
    'Cash Payment Voucher': 'PVNO.CH',
    'Cheque Payment Voucher': 'PVNO.CQ'
  },
  
  // Asset Types
  ASSET_TYPES: {
    'Computers & Accessories': { prefix: 'GAPMFI/CA', lifeSpan: 3, rate: 33.33 },
    'Furniture and Fixtures': { prefix: 'GAPMFI/FFF', lifeSpan: 3, rate: 33.33 },
    'Office Equipment': { prefix: 'GAPMFI/OE', lifeSpan: 3, rate: 33.33 },
    'Software': { lifeSpan: 3, rate: 33.33 },
    'Fittings': { lifeSpan: 5, rate: 20.00 },
    'Motor Vehicle': { lifeSpan: 5, rate: 20.00 }
  },
  
  // Investment Prefixes
  INVESTMENT_PREFIXES: {
    'Fixed Deposit': 'FD',
    'Treasury Bills': 'Tbill',
    'Bonds': 'Bond'
  }
};
