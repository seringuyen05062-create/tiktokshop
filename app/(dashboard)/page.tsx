'use client';

import React, { useState } from 'react';
import { InputLinks } from '@/components/forms/InputLinks';
import { RunControls } from '@/components/dashboard/RunControls';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmitUrls = async (urls: string[], type: 'shop' | 'product') => {
    setIsLoading(true);
    
    try {
      const endpoint = type === 'shop' ? '/api/crawl/shops' : '/api/crawl/products';
      const body = type === 'shop' ? { shopUrls: urls } : { productUrls: urls };
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to queue URLs');
      }

      console.log(`Successfully queued ${urls.length} ${type} URLs`);
    } catch (error) {
      console.error('Failed to submit URLs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRun = async () => {
    try {
      const response = await fetch('/api/crawl/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to start crawler');
      }

      console.log('Crawler started successfully');
    } catch (error) {
      console.error('Failed to start crawler:', error);
    }
  };

  const handleStop = async () => {
    try {
      const response = await fetch('/api/crawl/stop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to stop crawler');
      }

      console.log('Crawler stop requested');
    } catch (error) {
      console.error('Failed to stop crawler:', error);
    }
  };

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">TikTok Shop Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Scrape and analyze TikTok Shop data with automated crawling and growth tracking.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input section */}
        <InputLinks onSubmit={handleSubmitUrls} isLoading={isLoading} />

        {/* Controls section */}
        <RunControls onRun={handleRun} onStop={handleStop} />
      </div>

      {/* Quick stats */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Total Shops</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">0</div>
            <p className="text-sm text-gray-600">Active shops being tracked</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Total Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">0</div>
            <p className="text-sm text-gray-600">Products in database</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Last Update</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-medium text-gray-900">Never</div>
            <p className="text-sm text-gray-600">Last successful crawl</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent activity */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-600">
            No recent activity. Start by adding shop or product URLs above.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}