import { chromium, Browser, Page } from 'playwright-core';
import chromiumPath from '@sparticuz/chromium';
import type { Shop, Product, Proxy, Settings, LogEntry } from './models';
import { parseShopId, parseProductId, formatDate, calculateGrowthPercent } from './models';
import { saveShop, saveProduct, saveGrowth, getShop, addLog, getCaptchaApiKey, getHealthyProxies } from './kv';

// Scraper class với support proxy, captcha, throttling
export class TikTokScraper {
  private browser: Browser | null = null;
  private settings: Settings;
  private currentProxy: Proxy | null = null;
  
  constructor(settings: Settings) {
    this.settings = settings;
  }

  // Khởi tạo browser với proxy nếu có
  private async initBrowser(proxy?: Proxy): Promise<Browser> {
    const args = chromiumPath.args;
    
    // Thêm proxy config nếu có
    if (proxy) {
      args.push(`--proxy-server=${proxy.server}`);
      this.currentProxy = proxy;
    }

    let browser: Browser;
    
    try {
      // Try to use @sparticuz/chromium first (for production/serverless)
      browser = await chromium.launch({
        args,
        executablePath: await chromiumPath.executablePath(),
        headless: true,
      });
      
      await addLog({
        timestamp: formatDate(),
        level: 'info',
        message: 'Browser launched with @sparticuz/chromium',
      });
    } catch (error) {
      // Fallback to local browser in development
      await addLog({
        timestamp: formatDate(),
        level: 'warn',
        message: `@sparticuz/chromium failed: ${error instanceof Error ? error.message : 'Unknown error'}. Trying local browser...`,
      });
      
      try {
        browser = await chromium.launch({
          args,
          headless: true,
        });
        
        await addLog({
          timestamp: formatDate(),
          level: 'info',
          message: 'Browser launched with local chromium',
        });
      } catch (localError) {
        await addLog({
          timestamp: formatDate(),
          level: 'error',
          message: `All browser launch attempts failed: ${localError instanceof Error ? localError.message : 'Unknown error'}`,
        });
        throw new Error('Cannot launch browser - please install Chrome/Chromium or check @sparticuz/chromium setup');
      }
    }

    this.browser = browser;
    return browser;
  }

