import { kv as vercelKV } from '@vercel/kv';
import { mockKV } from './mock-kv';
import type { Shop, Product, Growth, Settings, Proxy, CrawlerState, LogEntry } from './models';

// Use mock KV in development when Vercel KV is not available
const isDevelopment = !process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN;
const kv = isDevelopment ? mockKV : vercelKV;

// Redis keys
const KEYS = {
  shops: 'shops',
  products: 'products', 
  growth: 'growth',
  settings: 'settings',
  proxies: 'proxies',
  crawler: 'crawler:state',
  logs: 'logs',
  captcha_key: 'captcha:key',
} as const;

// Shops operations
export async function saveShop(shop: Shop): Promise<void> {
  await kv.hset(KEYS.shops, { [shop.shop_id]: JSON.stringify(shop) });
}

export async function getShop(shopId: string): Promise<Shop | null> {
  const data = await kv.hget(KEYS.shops, shopId);
  return data ? JSON.parse(data as string) : null;
}

export async function getAllShops(): Promise<Shop[]> {
  try {
    const data = await kv.hgetall(KEYS.shops);
    if (!data) return [];
    
    return Object.values(data)
      .map(value => JSON.parse(value as string))
      .filter(shop => !shop.is_deleted)
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  } catch (error) {
    console.error('Failed to get shops:', error);
    return [];
  }
}

export async function deleteShop(shopId: string, hard = false): Promise<void> {
  if (hard) {
    await kv.hdel(KEYS.shops, shopId);
    // Also delete related products and growth data
    const products = await getProductsByShop(shopId);
    for (const product of products) {
      await kv.hdel(KEYS.products, `${product.shop_id}:${product.product_id}`);
    }
  } else {
    // Soft delete
    const shop = await getShop(shopId);
    if (shop) {
      shop.is_deleted = true;
      shop.updated_at = new Date().toISOString();
      await saveShop(shop);
    }
  }
}

// Products operations
export async function saveProduct(product: Product): Promise<void> {
  const key = `${product.shop_id}:${product.product_id}`;
  await kv.hset(KEYS.products, { [key]: JSON.stringify(product) });
}

export async function getProduct(shopId: string, productId: string): Promise<Product | null> {
  const key = `${shopId}:${productId}`;
  const data = await kv.hget(KEYS.products, key);
  return data ? JSON.parse(data as string) : null;
}

export async function getProductsByShop(shopId: string): Promise<Product[]> {
  try {
    const data = await kv.hgetall(KEYS.products);
    if (!data) return [];
    
    return Object.entries(data)
      .filter(([key]) => key.startsWith(`${shopId}:`))
      .map(([, value]) => JSON.parse(value as string))
      .sort((a, b) => new Date(b.crawl_date).getTime() - new Date(a.crawl_date).getTime());
  } catch (error) {
    console.error('Failed to get products by shop:', error);
    return [];
  }
}

export async function searchProducts(query: string, page = 1, pageSize = 20): Promise<{
  items: Product[];
  total: number;
}> {
  try {
    const data = await kv.hgetall(KEYS.products);
    if (!data) return { items: [], total: 0 };
    
    let products = Object.values(data).map(value => JSON.parse(value as string));
    
    // Filter by query
    if (query) {
      const lowerQuery = query.toLowerCase();
      products = products.filter(product => 
        product.title.toLowerCase().includes(lowerQuery) ||
        product.shop_name.toLowerCase().includes(lowerQuery) ||
        product.product_id.includes(lowerQuery) ||
        product.shop_id.includes(lowerQuery)
      );
    }
    
    // Sort by crawl_date desc
    products.sort((a, b) => new Date(b.crawl_date).getTime() - new Date(a.crawl_date).getTime());
    
    const total = products.length;
    const startIndex = (page - 1) * pageSize;
    const items = products.slice(startIndex, startIndex + pageSize);
    
    return { items, total };
  } catch (error) {
    console.error('Failed to search products:', error);
    return { items: [], total: 0 };
  }
}

// Growth operations
export async function saveGrowth(growth: Growth): Promise<void> {
  const key = `${growth.date}:${growth.shop_id}`;
  await kv.hset(KEYS.growth, { [key]: JSON.stringify(growth) });
}

export async function getGrowthByDate(date: string, shopId?: string): Promise<Growth[]> {
  try {
    const data = await kv.hgetall(KEYS.growth);
    if (!data) return [];
    
    return Object.entries(data)
      .filter(([key]) => {
        if (shopId) {
          return key === `${date}:${shopId}`;
        }
        return key.startsWith(`${date}:`);
      })
      .map(([, value]) => JSON.parse(value as string));
  } catch (error) {
    console.error('Failed to get growth by date:', error);
    return [];
  }
}

export async function getGrowthByShop(shopId: string, dateFrom?: string, dateTo?: string): Promise<Growth[]> {
  try {
    const data = await kv.hgetall(KEYS.growth);
    if (!data) return [];
    
    let growthData = Object.entries(data)
      .filter(([key]) => key.endsWith(`:${shopId}`))
      .map(([, value]) => JSON.parse(value as string));
    
    // Filter by date range
    if (dateFrom || dateTo) {
      growthData = growthData.filter(growth => {
        if (dateFrom && growth.date < dateFrom) return false;
        if (dateTo && growth.date > dateTo) return false;
        return true;
      });
    }
    
    return growthData.sort((a, b) => b.date.localeCompare(a.date));
  } catch (error) {
    console.error('Failed to get growth by shop:', error);
    return [];
  }
}

