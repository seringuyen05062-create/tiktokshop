'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function ProductsPage() {
  const router = useRouter();

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
                <h1 className="text-2xl font-bold text-gray-900">Sản phẩm</h1>
                <p className="text-sm text-gray-600">Duyệt và phân tích dữ liệu sản phẩm</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <Card>
          <CardHeader>
            <CardTitle>Danh mục sản phẩm</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">📦</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Không tìm thấy sản phẩm</h3>
              <p className="text-gray-600 mb-6">Bắt đầu thu thập shop để lấy dữ liệu sản phẩm</p>
              <Button onClick={() => router.push('/shops')}>
                Thêm shop trước
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}