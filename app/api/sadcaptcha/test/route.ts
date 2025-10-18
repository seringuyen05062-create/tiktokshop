import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const testSadCaptchaSchema = z.object({
  api_key: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { api_key } = testSadCaptchaSchema.parse(body);

    // Test SadCaptcha API with correct balance endpoint
    const response = await fetch(`https://www.sadcaptcha.com/api/v1/license/credits?licenseKey=${api_key}`, {
      method: 'GET',
      headers: {
        'User-Agent': 'TikTokShopTool/1.0'
      }
    });

    if (response.status === 401) {
      return NextResponse.json(
        { 
          valid: false, 
          error: 'Invalid API key',
          message: 'SadCaptcha API key không hợp lệ'
        },
        { status: 400 }
      );
    }

    if (!response.ok) {
      return NextResponse.json(
        { 
          valid: false, 
          error: `API Error: ${response.status}`,
          message: `Lỗi kết nối SadCaptcha API: ${response.status}`
        },
        { status: 400 }
      );
    }

    const result = await response.json();
    
    return NextResponse.json({
      valid: true,
      balance: result.credits || result.balance || 0,
      message: `API key hợp lệ. Số dư: ${result.credits || result.balance || 0} credits`,
      api_status: 'connected'
    });

  } catch (error) {
    console.error('SadCaptcha test error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          valid: false,
          error: 'Invalid request data', 
          details: error.errors 
        },
        { status: 400 }
      );
    }

    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return NextResponse.json(
        { 
          valid: false,
          error: 'Network error',
          message: 'Không thể kết nối đến SadCaptcha API'
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        valid: false,
        error: 'Test failed',
        message: `Lỗi test SadCaptcha: ${error instanceof Error ? error.message : 'Unknown error'}`
      },
      { status: 500 }
    );
  }
}