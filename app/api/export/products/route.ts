import { NextResponse } from 'next/server';
import { searchProducts, getSettings } from '@/lib/kv';
import { formatDateYMD } from '@/lib/models';

export async function POST() {
  try {
    const settings = await getSettings();
    const { items } = await searchProducts('', 1, 10000); // Get all products
    
    if (items.length === 0) {
      return new NextResponse('No products found', { status: 404 });
    }

    // Generate CSV content
    const delimiter = settings.export.delimiter;
    const headers = [
      'crawl_date',
      'shop_id', 
      'shop_name',
      'shop_url',
      'product_id',
      'product_url', 
      'title',
      'price_current',
      'price_before_discount',
      'currency',
      'sold',
      'rating',
      'stock',
      'thumbnail_url'
    ];

    const csvRows = [headers.join(delimiter)];
    
    for (const product of items) {
      const row = [
        product.crawl_date,
        product.shop_id,
        `"${product.shop_name.replace(/"/g, '""')}"`,
        product.shop_url,
        product.product_id,
        product.product_url,
        `"${product.title.replace(/"/g, '""')}"`,
        product.price_current || '',
        product.price_before_discount || '',
        product.currency,
        product.sold,
        product.rating || '',
        product.stock || '',
        product.thumbnail_url || ''
      ];
      csvRows.push(row.join(delimiter));
    }

    const csvContent = csvRows.join('\n');
    
    // Generate filename
    const date = formatDateYMD();
    const filename = settings.export.products_filename_template.replace('{date}', date);

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (error) {
    console.error('Export products error:', error);
    
    return NextResponse.json(
      { error: 'Failed to export products' },
      { status: 500 }
    );
  }
}