  // Tạo page mới với authentication cho proxy
  private async createPage(): Promise<Page> {
    if (!this.browser) {
      throw new Error('Browser not initialized');
    }

    const page = await this.browser.newPage({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    // Authenticate proxy nếu có credentials
    if (this.currentProxy && this.currentProxy.username && this.currentProxy.password) {
      await page.setExtraHTTPHeaders({
        'Proxy-Authorization': `Basic ${Buffer.from(`${this.currentProxy.username}:${this.currentProxy.password}`).toString('base64')}`
      });
    }

    return page;
  }

  // Throttling delay
  private async delay(): Promise<void> {
    const min = this.settings.crawler.throttle_min;
    const max = this.settings.crawler.throttle_max;
    const delayMs = Math.floor(Math.random() * (max - min + 1)) + min;
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }

  // Detect và solve captcha
  private async handleCaptcha(page: Page): Promise<boolean> {
    try {
      // Check for captcha elements
      const captchaSelectors = [
        'iframe[src*="captcha"]',
        '[class*="captcha"]',
        '[id*="captcha"]',
        '.verify-wrap',
        '.slider-track'
      ];

      let captchaElement = null;
      for (const selector of captchaSelectors) {
        captchaElement = await page.$(selector).catch(() => null);
        if (captchaElement) break;
      }

      if (!captchaElement) return true; // No captcha

      await addLog({
        timestamp: formatDate(),
        level: 'info',
        message: 'Captcha detected, attempting to solve with SadCaptcha',
        shop_id: this.currentProxy?.id,
      });

      // Get SadCaptcha API key
      const apiKey = await getCaptchaApiKey();
      if (!apiKey || !this.settings.captcha.enabled) {
        await addLog({
          timestamp: formatDate(),
          level: 'warn',
          message: 'Captcha detected but SadCaptcha not configured',
        });
        return false;
      }

      // Call SadCaptcha API (simplified implementation)
      const success = await this.solveCaptcha(page, apiKey);
      
      if (success) {
        await addLog({
          timestamp: formatDate(),
          level: 'info',
          message: 'Captcha solved successfully',
        });
      } else {
        await addLog({
          timestamp: formatDate(),
          level: 'error',
          message: 'Failed to solve captcha',
        });
      }

      return success;
    } catch (error) {
      await addLog({
        timestamp: formatDate(),
        level: 'error',
        message: `Captcha handling error: ${error}`,
      });
      return false;
    }
  }

  // SadCaptcha API integration với correct endpoints
  private async solveCaptcha(page: Page, apiKey: string): Promise<boolean> {
    try {
      // Detect captcha type trên page
      const captchaType = await this.detectCaptchaType(page);
      
      if (!captchaType) {
        return true; // No captcha detected
      }

      await addLog({
        timestamp: formatDate(),
        level: 'info',
        message: `Detected ${captchaType} captcha, solving with SadCaptcha...`,
      });

      let solutionResult;
      
      switch (captchaType) {
        case 'puzzle':
          solutionResult = await this.solvePuzzleCaptcha(page, apiKey);
          break;
        case 'rotate':
          solutionResult = await this.solveRotateCaptcha(page, apiKey);
          break;
        case 'shapes':
          solutionResult = await this.solveShapesCaptcha(page, apiKey);
          break;
        case 'semantic':
          solutionResult = await this.solveSemanticCaptcha(page, apiKey);
          break;
        default:
          throw new Error(`Unsupported captcha type: ${captchaType}`);
      }

      if (solutionResult.success) {
        await addLog({
          timestamp: formatDate(),
          level: 'info',
          message: `Successfully solved ${captchaType} captcha`,
        });
        return true;
      } else {
        throw new Error(`Failed to solve ${captchaType} captcha: ${solutionResult.error}`);
      }
      
    } catch (error) {
      await addLog({
        timestamp: formatDate(),
        level: 'error',
        message: `SadCaptcha API error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
      
      // Fallback to manual captcha attempts
      return await this.fallbackCaptchaHandling(page);
    }
  }

  // Detect captcha type trên page
  private async detectCaptchaType(page: Page): Promise<string | null> {
    try {
      // Check for puzzle captcha (slider/tấm ghép)
      const puzzleElements = await page.$$('[class*="puzzle"], [class*="slider"], [data-testid*="captcha"], .captcha-puzzle, .puzzle-captcha');
      if (puzzleElements.length > 0) {
        return 'puzzle';
      }

      // Check for rotate captcha
      const rotateElements = await page.$$('[class*="rotate"], .captcha-rotate, [data-testid*="rotate"]');
      if (rotateElements.length > 0) {
        return 'rotate';
      }

      // Check for shapes captcha
      const shapesElements = await page.$$('[class*="shapes"], .captcha-shapes, [data-testid*="shapes"]');
      if (shapesElements.length > 0) {
        return 'shapes';
      }

      // Check for semantic captcha (image + question)
      const semanticElements = await page.$$('[class*="semantic"], .captcha-semantic, [data-testid*="semantic"]');
      if (semanticElements.length > 0) {
        return 'semantic';
      }

      // Generic captcha detection
      const captchaElements = await page.$$('.captcha, [data-captcha], [id*="captcha"], [class*="captcha"]');
      if (captchaElements.length > 0) {
        return 'puzzle'; // Default to puzzle as most common
      }

      return null; // No captcha detected
    } catch (error) {
      return null;
    }
  }

  // Solve puzzle captcha (slider/tấm ghép)
  private async solvePuzzleCaptcha(page: Page, apiKey: string): Promise<{success: boolean, error?: string}> {
    try {
      // Get puzzle background and piece images
      const puzzleImg = await page.$('img[class*="puzzle"], img[class*="background"]');
      const pieceImg = await page.$('img[class*="piece"], img[class*="slider"]');

      if (!puzzleImg || !pieceImg) {
        return {success: false, error: 'Could not find puzzle images'};
      }

      // Convert images to base64
      const puzzleBase64 = await this.getImageAsBase64(page, puzzleImg);
      const pieceBase64 = await this.getImageAsBase64(page, pieceImg);

      // Call SadCaptcha API
      const response = await fetch(`https://www.sadcaptcha.com/api/v1/puzzle?licenseKey=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          puzzleImageB64: puzzleBase64,
          pieceImageB64: pieceBase64
        })
      });

      if (!response.ok) {
        throw new Error(`SadCaptcha API error: ${response.status}`);
      }

      const result = await response.json();
      
      // Get slider element and perform drag
      const slider = await page.$('[class*="slider"], [role="slider"]');
      if (!slider) {
        return {success: false, error: 'Could not find slider element'};
      }

      const sliderBox = await slider.boundingBox();
      if (!sliderBox) {
        return {success: false, error: 'Could not get slider dimensions'};
      }

      // Calculate drag distance: distance = r × w
      const dragDistance = result.r * sliderBox.width;
      
      // Perform human-like drag movement
      await this.humanLikeDrag(page, slider, dragDistance);
      
      // Wait and verify success
      await page.waitForTimeout(2000);
      const stillHasCaptcha = await this.detectCaptchaType(page);
      
      return {success: !stillHasCaptcha};
      
    } catch (error) {
      return {success: false, error: error instanceof Error ? error.message : 'Unknown error'};
    }
  }

