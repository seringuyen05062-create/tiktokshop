import { NextResponse } from 'next/server';
import { getGrowthByDate, getSettings } from '@/lib/kv';
import { formatDateYMD } from '@/lib/models';

export async function POST() {
  try {
    const settings = await getSettings();
    
    // Get growth data for last 30 days
    const items = [];
    const today = new Date();
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      const dayItems = await getGrowthByDate(dateStr);
      items.push(...dayItems);
    }
    
    if (items.length === 0) {
      return new NextResponse('No growth data found', { status: 404 });
    }

    // Generate CSV content
    const delimiter = settings.export.delimiter;
    const headers = [
      'date',
      'shop_id',
      'shop_name', 
      'sold_prev',
      'sold_today',
      'delta',
      'growth_percent'
    ];

    const csvRows = [headers.join(delimiter)];
    
    for (const growth of items) {
      const row = [
        growth.date,
        growth.shop_id,
        `"${growth.shop_name.replace(/"/g, '""')}"`,
        growth.sold_prev,
        growth.sold_today,
        growth.delta,
        growth.growth_percent
      ];
      csvRows.push(row.join(delimiter));
    }

    const csvContent = csvRows.join('\n');
    
    // Generate filename
    const date = formatDateYMD();
    const filename = settings.export.growth_filename_template.replace('{date}', date);

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (error) {
    console.error('Export growth error:', error);
    
    return NextResponse.json(
      { error: 'Failed to export growth data' },
      { status: 500 }
    );
  }
}