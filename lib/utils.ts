/**
 * Utility functions for TikTok Shop List app
 */

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for merging Tailwind CSS classes
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// URL parsing and validation
export function extractShopId(url: string): string | null {
  const shopMatch = url.match(/shop\.tiktok\.com\/view\/shop\/(\d+)/);
  if (shopMatch) return shopMatch[1];
  
  const productMatch = url.match(/shop\.tiktok\.com\/view\/product\/(\d+)/);
  if (productMatch) {
    // Extract shop ID from product URL (would need to be crawled)
    return null;
  }
  
  return null;
}

export function extractProductId(url: string): string | null {
  const match = url.match(/shop\.tiktok\.com\/view\/product\/(\d+)/);
  return match ? match[1] : null;
}

export function isValidTikTokShopUrl(url: string): boolean {
  return /^https?:\/\/shop\.tiktok\.com\/view\/(shop|product)\/\d+/.test(url);
}

// Data deduplication
export function dedupeArray<T>(array: T[], keyFn: (item: T) => string): T[] {
  const seen = new Set<string>();
  return array.filter(item => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function dedupeShopUrls(urls: string[]): string[] {
  const shopIds = new Set<string>();
  return urls.filter(url => {
    const shopId = extractShopId(url);
    if (!shopId) return false;
    if (shopIds.has(shopId)) return false;
    shopIds.add(shopId);
    return true;
  });
}

// Date utilities
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0]; // YYYY-MM-DD
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString();
}

export function getDateRange(days: number): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days);
  
  return {
    from: formatDate(from),
    to: formatDate(to),
  };
}

// Number formatting
export function formatNumber(num: number): string {
  return new Intl.NumberFormat().format(num);
}

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

export function formatPercentage(value: number, decimals = 2): string {
  return `${value.toFixed(decimals)}%`;
}

// Growth calculation
export function calculateGrowth(current: number, previous: number): {
  delta: number;
  percent: number;
} {
  const delta = current - previous;
  const percent = previous > 0 ? (delta / previous) * 100 : 0;
  
  return {
    delta,
    percent: Math.round(percent * 100) / 100, // Round to 2 decimal places
  };
}

// Logging utilities
export interface Logger {
  info: (message: string, ...args: any[]) => void;
  warn: (message: string, ...args: any[]) => void;
  error: (message: string, ...args: any[]) => void;
  debug: (message: string, ...args: any[]) => void;
}

export function createLogger(prefix = ''): Logger {
  const log = (level: string, message: string, ...args: any[]) => {
    const timestamp = new Date().toISOString();
    const prefixStr = prefix ? `[${prefix}] ` : '';
    console.log(`[${timestamp}] ${level.toUpperCase()} ${prefixStr}${message}`, ...args);
  };

  return {
    info: (message: string, ...args: any[]) => log('info', message, ...args),
    warn: (message: string, ...args: any[]) => log('warn', message, ...args),
    error: (message: string, ...args: any[]) => log('error', message, ...args),
    debug: (message: string, ...args: any[]) => log('debug', message, ...args),
  };
}

// Mask sensitive data
export function maskSecret(secret: string): string {
  if (!secret || secret.length <= 4) return '****';
  return secret.substring(0, 2) + '*'.repeat(secret.length - 4) + secret.substring(secret.length - 2);
}

// Sleep utility
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Random delay for anti-detection
export function randomDelay(min = 1000, max = 2500): Promise<void> {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return sleep(delay);
}

// Retry logic
export async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  delayMs = 1000,
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxAttempts) {
        throw lastError;
      }
      
      await sleep(delayMs * attempt);
    }
  }
  
  throw lastError!;
}

// CSV filename generation
export function generateCSVFilename(template: string, data?: Record<string, string>): string {
  let filename = template;
  
  // Replace {date} with current date
  filename = filename.replace('{date}', formatDate(new Date()));
  
  // Replace other placeholders
  if (data) {
    Object.entries(data).forEach(([key, value]) => {
      filename = filename.replace(`{${key}}`, value);
    });
  }
  
  return filename;
}

// Parse proxy string format: host:port:username:password
export function parseProxyString(proxyStr: string): {
  host: string;
  port: number;
  username?: string;
  password?: string;
} | null {
  const parts = proxyStr.trim().split(':');
  
  if (parts.length < 2) return null;
  
  const host = parts[0];
  const port = parseInt(parts[1], 10);
  
  if (!host || isNaN(port)) return null;
  
  return {
    host,
    port,
    username: parts[2] || undefined,
    password: parts[3] || undefined,
  };
}

// Validate environment variables
export function validateEnv(): void {
  const required = ['NEXTAUTH_SECRET', 'KV_REST_API_URL', 'KV_REST_API_TOKEN'];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}