  // Solve rotate captcha
  private async solveRotateCaptcha(page: Page, apiKey: string): Promise<{success: boolean, error?: string}> {
    try {
      // Get outer and inner images
      const outerImg = await page.$('img[class*="outer"], img[class*="background"]');
      const innerImg = await page.$('img[class*="inner"], img[class*="center"]');

      if (!outerImg || !innerImg) {
        return {success: false, error: 'Could not find rotate images'};
      }

      const outerBase64 = await this.getImageAsBase64(page, outerImg);
      const innerBase64 = await this.getImageAsBase64(page, innerImg);

      // Call SadCaptcha API
      const response = await fetch(`https://www.sadcaptcha.com/api/v1/rotate?licenseKey=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          outerImageB64: outerBase64,
          innerImageB64: innerBase64
        })
      });

      if (!response.ok) {
        throw new Error(`SadCaptcha API error: ${response.status}`);
      }

      const result = await response.json();
      
      // Get slider and calculate drag distance
      const slider = await page.$('[class*="slider"], [role="slider"]');
      if (!slider) {
        return {success: false, error: 'Could not find slider element'};
      }

      const sliderBox = await slider.boundingBox();
      const sliderIcon = await page.$('[class*="slider-icon"], [class*="thumb"]');
      const iconBox = await sliderIcon?.boundingBox();

      if (!sliderBox || !iconBox) {
        return {success: false, error: 'Could not get slider dimensions'};
      }

      // Calculate distance: ((slideBarLength – sliderIconWidth) × a) / 360
      const slideBarLength = sliderBox.width;
      const sliderIconWidth = iconBox.width;
      const angle = result.a; // 0-360 degrees
      const dragDistance = ((slideBarLength - sliderIconWidth) * angle) / 360;

      // Perform drag
      await this.humanLikeDrag(page, slider, dragDistance);
      
      // Verify success
      await page.waitForTimeout(2000);
      const stillHasCaptcha = await this.detectCaptchaType(page);
      
      return {success: !stillHasCaptcha};
      
    } catch (error) {
      return {success: false, error: error instanceof Error ? error.message : 'Unknown error'};
    }
  }

  // Solve shapes captcha
  private async solveShapesCaptcha(page: Page, apiKey: string): Promise<{success: boolean, error?: string}> {
    try {
      // Get the shapes image
      const shapesImg = await page.$('img[class*="shapes"], img[class*="3d"]');
      if (!shapesImg) {
        return {success: false, error: 'Could not find shapes image'};
      }

      const imageBase64 = await this.getImageAsBase64(page, shapesImg);

      // Call SadCaptcha API
      const response = await fetch(`https://www.sadcaptcha.com/api/v1/shapes?licenseKey=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageB64: imageBase64
        })
      });

      if (!response.ok) {
        throw new Error(`SadCaptcha API error: ${response.status}`);
      }

      const result = await response.json();
      
      // Get image dimensions for click calculation
      const imgBox = await shapesImg.boundingBox();
      if (!imgBox) {
        return {success: false, error: 'Could not get image dimensions'};
      }

      // Calculate click positions: pixel = ratio * dimension
      const clickX = result.pX * imgBox.width + imgBox.x;
      const clickY = result.pY * imgBox.height + imgBox.y;

      // Perform click
      await page.click(`css=${await shapesImg.evaluate(el => el.tagName)}`, {
        position: { x: clickX - imgBox.x, y: clickY - imgBox.y }
      });
      
      // Verify success
      await page.waitForTimeout(2000);
      const stillHasCaptcha = await this.detectCaptchaType(page);
      
      return {success: !stillHasCaptcha};
      
    } catch (error) {
      return {success: false, error: error instanceof Error ? error.message : 'Unknown error'};
    }
  }

  // Solve semantic captcha (image + question)
  private async solveSemanticCaptcha(page: Page, apiKey: string): Promise<{success: boolean, error?: string}> {
    try {
      // Get the semantic image and challenge text
      const semanticImg = await page.$('img[class*="semantic"], img[class*="challenge"]');
      const challengeText = await page.$('[class*="challenge"], [class*="question"]');
      
      if (!semanticImg || !challengeText) {
        return {success: false, error: 'Could not find semantic elements'};
      }

      const imageBase64 = await this.getImageAsBase64(page, semanticImg);
      const challenge = await challengeText.textContent() || '';

      // Call SadCaptcha API
      const response = await fetch(`https://www.sadcaptcha.com/api/v1/semantic-shapes?licenseKey=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageB64: imageBase64,
          challenge: challenge
        })
      });

      if (!response.ok) {
        throw new Error(`SadCaptcha API error: ${response.status}`);
      }

      const result = await response.json();
      
      // Get image dimensions and perform click
      const imgBox = await semanticImg.boundingBox();
      if (!imgBox) {
        return {success: false, error: 'Could not get image dimensions'};
      }

      const clickX = result.pX * imgBox.width + imgBox.x;
      const clickY = result.pY * imgBox.height + imgBox.y;

      await page.click(`css=${await semanticImg.evaluate(el => el.tagName)}`, {
        position: { x: clickX - imgBox.x, y: clickY - imgBox.y }
      });
      
      // Verify success
      await page.waitForTimeout(2000);
      const stillHasCaptcha = await this.detectCaptchaType(page);
      
      return {success: !stillHasCaptcha};
      
    } catch (error) {
      return {success: false, error: error instanceof Error ? error.message : 'Unknown error'};
    }
  }

  // Helper: Get image as base64
  private async getImageAsBase64(page: Page, imgElement: any): Promise<string> {
    return await imgElement.evaluate(async (img: HTMLImageElement) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      
      // Wait for image to load if not already loaded
      if (!img.complete) {
        await new Promise(resolve => {
          img.onload = resolve;
        });
      }
      
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.drawImage(img, 0, 0);
      
      return canvas.toDataURL('image/png').split(',')[1];
    });
  }

  // Helper: Human-like drag movement
  private async humanLikeDrag(page: Page, element: any, distance: number): Promise<void> {
    const box = await element.boundingBox();
    if (!box) return;

    const startX = box.x + box.width / 2;
    const startY = box.y + box.height / 2;
    const endX = startX + distance;

    // Start drag
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    
    // Move with varying speed (human-like)
    const steps = Math.max(10, Math.floor(distance / 5));
    for (let i = 0; i <= steps; i++) {
      const progress = i / steps;
      // Ease-out curve for more natural movement
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const currentX = startX + (distance * easedProgress);
      
      await page.mouse.move(currentX, startY, { steps: 1 });
      await page.waitForTimeout(Math.random() * 50 + 10); // Random delay 10-60ms
    }
    
    // Slight overshoot and correction (human behavior)
    await page.mouse.move(endX + 2, startY);
    await page.waitForTimeout(100);
    await page.mouse.move(endX, startY);
    
    await page.mouse.up();
  }

  // Fallback captcha handling
  private async fallbackCaptchaHandling(page: Page): Promise<boolean> {
    try {
      // Attempt simple captcha bypass techniques
      const clickableElements = [
        'button[type="submit"]',
        '.verify-button', 
        '.captcha-submit',
        '[data-testid="captcha-submit"]'
      ];
      
      for (const selector of clickableElements) {
        const element = await page.$(selector).catch(() => null);
        if (element) {
          await element.click();
          await page.waitForTimeout(2000);
          return true;
        }
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  // Chuẩn hóa URL (xử lý vm.tiktok.com)
  private async normalizeUrl(url: string): Promise<string> {
    try {
      // Handle vm.tiktok.com redirects
      if (url.includes('vm.tiktok.com')) {
        // Ensure browser is initialized first
        if (!this.browser) {
          await this.initBrowser();
        }
        
        const page = await this.createPage();
        await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
        const finalUrl = page.url();
        await page.close();
        
        await addLog({
          timestamp: formatDate(),
          level: 'info',
          message: `URL normalized: ${url} -> ${finalUrl}`,
        });
        
        return finalUrl;
      }
      
      return url;
    } catch (error) {
      console.error('URL normalization failed:', error);
      await addLog({
        timestamp: formatDate(),
        level: 'warn',
        message: `Failed to normalize URL ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
      return url;
    }
  }

  // Crawl single shop
  public async crawlShop(shopUrl: string): Promise<{ shop: Shop; products: Product[] }> {
    await addLog({
      timestamp: formatDate(),
      level: 'info',
      message: `Starting crawl for URL: ${shopUrl}`,
    });

    const normalizedUrl = await this.normalizeUrl(shopUrl);
    const shopId = parseShopId(normalizedUrl);
    
    await addLog({
      timestamp: formatDate(),
      level: 'info',
      message: `Normalized URL: ${normalizedUrl}, Shop ID: ${shopId || 'NOT_FOUND'}`,
    });
    
    if (!shopId) {
      throw new Error(`Cannot extract shop ID from URL: ${normalizedUrl} (original: ${shopUrl})`);
    }

    let retries = 0;
    const maxRetries = this.settings.crawler.retry_attempts;

    while (retries <= maxRetries) {
      try {
        // Get healthy proxy
        const proxies = await getHealthyProxies();
        const proxy = proxies[Math.floor(Math.random() * proxies.length)];
        
        // Init browser with proxy
        if (!this.browser) {
          await this.initBrowser(proxy);
        }

        const page = await this.createPage();
        
        // Navigate to shop page
        await page.goto(normalizedUrl, { 
          waitUntil: 'networkidle',
          timeout: 30000 
        });

        // Handle captcha if present
        const captchaPassed = await this.handleCaptcha(page);
        if (!captchaPassed) {
          throw new Error('Failed to pass captcha');
        }

        // Extract shop info
        const shopName = await page.$eval('h1, .shop-name, [data-testid="shop-name"]', el => el.textContent?.trim() || '').catch(() => `TikTok Shop ${shopId}`);

        // Extract products
        const products: Product[] = [];
        let pageNum = 1;
        let hasNextPage = true;

        while (hasNextPage && products.length < 200) { // Giới hạn 200 sản phẩm/shop
          await this.delay();
          
          // Extract products from current page
          const pageProducts = await page.evaluate(() => {
            const productElements = document.querySelectorAll('[data-testid="product-item"], .product-card, .goods-card');
            const products = [];

            for (let i = 0; i < productElements.length; i++) {
              const el = productElements[i];
              try {
                const titleEl = el.querySelector('h3, .product-title, .goods-title');
                const priceEl = el.querySelector('.price, .current-price');
                const oldPriceEl = el.querySelector('.old-price, .original-price');
                const soldEl = el.querySelector('.sold, .sales-count');
                const ratingEl = el.querySelector('.rating, .star-rating');
                const stockEl = el.querySelector('.stock, .inventory');
                const linkEl = el.querySelector('a');
                const imgEl = el.querySelector('img');

                if (!titleEl || !linkEl) continue;

                products.push({
                  title: titleEl.textContent?.trim() || '',
                  product_url: linkEl.href || '',
                  price_current: priceEl ? parseFloat(priceEl.textContent?.replace(/[^0-9.]/g, '') || '0') : undefined,
                  price_before_discount: oldPriceEl ? parseFloat(oldPriceEl.textContent?.replace(/[^0-9.]/g, '') || '0') : undefined,
                  sold: soldEl ? parseInt(soldEl.textContent?.replace(/[^0-9]/g, '') || '0') : 0,
                  rating: ratingEl ? parseFloat(ratingEl.textContent?.replace(/[^0-9.]/g, '') || '0') : undefined,
                  stock: stockEl ? parseInt(stockEl.textContent?.replace(/[^0-9]/g, '') || '0') : undefined,
                  thumbnail_url: imgEl?.src || imgEl?.getAttribute('data-src') || undefined,
                });
              } catch (error) {
                console.error('Error extracting product:', error);
              }
            }

            return products;
          });

          // Process extracted products
          for (const productData of pageProducts) {
            const productId = parseProductId(productData.product_url);
            if (!productId) continue;

            const product: Product = {
              crawl_date: formatDate(),
              shop_id: shopId,
              shop_name: shopName,
              shop_url: normalizedUrl,
              product_id: productId,
              product_url: productData.product_url,
              title: productData.title,
              price_current: productData.price_current,
              price_before_discount: productData.price_before_discount,
              currency: 'USD', // Default, could be detected from page
              sold: productData.sold,
              rating: productData.rating,
              stock: productData.stock,
              thumbnail_url: productData.thumbnail_url,
            };

            products.push(product);
            
            // Save product to KV
            await saveProduct(product);
          }

          // Check for next page
          const nextButton = await page.$('.pagination-next, .next-page, [aria-label="Next"]').catch(() => null);
          if (nextButton) {
            await nextButton.click();
            await page.waitForLoadState('networkidle');
            pageNum++;
          } else {
            hasNextPage = false;
          }
        }

        await page.close();

        // Calculate shop totals
        const totalSold = products.reduce((sum, p) => sum + (p.sold || 0), 0);
        
        // Get previous shop data for growth calculation
        const existingShop = await getShop(shopId);
        const soldPrev = existingShop?.sold_today || 0;
        
        // Create/update shop
        const shop: Shop = {
          shop_id: shopId,
          shop_name: shopName,
          shop_url: normalizedUrl,
          crawl_date: formatDate(),
          sold_today: totalSold,
          sold_prev: soldPrev,
          growth_percent: calculateGrowthPercent(totalSold, soldPrev),
          status: 'active',
          is_deleted: false,
          created_at: existingShop?.created_at || formatDate(),
          updated_at: formatDate(),
        };

        await saveShop(shop);

        // Save growth data
        if (soldPrev !== totalSold) {
          await saveGrowth({
            date: formatDate().split('T')[0],
            shop_id: shopId,
            shop_name: shopName,
            sold_prev: soldPrev,
            sold_today: totalSold,
            delta: totalSold - soldPrev,
            growth_percent: shop.growth_percent,
          });
        }

        await addLog({
          timestamp: formatDate(),
          level: 'info',
          message: `Crawled shop ${shopName}: ${products.length} products, ${totalSold} total sold`,
          shop_id: shopId,
        });

        return { shop, products };

      } catch (error) {
        retries++;
        await addLog({
          timestamp: formatDate(),
          level: 'error',
          message: `Crawl attempt ${retries} failed for shop ${shopUrl}: ${error}`,
          shop_id: shopId,
        });

        if (retries > maxRetries) {
          throw error;
        }

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 5000 * retries));
      }
    }

    throw new Error(`Failed to crawl shop after ${maxRetries} retries`);
  }

  // Crawl shop từ product URL
  public async crawlShopFromProduct(productUrl: string): Promise<{ shop: Shop; products: Product[] }> {
    const normalizedUrl = await this.normalizeUrl(productUrl);
    
    // Navigate to product page để tìm shop URL
    const page = await this.createPage();
    await page.goto(normalizedUrl, { waitUntil: 'networkidle' });
    
    // Extract shop URL from product page
    const shopUrl = await page.evaluate(() => {
      const shopLink = document.querySelector('a[href*="/shop/"], .shop-link, .seller-link');
      return shopLink ? (shopLink as HTMLAnchorElement).href : null;
    });

    await page.close();

    if (!shopUrl) {
      throw new Error(`Cannot find shop URL from product: ${productUrl}`);
    }

    return this.crawlShop(shopUrl);
  }

  // Clean up
  public async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

