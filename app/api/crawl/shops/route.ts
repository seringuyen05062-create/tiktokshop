import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { TikTokScraper, dedupeShopUrls } from '@/lib/scraper';
import { getSettings, addLog } from '@/lib/kv';
import { formatDate } from '@/lib/models';

const crawlShopsSchema = z.object({
  urls: z.array(z.string().min(1)).optional().default([]),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Received body:', body);
    
    const parseResult = crawlShopsSchema.safeParse(body);
    if (!parseResult.success) {
      console.error('Validation error:', parseResult.error);
      return NextResponse.json(
        { error: 'Invalid request format', details: parseResult.error.errors },
        { status: 400 }
      );
    }
    
    const { urls } = parseResult.data;
    // Filter out empty URLs
    const shopUrls = urls.filter(url => url && url.trim().length > 0);

    if (!shopUrls.length) {
      return NextResponse.json(
        { error: 'No shop URLs provided' },
        { status: 400 }
      );
    }

    // Dedupe shops in batch
    const { uniqueShops, duplicates } = dedupeShopUrls(shopUrls);

    // Log duplicates
    if (duplicates.length > 0) {
      await addLog({
        timestamp: formatDate(),
        level: 'info',
        message: `Duplicate shops skipped: ${duplicates.length}`,
      });
    }

    // Enqueue crawl jobs (simplified - in production use queue like BullMQ)
    let settings;
    try {
      settings = await getSettings();
    } catch (error) {
      console.error('Failed to get settings:', error);
      throw new Error('Configuration error - cannot load crawler settings');
    }

    let scraper;
    try {
      scraper = new TikTokScraper(settings);
    } catch (error) {
      console.error('Failed to create scraper:', error);
      throw new Error('Scraper initialization failed');
    }

    // Start crawling in background (don't await)
    crawlShopsInBackground(uniqueShops, scraper);

    await addLog({
      timestamp: formatDate(),
      level: 'info',
      message: `Enqueued ${uniqueShops.length} shops for crawling (${duplicates.length} duplicates skipped)`,
    });

    return NextResponse.json({
      success: true,
      enqueued: uniqueShops.length,
      duplicates_skipped: duplicates.length,
      message: 'Shop crawl jobs enqueued successfully'
    }, { status: 202 });

  } catch (error) {
    console.error('Crawl shops error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Background crawling function
async function crawlShopsInBackground(shopUrls: string[], scraper: TikTokScraper) {
  let processedCount = 0;
  let successCount = 0;
  let errorCount = 0;

  try {
    await addLog({
      timestamp: formatDate(),
      level: 'info',
      message: `Starting background crawl of ${shopUrls.length} shops`,
    });

    for (const shopUrl of shopUrls) {
      try {
        await addLog({
          timestamp: formatDate(),
          level: 'info',
          message: `Crawling shop: ${shopUrl}`,
        });

        const result = await scraper.crawlShop(shopUrl);
        processedCount++;
        successCount++;
        
        await addLog({
          timestamp: formatDate(),
          level: 'info',
          message: `✅ Shop crawled: ${result.shop.shop_name} (${result.products.length} products)`,
        });
        
        // Delay between shops
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        processedCount++;
        errorCount++;
        await addLog({
          timestamp: formatDate(),
          level: 'error',
          message: `❌ Failed to crawl shop ${shopUrl}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }

    // Final summary log
    await addLog({
      timestamp: formatDate(),
      level: 'info',
      message: `🏁 Crawl completed: ${processedCount} URLs processed (${successCount} success, ${errorCount} errors)`,
    });

  } catch (error) {
    console.error('Background crawling error:', error);
    await addLog({
      timestamp: formatDate(),
      level: 'error',
      message: `Background crawl failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  } finally {
    await scraper.close();
  }
}