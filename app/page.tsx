'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';

interface Shop {
  shop_id: string;
  shop_name: string;
  total_products: number;
  sold_today: number;
  created_at: string;
}

interface Product {
  id: string;
  shop_id: string;
  shop_name: string;
  product_name: string;
  price: number;
  sold: number;
  rating?: number;
  thumbnail_url?: string;
}

interface Growth {
  date: string;
  shop_id: string;
  shop_name: string;
  sold_prev: number;
  sold_today: number;
  delta: number;
  growth_percent: number;
}

export default function HomePage() {
  const [urls, setUrls] = useState('');
  const [mode, setMode] = useState<'shop' | 'product'>('shop');
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [growth, setGrowth] = useState<Growth[]>([]);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const itemsPerPage = 20;

  // Settings state
  const [sadCaptchaEnabled, setSadCaptchaEnabled] = useState(false);
  const [sadCaptchaApiKey, setSadCaptchaApiKey] = useState('');
  const [proxiesText, setProxiesText] = useState('');
  const [proxiesStatus, setProxiesStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString('vi-VN');
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const handleCrawl = async () => {
    if (!urls.trim()) {
      addLog('❌ Vui lòng nhập URL');
      return;
    }

    setIsRunning(true);
    addLog(`🚀 Bắt đầu crawl (${mode === 'shop' ? 'shop' : 'product'} mode)`);
    
    try {
      const endpoint = mode === 'shop' ? '/api/crawl/shops' : '/api/crawl/products';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          urls: urls.split('\n').filter(url => url.trim()),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      addLog(`✅ Hoàn thành: ${result.total_processed} URLs xử lý`);
      
      // Refresh data
      await loadData();
    } catch (error) {
      addLog(`❌ Lỗi: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRunning(false);
    }
  };

  const loadData = async () => {
    try {
      // Load shops (using products list to get shop summary)
      const productsRes = await fetch('/api/products/list');
      if (productsRes.ok) {
        const productsData = await productsRes.json();
        setProducts(productsData.products || []);
        
        // Extract unique shops from products
        const shopsMap = new Map<string, Shop>();
        productsData.products?.forEach((product: Product) => {
          if (!shopsMap.has(product.shop_id)) {
            shopsMap.set(product.shop_id, {
              shop_id: product.shop_id,
              shop_name: product.shop_name,
              total_products: 0,
              sold_today: 0,
              created_at: new Date().toISOString(),
            });
          }
          const shop = shopsMap.get(product.shop_id)!;
          shop.total_products++;
          shop.sold_today += product.sold || 0;
        });
        setShops(Array.from(shopsMap.values()));
      }

      // Load growth data
      const growthRes = await fetch('/api/growth/list');
      if (growthRes.ok) {
        const growthData = await growthRes.json();
        setGrowth(growthData.growth || []);
      }
    } catch (error) {
      addLog(`❌ Lỗi tải dữ liệu: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  useEffect(() => {
    loadData();
    loadSettings();
  }, []);

  // Filter and paginate products
  const filteredProducts = products.filter(product =>
    product.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.shop_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  const handleExportCSV = async (type: 'products' | 'growth') => {
    try {
      const response = await fetch(`/api/export/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) throw new Error(`Export failed: ${response.status}`);

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tiktok-${type}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      addLog(`✅ Đã xuất ${type} CSV`);
    } catch (error) {
      addLog(`❌ Lỗi xuất CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleTestSadCaptcha = async () => {
    if (!sadCaptchaApiKey.trim()) {
      addLog('❌ Vui lòng nhập API key SadCaptcha');
      return;
    }

    try {
      addLog('🔑 Testing SadCaptcha API...');
      
      const response = await fetch('/api/sadcaptcha/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: sadCaptchaApiKey,
        }),
      });

      const result = await response.json();
      
      if (result.valid) {
        addLog(`✅ ${result.message}`);
      } else {
        addLog(`❌ ${result.message || 'SadCaptcha API key không hợp lệ'}`);
      }
    } catch (error) {
      addLog(`❌ Lỗi test SadCaptcha: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleTestProxies = async () => {
    if (!proxiesText.trim()) {
      addLog('❌ Vui lòng nhập danh sách proxy');
      return;
    }

    const proxies = proxiesText.split('\n').filter(line => line.trim());
    if (proxies.length === 0) {
      addLog('❌ Không tìm thấy proxy hợp lệ');
      return;
    }

    setProxiesStatus('testing');
    addLog(`🔄 Testing ${proxies.length} proxies...`);

    try {
      const response = await fetch('/api/proxies/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proxies }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const result = await response.json();
      setProxiesStatus('success');
      addLog(`✅ Proxy test hoàn thành: ${result.healthy || 0} healthy, ${result.quarantined || 0} quarantined`);
    } catch (error) {
      setProxiesStatus('error');
      addLog(`❌ Lỗi test proxies: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      if (response.ok) {
        const data = await response.json();
        setSadCaptchaEnabled(data.settings?.captcha?.enabled || false);
        // API key is not returned for security, just set empty
        setSadCaptchaApiKey('');
      }
    } catch (error) {
      addLog(`❌ Lỗi tải settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const saveSettings = async () => {
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sadcaptcha_enabled: sadCaptchaEnabled,
          sadcaptcha_api_key: sadCaptchaApiKey,
        }),
      });

      if (response.ok) {
        addLog('✅ Settings đã được lưu');
      } else {
        addLog('❌ Lỗi lưu settings');
      }
    } catch (error) {
      addLog(`❌ Lỗi lưu settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-3xl font-bold text-gray-900">TikTok Shop List</h1>
            <div className="flex gap-2">
              <Button onClick={() => handleExportCSV('products')} variant="outline">
                Xuất Products CSV
              </Button>
              <Button onClick={() => handleExportCSV('growth')} variant="outline">
                Xuất Growth CSV
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Control Panel */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Crawl URLs</CardTitle>
                <CardDescription>
                  Dán shop hoặc product URLs, mỗi dòng một URL
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select value={mode} onValueChange={(value: string) => setMode(value as 'shop' | 'product')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="shop">Shop Links</SelectItem>
                    <SelectItem value="product">Product Links</SelectItem>
                  </SelectContent>
                </Select>
                
                <Textarea
                  placeholder={mode === 'shop' 
                    ? 'https://shop.tiktok.com/view/shop/...\nhttps://shop.tiktok.com/view/shop/...'
                    : 'https://shop.tiktok.com/view/product/...\nhttps://shop.tiktok.com/view/product/...'
                  }
                  value={urls}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setUrls(e.target.value)}
                  rows={6}
                />
                
                <Button 
                  onClick={handleCrawl} 
                  disabled={isRunning}
                  className="w-full"
                >
                  {isRunning ? 'Đang crawl...' : 'Bắt đầu Crawl'}
                </Button>
              </CardContent>
            </Card>

            {/* Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Thống Kê</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span>Shops:</span>
                  <Badge>{shops.length}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Products:</span>
                  <Badge>{products.length}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Growth Records:</span>
                  <Badge>{growth.length}</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Logs */}
            <Card>
              <CardHeader>
                <CardTitle>Logs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48 overflow-y-auto bg-gray-100 p-2 rounded text-sm font-mono">
                  {logs.map((log, index) => (
                    <div key={index} className="mb-1">{log}</div>
                  ))}
                  {logs.length === 0 && (
                    <div className="text-gray-500">Chưa có log...</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Data Display */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="shops">
              <TabsList>
                <TabsTrigger value="shops">Shops ({shops.length})</TabsTrigger>
                <TabsTrigger value="products">Products ({products.length})</TabsTrigger>
                <TabsTrigger value="growth">Growth ({growth.length})</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>

              {/* Shops Tab */}
              <TabsContent value="shops">
                <Card>
                  <CardHeader>
                    <CardTitle>Danh Sách Shops</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Shop Name</TableHead>
                          <TableHead>Products</TableHead>
                          <TableHead>Sold Today</TableHead>
                          <TableHead>Created</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {shops.map((shop) => (
                          <TableRow key={shop.shop_id}>
                            <TableCell className="font-medium">{shop.shop_name}</TableCell>
                            <TableCell>{shop.total_products}</TableCell>
                            <TableCell>{shop.sold_today.toLocaleString()}</TableCell>
                            <TableCell>{new Date(shop.created_at).toLocaleDateString('vi-VN')}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Products Tab */}
              <TabsContent value="products">
                <Card>
                  <CardHeader>
                    <CardTitle>Danh Sách Products</CardTitle>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Tìm kiếm products..."
                        value={searchTerm}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          setSearchTerm(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="max-w-sm"
                      />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>Shop</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Sold</TableHead>
                          <TableHead>Rating</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedProducts.map((product) => (
                          <TableRow key={product.id}>
                            <TableCell className="font-medium">
                              <div className="max-w-xs truncate">{product.product_name}</div>
                            </TableCell>
                            <TableCell>{product.shop_name}</TableCell>
                            <TableCell>${product.price.toFixed(2)}</TableCell>
                            <TableCell>{product.sold.toLocaleString()}</TableCell>
                            <TableCell>
                              {product.rating ? `${product.rating.toFixed(1)}⭐` : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    
                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex justify-between items-center mt-4">
                        <div className="text-sm text-gray-700">
                          Hiển thị {((currentPage - 1) * itemsPerPage) + 1} đến {Math.min(currentPage * itemsPerPage, filteredProducts.length)} trong tổng {filteredProducts.length} products
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                          >
                            Trước
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                          >
                            Sau
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Growth Tab */}
              <TabsContent value="growth">
                <Card>
                  <CardHeader>
                    <CardTitle>Phân Tích Tăng Trưởng</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Shop</TableHead>
                          <TableHead>Sold Prev</TableHead>
                          <TableHead>Sold Today</TableHead>
                          <TableHead>Delta</TableHead>
                          <TableHead>Growth %</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {growth.map((record, index) => (
                          <TableRow key={index}>
                            <TableCell>{record.date}</TableCell>
                            <TableCell>{record.shop_name}</TableCell>
                            <TableCell>{record.sold_prev.toLocaleString()}</TableCell>
                            <TableCell>{record.sold_today.toLocaleString()}</TableCell>
                            <TableCell className={record.delta >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {record.delta >= 0 ? '+' : ''}{record.delta.toLocaleString()}
                            </TableCell>
                            <TableCell className={record.growth_percent >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {record.growth_percent.toFixed(2)}%
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Settings Tab */}
              <TabsContent value="settings">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* SadCaptcha Settings */}
                  <Card>
                    <CardHeader>
                      <CardTitle>SadCaptcha Configuration</CardTitle>
                      <CardDescription>
                        Cấu hình SadCaptcha để giải captcha tự động
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <label htmlFor="sadcaptcha-toggle" className="text-sm font-medium">
                            Enable SadCaptcha
                          </label>
                          <p className="text-xs text-gray-500">Bật/tắt tính năng giải captcha tự động</p>
                        </div>
                        <Switch
                          id="sadcaptcha-toggle"
                          checked={sadCaptchaEnabled}
                          onCheckedChange={(checked) => {
                            setSadCaptchaEnabled(checked);
                            saveSettings();
                          }}
                        />
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="sadcaptcha-key" className="text-sm font-medium">
                          API Key
                        </label>
                        <div className="flex gap-2">
                          <Input
                            id="sadcaptcha-key"
                            type="password"
                            placeholder="Nhập SadCaptcha API key"
                            value={sadCaptchaApiKey}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSadCaptchaApiKey(e.target.value)}
                            className="flex-1"
                          />
                          <Button 
                            onClick={handleTestSadCaptcha}
                            disabled={!sadCaptchaApiKey.trim()}
                            size="sm"
                          >
                            Test
                          </Button>
                        </div>
                      </div>

                      <Button onClick={saveSettings} className="w-full">
                        Lưu Cấu Hình SadCaptcha
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Proxy Settings */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Proxy Management</CardTitle>
                      <CardDescription>
                        Quản lý danh sách proxy cho crawling
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <label htmlFor="proxies-list" className="text-sm font-medium">
                          Proxy List
                        </label>
                        <p className="text-xs text-gray-500">
                          Format: ip:port:username:password (một proxy mỗi dòng)
                        </p>
                        <Textarea
                          id="proxies-list"
                          placeholder={`192.168.1.1:8080:user1:pass1\n192.168.1.2:8080:user2:pass2\n...`}
                          value={proxiesText}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setProxiesText(e.target.value)}
                          rows={8}
                        />
                      </div>

                      <Button 
                        onClick={handleTestProxies}
                        disabled={!proxiesText.trim() || proxiesStatus === 'testing'}
                        className="w-full"
                      >
                        {proxiesStatus === 'testing' ? 'Đang Test...' : 'Test & Activate Proxies'}
                      </Button>

                      {proxiesStatus === 'success' && (
                        <div className="text-sm text-green-600 bg-green-50 p-2 rounded">
                          ✅ Proxy testing hoàn thành. Kiểm tra logs để xem chi tiết.
                        </div>
                      )}

                      {proxiesStatus === 'error' && (
                        <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                          ❌ Có lỗi khi test proxies. Kiểm tra logs để xem chi tiết.
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}