// Utility functions
export async function testProxy(proxy: Proxy): Promise<boolean> {
  let browser: Browser | null = null;
  
  try {
    const args = chromiumPath.args.concat([`--proxy-server=${proxy.server}`]);
    
    browser = await chromium.launch({
      args,
      executablePath: await chromiumPath.executablePath(),
      headless: true,
    });

    const page = await browser.newPage();
    
    if (proxy.username && proxy.password) {
      await page.setExtraHTTPHeaders({
        'Proxy-Authorization': `Basic ${Buffer.from(`${proxy.username}:${proxy.password}`).toString('base64')}`
      });
    }

    // Test với tiktok.com
    await page.goto('https://www.tiktok.com', { 
      waitUntil: 'domcontentloaded',
      timeout: 10000 
    });
    
    await page.close();
    return true;
    
  } catch (error) {
    console.error(`Proxy test failed for ${proxy.server}:`, error);
    return false;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Dedupe shops trong batch
export function dedupeShopUrls(urls: string[]): { uniqueShops: string[]; duplicates: string[] } {
  const shopIds = new Set<string>();
  const uniqueShops: string[] = [];
  const duplicates: string[] = [];

  for (const url of urls) {
    const shopId = parseShopId(url);
    if (!shopId) continue;

    if (shopIds.has(shopId)) {
      duplicates.push(url);
    } else {
      shopIds.add(shopId);
      uniqueShops.push(url);
    }
  }

  return { uniqueShops, duplicates };
}

// Group product URLs by shop
export function groupProductsByShop(productUrls: string[]): Map<string, string[]> {
  const shopGroups = new Map<string, string[]>();

  for (const url of productUrls) {
    const shopId = parseShopId(url); // Extract shop from product URL
    if (!shopId) continue;

    if (!shopGroups.has(shopId)) {
      shopGroups.set(shopId, []);
    }
    shopGroups.get(shopId)!.push(url);
  }

  return shopGroups;
}