// Settings operations
export async function getSettings(): Promise<Settings> {
  // Default settings để fallback
  const defaultSettings: Settings = {
    captcha: {
      enabled: false,
      api_key: '',
      timeout_ms: 60000,
      max_retry: 2,
    },
    export: {
      delimiter: ',',
      products_filename_template: 'products_{date}.csv',
      growth_filename_template: 'growth_{date}.csv',
    },
    crawler: {
      throttle_min: 1000,
      throttle_max: 2500,
      retry_attempts: 2,
      concurrent_limit: 3,
    },
  };

  try {
    const data = await kv.get(KEYS.settings);
    if (data) {
      const parsed = JSON.parse(data as string);
      // Merge với default để đảm bảo có đủ fields
      return {
        ...defaultSettings,
        ...parsed,
        captcha: { ...defaultSettings.captcha, ...(parsed.captcha || {}) },
        export: { ...defaultSettings.export, ...(parsed.export || {}) },
        crawler: { ...defaultSettings.crawler, ...(parsed.crawler || {}) },
      };
    }
    
    return defaultSettings;
  } catch (error) {
    console.error('Failed to get settings:', error);
    // Return default settings on error
    return defaultSettings;
  }
}

export async function saveSettings(settings: Settings): Promise<void> {
  try {
    await kv.set(KEYS.settings, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save settings:', error);
    throw new Error('Database connection error - settings not saved');
  }
}

// Captcha API key operations (separate from settings for security)
export async function getCaptchaApiKey(): Promise<string | null> {
  try {
    return await kv.get(KEYS.captcha_key) as string | null;
  } catch (error) {
    console.error('Failed to get captcha API key:', error);
    return null;
  }
}

export async function saveCaptchaApiKey(apiKey: string): Promise<void> {
  try {
    await kv.set(KEYS.captcha_key, apiKey);
  } catch (error) {
    console.error('Failed to save captcha API key:', error);
    throw new Error('Database connection error - API key not saved');
  }
}

export async function hasCaptchaApiKey(): Promise<boolean> {
  try {
    const key = await kv.get(KEYS.captcha_key);
    return !!key;
  } catch (error) {
    return false;
  }
}

// Proxies operations
export async function saveProxy(proxy: Proxy): Promise<void> {
  await kv.hset(KEYS.proxies, { [proxy.id]: JSON.stringify(proxy) });
}

export async function getProxy(id: string): Promise<Proxy | null> {
  const data = await kv.hget(KEYS.proxies, id);
  return data ? JSON.parse(data as string) : null;
}

export async function getAllProxies(): Promise<Proxy[]> {
  try {
    const data = await kv.hgetall(KEYS.proxies);
    if (!data) return [];
    
    return Object.values(data)
      .map(value => JSON.parse(value as string))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } catch (error) {
    console.error('Failed to get proxies:', error);
    return [];
  }
}

export async function getHealthyProxies(): Promise<Proxy[]> {
  const proxies = await getAllProxies();
  return proxies.filter(proxy => proxy.status === 'healthy');
}

export async function deleteProxy(id: string): Promise<void> {
  await kv.hdel(KEYS.proxies, id);
}

// Crawler state operations
export async function getCrawlerState(): Promise<CrawlerState> {
  try {
    const data = await kv.get(KEYS.crawler);
    if (data) {
      return JSON.parse(data as string);
    }
    
    return {
      is_running: false,
      processed_count: 0,
      error_count: 0,
    };
  } catch (error) {
    console.error('Failed to get crawler state:', error);
    return {
      is_running: false,
      processed_count: 0,
      error_count: 0,
    };
  }
}

export async function saveCrawlerState(state: CrawlerState): Promise<void> {
  await kv.set(KEYS.crawler, JSON.stringify(state));
}

// Logs operations
export async function addLog(log: LogEntry): Promise<void> {
  try {
    const key = `${log.timestamp}:${Date.now()}`;
    await kv.hset(KEYS.logs, { [key]: JSON.stringify(log) });
    
    // Keep only recent logs (last 1000 entries)
    const logs = await kv.hgetall(KEYS.logs);
    if (logs && Object.keys(logs).length > 1000) {
      const sortedKeys = Object.keys(logs).sort().slice(0, -1000);
      for (const key of sortedKeys) {
        await kv.hdel(KEYS.logs, key);
      }
    }
  } catch (error) {
    // Log to console if KV fails, but don't throw to avoid breaking main flow
    console.error('Failed to save log to KV:', error, 'Log:', log);
  }
}

export async function getRecentLogs(limit = 100): Promise<LogEntry[]> {
  try {
    const data = await kv.hgetall(KEYS.logs);
    if (!data) return [];
    
    return Object.entries(data)
      .map(([, value]) => JSON.parse(value as string))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  } catch (error) {
    console.error('Failed to get recent logs:', error);
    return [];
  }
}

// Utility functions
export async function clearAllData(): Promise<void> {
  for (const key of Object.values(KEYS)) {
    await kv.del(key);
  }
}

export async function getStats(): Promise<{
  shops: number;
  products: number;
  growth_entries: number;
  logs: number;
}> {
  try {
    const [shopsData, productsData, growthData, logsData] = await Promise.all([
      kv.hgetall(KEYS.shops),
      kv.hgetall(KEYS.products),
      kv.hgetall(KEYS.growth),
      kv.hgetall(KEYS.logs),
    ]);
    
    return {
      shops: shopsData ? Object.keys(shopsData).length : 0,
      products: productsData ? Object.keys(productsData).length : 0,
      growth_entries: growthData ? Object.keys(growthData).length : 0,
      logs: logsData ? Object.keys(logsData).length : 0,
    };
  } catch (error) {
    console.error('Failed to get stats:', error);
    return { shops: 0, products: 0, growth_entries: 0, logs: 0 };
  }
}