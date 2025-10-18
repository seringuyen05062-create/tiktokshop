/**
 * Basic unit tests for utility functions
 */

import { 
  extractShopId, 
  extractProductId, 
  isValidTikTokShopUrl,
  dedupeArray,
  formatDate,
  calculateGrowth,
  maskSecret,
  parseProxyString
} from '../lib/utils';

describe('URL parsing utilities', () => {
  test('extractShopId should extract shop ID from valid URLs', () => {
    expect(extractShopId('https://shop.tiktok.com/view/shop/123456')).toBe('123456');
    expect(extractShopId('http://shop.tiktok.com/view/shop/789012')).toBe('789012');
    expect(extractShopId('https://shop.tiktok.com/view/product/123456')).toBeNull();
    expect(extractShopId('https://invalid-url.com')).toBeNull();
  });

  test('extractProductId should extract product ID from valid URLs', () => {
    expect(extractProductId('https://shop.tiktok.com/view/product/123456')).toBe('123456');
    expect(extractProductId('http://shop.tiktok.com/view/product/789012')).toBe('789012');
    expect(extractProductId('https://shop.tiktok.com/view/shop/123456')).toBeNull();
    expect(extractProductId('https://invalid-url.com')).toBeNull();
  });

  test('isValidTikTokShopUrl should validate TikTok Shop URLs', () => {
    expect(isValidTikTokShopUrl('https://shop.tiktok.com/view/shop/123456')).toBe(true);
    expect(isValidTikTokShopUrl('https://shop.tiktok.com/view/product/123456')).toBe(true);
    expect(isValidTikTokShopUrl('http://shop.tiktok.com/view/shop/123456')).toBe(true);
    expect(isValidTikTokShopUrl('https://invalid-url.com')).toBe(false);
    expect(isValidTikTokShopUrl('https://shop.tiktok.com/invalid')).toBe(false);
  });
});

describe('Array utilities', () => {
  test('dedupeArray should remove duplicates based on key function', () => {
    const items = [
      { id: '1', name: 'Item 1' },
      { id: '2', name: 'Item 2' },
      { id: '1', name: 'Item 1 Duplicate' },
      { id: '3', name: 'Item 3' },
    ];

    const result = dedupeArray(items, item => item.id);
    
    expect(result).toHaveLength(3);
    expect(result.map(item => item.id)).toEqual(['1', '2', '3']);
  });
});

describe('Date utilities', () => {
  test('formatDate should format date to YYYY-MM-DD', () => {
    const date = new Date('2023-12-25T10:30:00Z');
    expect(formatDate(date)).toBe('2023-12-25');
    expect(formatDate('2023-12-25T10:30:00Z')).toBe('2023-12-25');
  });
});

describe('Growth calculation', () => {
  test('calculateGrowth should calculate delta and percentage correctly', () => {
    expect(calculateGrowth(150, 100)).toEqual({ delta: 50, percent: 50 });
    expect(calculateGrowth(75, 100)).toEqual({ delta: -25, percent: -25 });
    expect(calculateGrowth(100, 0)).toEqual({ delta: 100, percent: 0 });
    expect(calculateGrowth(200, 100)).toEqual({ delta: 100, percent: 100 });
  });
});

describe('Security utilities', () => {
  test('maskSecret should mask sensitive data', () => {
    expect(maskSecret('secretkey123')).toBe('se*******23');
    expect(maskSecret('abc')).toBe('****');
    expect(maskSecret('')).toBe('****');
    expect(maskSecret('ab')).toBe('****');
  });
});

describe('Proxy utilities', () => {
  test('parseProxyString should parse proxy strings correctly', () => {
    expect(parseProxyString('127.0.0.1:8080')).toEqual({
      host: '127.0.0.1',
      port: 8080,
    });

    expect(parseProxyString('proxy.example.com:3128:username:password')).toEqual({
      host: 'proxy.example.com',
      port: 3128,
      username: 'username',
      password: 'password',
    });

    expect(parseProxyString('invalid')).toBeNull();
    expect(parseProxyString('host:invalid-port')).toBeNull();
  });
});