import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { TikTokScraper, groupProductsByShop } from '@/lib/scraper';
import { getSettings, addLog } from '@/lib/kv';
import { formatDate } from '@/lib/models';

const crawlProductsSchema = z.object({
  urls: z.array(z.string().min(1)).optional().default([]),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Received body:', body);
    
    const parseResult = crawlProductsSchema.safeParse(body);
    if (!parseResult.success) {
      console.error('Validation error:', parseResult.error);
      return NextResponse.json(
        { error: 'Invalid request format', details: parseResult.error.errors },
        { status: 400 }
      );
    }
    
    const { urls } = parseResult.data;
    // Filter out empty URLs
    const productUrls = urls.filter(url => url && url.trim().length > 0);

    if (!productUrls.length) {
      return NextResponse.json(
        { error: 'No product URLs provided' },
        { status: 400 }
      );
    }

    // Group products by shop and dedupe in batch
    const shopGroups = groupProductsByShop(productUrls);
    const uniqueShops = Array.from(shopGroups.keys());
    const totalProducts = productUrls.length;
    const processedProducts = Array.from(shopGroups.values()).flat().length;
    const duplicates = totalProducts - processedProducts;

    await addLog({
      timestamp: formatDate(),
      level: 'info',
      message: `Grouped ${totalProducts} products into ${uniqueShops.length} shops (${duplicates} duplicates skipped)`,
    });

    // Enqueue crawl jobs
    const settings = await getSettings();
    const scraper = new TikTokScraper(settings);

    // Start crawling in background
    crawlProductShopsInBackground(shopGroups, scraper);

    return NextResponse.json({
      success: true,
      shops_enqueued: uniqueShops.length,
      products_total: totalProducts,
      duplicates_skipped: duplicates,
      message: 'Product shop crawl jobs enqueued successfully'
    }, { status: 202 });

  } catch (error) {
    console.error('Crawl products error:', error);

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

// Background crawling function for product-derived shops
async function crawlProductShopsInBackground(shopGroups: Map<string, string[]>, scraper: TikTokScraper) {
  try {
    for (const [shopId, productUrls] of Array.from(shopGroups)) {
      try {
        // Use first product URL to find shop
        const firstProductUrl = productUrls[0];
        await scraper.crawlShopFromProduct(firstProductUrl);
        
        await addLog({
          timestamp: formatDate(),
          level: 'info',
          message: `Crawled shop from product group: ${productUrls.length} products`,
          shop_id: shopId,
        });
        
        // Delay between shops
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        await addLog({
          timestamp: formatDate(),
          level: 'error',
          message: `Failed to crawl shop from products: ${error}`,
          shop_id: shopId,
        });
      }
    }
  } catch (error) {
    console.error('Background product crawling error:', error);
  } finally {
    await scraper.close();
  }
}