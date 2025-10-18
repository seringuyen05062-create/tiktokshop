'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function SettingsPage() {
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
                <h1 className="text-2xl font-bold text-gray-900">Cài đặt</h1>
                <p className="text-sm text-gray-600">Cấu hình thu thập và cài đặt hệ thống</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Cài đặt thu thập</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Khoảng thời gian thu thập (phút)
                </label>
                <input 
                  type="number" 
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  defaultValue={60}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tối đa sản phẩm mỗi shop
                </label>
                <input 
                  type="number" 
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  defaultValue={100}
                />
              </div>
              <Button className="w-full">Lưu cài đặt</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Trạng thái hệ thống</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span>Dịch vụ thu thập</span>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-green-600">Đang chạy</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span>Cơ sở dữ liệu</span>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-green-600">Đã kết nối</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span>Dịch vụ Proxy</span>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm text-yellow-600">Chưa cấu hình</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}