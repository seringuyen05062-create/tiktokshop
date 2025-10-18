/**
 * TikTok Shop selectors and constants
 */

export const SELECTORS = {
  // Shop page selectors
  shop: {
    name: '[data-testid="shop-name"], .shop-header h1, .shop-name',
    productList: '[data-testid="product-list"], .product-list, .goods-list',
    productItem: '[data-testid="product-item"], .product-item, .goods-item',
    productLink: 'a[href*="/product/"]',
    productTitle: '.product-title, .goods-title, [data-testid="product-title"]',
    productPrice: '.product-price, .goods-price, [data-testid="product-price"]',
    productSold: '.product-sold, .goods-sold, [data-testid="product-sold"]',
    nextPage: '[data-testid="next-page"], .pagination-next, .next-page',
    pagination: '.pagination, [data-testid="pagination"]',
  },
  
  // Product detail page selectors
  product: {
    title: 'h1[data-testid="product-title"], .product-title h1, .goods-detail-title',
    price: {
      current: '[data-testid="current-price"], .current-price, .price-current',
      original: '[data-testid="original-price"], .original-price, .price-original',
    },
    sold: '[data-testid="sold-count"], .sold-count, .goods-sold-count',
    rating: '[data-testid="rating"], .rating, .goods-rating',
    stock: '[data-testid="stock"], .stock, .goods-stock',
    thumbnail: '.product-image img, .goods-image img, [data-testid="product-image"]',
    shopLink: 'a[href*="/shop/"], [data-testid="shop-link"]',
    shopName: '.shop-name, [data-testid="shop-name"]',
  },

  // Common selectors
  common: {
    loading: '.loading, [data-testid="loading"], .spinner',
    error: '.error, [data-testid="error"], .error-message',
    captcha: 'iframe[src*="recaptcha"], .captcha, #captcha, [data-sitekey]',
    popup: '.popup, .modal, [data-testid="popup"]',
    closeButton: '.close, .btn-close, [data-testid="close"]',
  },

  // Anti-detection selectors
  detection: {
    webdriver: '[data-webdriver]',
    automation: '[data-automation]',
    testid: '[data-testid*="test"]',
  },
} as const;

export const URLS = {
  base: 'https://shop.tiktok.com',
  shop: (shopId: string) => `https://shop.tiktok.com/view/shop/${shopId}`,
  product: (productId: string) => `https://shop.tiktok.com/view/product/${productId}`,
} as const;

export const TIMEOUTS = {
  navigation: 30000,
  element: 10000,
  request: 15000,
  captcha: 60000,
} as const;

export const DELAYS = {
  min: 1000,
  max: 3000,
  captcha: 5000,
  error: 2000,
} as const;

// Regex patterns for data extraction
export const PATTERNS = {
  shopId: /\/view\/shop\/(\d+)/,
  productId: /\/view\/product\/(\d+)/,
  price: /[\d,]+\.?\d*/,
  sold: /(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:sold|购买|件已售)/i,
  rating: /(\d+(?:\.\d+)?)\s*(?:stars?|星)/i,
  stock: /(\d+(?:,\d+)*)\s*(?:in stock|库存|件)/i,
} as const;

// User agents for rotation
export const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
] as const;

// Common TikTok Shop domains and subdomains
export const DOMAINS = [
  'shop.tiktok.com',
  'www.tiktok.com/shop',
  'tiktok.com/shop',
] as const;