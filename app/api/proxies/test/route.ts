import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { testProxy } from '@/lib/scraper';
import { saveProxy, getAllProxies } from '@/lib/kv';
import { formatDate } from '@/lib/models';
import type { ProxyTestResponse } from '@/lib/models';

const testProxiesSchema = z.object({
  proxies: z.array(z.string()),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { proxies } = testProxiesSchema.parse(body);

    if (!proxies.length) {
      return NextResponse.json(
        { error: 'No proxies provided' },
        { status: 400 }
      );
    }

    const results = [];
    let healthy = 0;
    let quarantined = 0;

    for (const proxyString of proxies) {
      try {
        // Parse proxy string: ip:port:user:pass
        const parts = proxyString.split(':');
        const [host, port, username, password] = parts;
        
        if (!host || !port) {
          results.push({
            proxy: proxyString,
            status: 'quarantine' as const,
            error: 'Invalid proxy format'
          });
          quarantined++;
          continue;
        }

        const proxyObj = {
          id: `${host}:${port}`,
          server: `${host}:${port}`,
          username,
          password,
          status: 'inactive' as 'healthy' | 'quarantine' | 'inactive',
          last_tested: formatDate(),
          fail_count: 0,
          created_at: formatDate(),
        };

        // Test proxy
        const isHealthy = await testProxy(proxyObj);
        
        if (isHealthy) {
          proxyObj.status = 'healthy' as const;
          healthy++;
          results.push({
            proxy: proxyString,
            status: 'healthy' as const
          });
        } else {
          proxyObj.status = 'quarantine' as const;
          proxyObj.fail_count = 1;
          quarantined++;
          results.push({
            proxy: proxyString,
            status: 'quarantine' as const,
            error: 'Connection failed'
          });
        }

        // Save proxy to database
        await saveProxy(proxyObj);

      } catch (error) {
        results.push({
          proxy: proxyString,
          status: 'quarantine' as const,
          error: String(error)
        });
        quarantined++;
      }
    }

    const response: ProxyTestResponse = {
      tested: proxies.length,
      healthy,
      quarantined,
      results
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Test proxies error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to test proxies' },
      { status: 500 }
    );
  }
}