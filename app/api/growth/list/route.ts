import { NextRequest, NextResponse } from 'next/server';
import { getGrowthByShop, getGrowthByDate } from '@/lib/kv';
import type { GrowthListResponse } from '@/lib/models';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const shopId = searchParams.get('shopId');

    let items = [];

    if (shopId) {
      // Get growth for specific shop
      items = await getGrowthByShop(shopId, dateFrom || undefined, dateTo || undefined);
    } else if (dateFrom) {
      // Get growth for specific date
      items = await getGrowthByDate(dateFrom, shopId || undefined);
    } else {
      // Get recent growth data (last 30 days)
      const today = new Date();
      const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      const fromDate = thirtyDaysAgo.toISOString().split('T')[0];
      
      items = [];
      for (let i = 0; i < 30; i++) {
        const date = new Date(thirtyDaysAgo.getTime() + i * 24 * 60 * 60 * 1000);
        const dateStr = date.toISOString().split('T')[0];
        const dayItems = await getGrowthByDate(dateStr);
        items.push(...dayItems);
      }
    }

    const response: GrowthListResponse = {
      items,
      total: items.length,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Get growth error:', error);
    
    return NextResponse.json(
      { error: 'Failed to fetch growth data' },
      { status: 500 }
    );
  }
}