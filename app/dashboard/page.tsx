'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ShoppingBag, 
  Package, 
  TrendingUp, 
  Settings,
  Users,
  BarChart3
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Quản Lý TikTok Shop</h1>
              <p className="text-sm text-gray-600">Bảng điều khiển quản lý TikTok Shop</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <div className="h-2 w-2 bg-green-500 rounded-full"></div>
              Hệ thống hoạt động
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Tổng số Shop</p>
                  <p className="text-3xl font-bold text-gray-900">0</p>
                </div>
                <ShoppingBag className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Sản phẩm</p>
                  <p className="text-3xl font-bold text-gray-900">0</p>
                </div>
                <Package className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Tốc độ tăng trưởng</p>
                  <p className="text-3xl font-bold text-gray-900">0%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Đang thu thập</p>
                  <p className="text-3xl font-bold text-gray-900">0</p>
                </div>
                <BarChart3 className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5" />
                Quản lý Shop
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">Thêm, chỉnh sửa và theo dõi TikTok shop</p>
              <Button 
                onClick={() => router.push('/shops')}
                className="w-full"
              >
                Đến trang Shop
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Xem sản phẩm
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">Duyệt và phân tích dữ liệu sản phẩm</p>
              <Button 
                onClick={() => router.push('/products')}
                className="w-full"
                variant="outline"
              >
                Xem sản phẩm
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Phân tích tăng trưởng
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">Theo dõi follower và mức độ tương tác</p>
              <Button 
                onClick={() => router.push('/growth')}
                className="w-full"
                variant="outline"
              >
                Xem thống kê
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Cài đặt
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">Cấu hình thu thập và cài đặt hệ thống</p>
              <Button 
                onClick={() => router.push('/settings')}
                className="w-full"
                variant="outline"
              >
                Mở cài đặt
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Tình trạng hệ thống
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">Theo dõi trạng thái và hiệu suất hệ thống</p>
              <Button 
                onClick={() => router.push('/api/health')}
                className="w-full"
                variant="outline"
              >
                Kiểm tra trạng thái
              </Button>
            </CardContent>
          </Card>

          <Card className="md:col-span-2 lg:col-span-1">
            <CardHeader>
              <CardTitle>Hướng dẫn nhanh</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm text-gray-600">1. Thêm TikTok shop đầu tiên</p>
                <p className="text-sm text-gray-600">2. Bắt đầu thu thập sản phẩm</p>
                <p className="text-sm text-gray-600">3. Theo dõi chỉ số tăng trưởng</p>
                <p className="text-sm text-gray-600">4. Xuất dữ liệu khi cần</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}