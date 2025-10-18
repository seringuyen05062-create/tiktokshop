import { NextRequest, NextResponse } from 'next/server';
import { searchProducts } from '@/lib/kv';
import type { ProductListResponse } from '@/lib/models';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const query = searchParams.get('query') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    // Validate parameters
    if (page < 1 || pageSize < 1 || pageSize > 100) {
      return NextResponse.json(
        { error: 'Invalid page or pageSize parameters' },
        { status: 400 }
      );
    }

    const result = await searchProducts(query, page, pageSize);

    const response: ProductListResponse = {
      items: result.items,
      total: result.total,
      page,
      pageSize,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Get products error:', error);
    
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}