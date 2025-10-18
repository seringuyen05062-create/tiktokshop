'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, X } from 'lucide-react';

export default function ShopsPage() {
  const router = useRouter();
  const [showAddModal, setShowAddModal] = useState(false);
  const [shops, setShops] = useState<any[]>([]);
  const [shopData, setShopData] = useState({
    url: '',
    name: '',
    description: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingShops, setIsLoadingShops] = useState(true);

  // Load shops on component mount
  React.useEffect(() => {
    loadShops();
  }, []);

  const loadShops = async () => {
    try {
      const response = await fetch('/api/shops');
      const data = await response.json();
      if (data.success) {
        setShops(data.shops || []);
      }
    } catch (error) {
      console.error('Error loading shops:', error);
    } finally {
      setIsLoadingShops(false);
    }
  };

  const handleAddShop = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/shops', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: shopData.url,
          name: shopData.name,
          description: shopData.description,
        }),
      });

      if (response.ok) {
        // Reset form and close modal
        setShopData({ url: '', name: '', description: '' });
        setShowAddModal(false);
        // Reload shops
        loadShops();
      } else {
        alert('Có lỗi xảy ra khi thêm shop');
      }
    } catch (error) {
      alert('Có lỗi xảy ra: ' + error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-4">
              <Button 
                onClick={() => router.push('/dashboard')}
                variant="ghost"
                size="sm"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Về bảng điều khiển
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">TikTok Shops</h1>
                <p className="text-sm text-gray-600">Quản lý và theo dõi TikTok shop</p>
              </div>
            </div>
            <Button 
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Thêm Shop
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <Card>
          <CardHeader>
            <CardTitle>Danh sách TikTok Shop</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingShops ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Đang tải danh sách shop...</p>
              </div>
            ) : shops.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 text-6xl mb-4">🏪</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Chưa có shop nào</h3>
                <p className="text-gray-600 mb-6">Thêm TikTok shop đầu tiên để bắt đầu theo dõi</p>
                <Button onClick={() => setShowAddModal(true)}>
                  Thêm shop đầu tiên
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {shops.map((shop) => (
                  <div key={shop.shopId} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{shop.shopName}</h3>
                        <p className="text-sm text-gray-600 mt-1">ID: {shop.shopId}</p>
                        <a 
                          href={shop.shopUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-800 mt-1 inline-block"
                        >
                          {shop.shopUrl}
                        </a>
                        {shop.lastCrawledAt && (
                          <p className="text-xs text-gray-500 mt-2">
                            Lần thu thập cuối: {new Date(shop.lastCrawledAt).toLocaleString('vi-VN')}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm text-green-600">Hoạt động</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Shop Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Thêm TikTok Shop mới</h2>
              <Button
                onClick={() => setShowAddModal(false)}
                variant="ghost"
                size="sm"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={handleAddShop} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  URL TikTok Shop *
                </label>
                <input
                  type="url"
                  required
                  value={shopData.url}
                  onChange={(e) => setShopData({ ...shopData, url: e.target.value })}
                  placeholder="https://shop.tiktok.com/..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Ví dụ: https://shop.tiktok.com/view/shop/1234567890
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tên shop
                </label>
                <input
                  type="text"
                  value={shopData.name}
                  onChange={(e) => setShopData({ ...shopData, name: e.target.value })}
                  placeholder="Tên hiển thị của shop"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mô tả
                </label>
                <textarea
                  value={shopData.description}
                  onChange={(e) => setShopData({ ...shopData, description: e.target.value })}
                  placeholder="Mô tả về shop (tùy chọn)"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  variant="outline"
                  className="flex-1"
                  disabled={isLoading}
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isLoading}
                >
                  {isLoading ? 'Đang thêm...' : 'Thêm Shop'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}