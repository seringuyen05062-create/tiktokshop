import { z } from 'zod';

// Shop model - chứa shop info cơ bản
export const ShopSchema = z.object({
  shop_id: z.string(),
  shop_name: z.string(),
  shop_url: z.string().url(),
  crawl_date: z.string(), // UTC ISO
  sold_today: z.number().default(0),
  sold_prev: z.number().default(0),
  growth_percent: z.number().default(0), // (today - prev)/max(prev,1)*100
  status: z.enum(['active', 'paused', 'error']).default('active'),
  is_deleted: z.boolean().default(false),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Shop = z.infer<typeof ShopSchema>;

// Product model - sản phẩm crawl được
export const ProductSchema = z.object({
  crawl_date: z.string(), // UTC ISO  
  shop_id: z.string(),
  shop_name: z.string(),
  shop_url: z.string().url(),
  product_id: z.string(),
  product_url: z.string().url(),
  title: z.string(),
  price_current: z.number().optional(),
  price_before_discount: z.number().optional(),
  currency: z.string().default('USD'),
  sold: z.number().default(0), // tổng sold hiển thị
  rating: z.number().optional(),
  stock: z.number().optional(),
  thumbnail_url: z.string().url().optional(),
});

export type Product = z.infer<typeof ProductSchema>;

// Growth snapshot - theo dõi tăng trưởng theo ngày
export const GrowthSchema = z.object({
  date: z.string(), // YYYY-MM-DD
  shop_id: z.string(),
  shop_name: z.string(),
  sold_prev: z.number().default(0),
  sold_today: z.number().default(0),
  delta: z.number().default(0), // today - prev
  growth_percent: z.number().default(0), // (today - prev)/max(prev,1)*100 (2 chữ số)
});

export type Growth = z.infer<typeof GrowthSchema>;

// Settings model
export const SettingsSchema = z.object({
  captcha: z.object({
    enabled: z.boolean().default(false),
    api_key: z.string().optional(),
    timeout_ms: z.number().default(60000),
    max_retry: z.number().default(2),
  }),
  export: z.object({
    delimiter: z.string().default(','),
    products_filename_template: z.string().default('products_{date}.csv'),
    growth_filename_template: z.string().default('growth_{date}.csv'),
  }),
  crawler: z.object({
    throttle_min: z.number().default(1000),
    throttle_max: z.number().default(2500),
    retry_attempts: z.number().default(2),
    concurrent_limit: z.number().default(3),
  }),
});

export type Settings = z.infer<typeof SettingsSchema>;

// Proxy model
export const ProxySchema = z.object({
  id: z.string(),
  server: z.string(), // ip:port
  username: z.string().optional(),
  password: z.string().optional(),
  status: z.enum(['healthy', 'quarantine', 'inactive']).default('inactive'),
  last_tested: z.string().optional(),
  fail_count: z.number().default(0),
  created_at: z.string(),
});

export type Proxy = z.infer<typeof ProxySchema>;

// Crawler state
export const CrawlerStateSchema = z.object({
  is_running: z.boolean().default(false),
  started_at: z.string().optional(),
  stopped_at: z.string().optional(),
  current_shop: z.string().optional(),
  processed_count: z.number().default(0),
  error_count: z.number().default(0),
});

export type CrawlerState = z.infer<typeof CrawlerStateSchema>;

// API Request/Response types
export interface CrawlShopsRequest {
  shopUrls: string[];
}

export interface CrawlProductsRequest {
  productUrls: string[];
}

export interface ProductListRequest {
  query?: string;
  page?: number;
  pageSize?: number;
}

export interface ProductListResponse {
  items: Product[];
  total: number;
  page: number;
  pageSize: number;
}

export interface GrowthListRequest {
  dateFrom?: string;
  dateTo?: string;
  shopId?: string;
}

export interface GrowthListResponse {
  items: Growth[];
  total: number;
}

export interface ProxyTestRequest {
  proxies: string[]; // format: ip:port:user:pass
}

export interface ProxyTestResponse {
  tested: number;
  healthy: number;
  quarantined: number;
  results: {
    proxy: string;
    status: 'healthy' | 'quarantine';
    error?: string;
  }[];
}

// Log entry
export const LogEntrySchema = z.object({
  timestamp: z.string(),
  level: z.enum(['info', 'warn', 'error']),
  message: z.string(),
  shop_id: z.string().optional(),
  error_code: z.string().optional(),
});

export type LogEntry = z.infer<typeof LogEntrySchema>;

// Export/Import helpers
export function formatDate(date: Date = new Date()): string {
  return date.toISOString();
}

export function formatDateYMD(date: Date = new Date()): string {
  return date.toISOString().split('T')[0];
}

export function calculateGrowthPercent(today: number, prev: number): number {
  if (prev === 0) return today > 0 ? 100 : 0;
  return Math.round(((today - prev) / Math.max(prev, 1)) * 10000) / 100;
}

export function parseShopId(url: string): string | null {
  // Extract shop ID from TikTok shop URL
  const patterns = [
    /\/shop\/(\w+)/,                    // /shop/123 or /shop/username
    /shop_id=(\w+)/,                    // shop_id=123
    /id=(\w+)/,                         // id=123
    /\/@([^\/\?]+)/,                    // /@username
    /tiktok\.com\/([^\/\?\s]+)/,       // tiktok.com/username
    /\/seller\/(\w+)/,                  // /seller/123
    /user_id=(\w+)/,                    // user_id=123
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1] && match[1] !== 'shop' && match[1] !== 'user') {
      return match[1];
    }
  }
  
  // If no pattern matches, try to extract from path segments
  try {
    const urlObj = new URL(url);
    const pathSegments = urlObj.pathname.split('/').filter(s => s.length > 0);
    
    // Look for meaningful segments
    for (const segment of pathSegments) {
      if (segment && segment.length > 2 && segment !== 'shop' && segment !== 'user' && segment !== 'www') {
        return segment;
      }
    }
  } catch (error) {
    // Invalid URL, continue
  }
  
  return null;
}

export function parseProductId(url: string): string | null {
  // Extract product ID from TikTok product URL
  const patterns = [
    /\/product\/(\d+)/,
    /product_id=(\d+)/,
    /id=(\d+)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  
  return null;
}