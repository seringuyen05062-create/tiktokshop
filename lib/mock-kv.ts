// Mock KV for development environment when Vercel KV is not available
interface MockStorage {
  [key: string]: any;
}

class MockKV {
  private storage: MockStorage = {};

  async get(key: string): Promise<any> {
    return this.storage[key] || null;
  }

  async set(key: string, value: any): Promise<void> {
    this.storage[key] = value;
  }

  async hset(key: string, field: string | Record<string, any>, value?: any): Promise<void> {
    if (typeof field === 'string' && value !== undefined) {
      if (!this.storage[key]) this.storage[key] = {};
      this.storage[key][field] = value;
    } else if (typeof field === 'object') {
      if (!this.storage[key]) this.storage[key] = {};
      Object.assign(this.storage[key], field);
    }
  }

  async hget(key: string, field: string): Promise<any> {
    return this.storage[key]?.[field] || null;
  }

  async hgetall(key: string): Promise<Record<string, any> | null> {
    return this.storage[key] || null;
  }

  async hdel(key: string, field: string): Promise<void> {
    if (this.storage[key]) {
      delete this.storage[key][field];
    }
  }

  async del(key: string): Promise<void> {
    delete this.storage[key];
  }

  async exists(key: string): Promise<boolean> {
    return key in this.storage;
  }
}

export const mockKV = new MockKV();