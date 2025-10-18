import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSettings, saveSettings, hasCaptchaApiKey, saveCaptchaApiKey } from '@/lib/kv';
import { SettingsSchema } from '@/lib/models';

export async function GET() {
  try {
    const settings = await getSettings();
    const hasApiKey = await hasCaptchaApiKey();

    // Return settings without exposing API key
    const response = {
      settings: {
        captcha: {
          enabled: settings.captcha.enabled,
          hasApiKey,
          timeout_ms: settings.captcha.timeout_ms,
          max_retry: settings.captcha.max_retry,
        },
        export: settings.export,
        crawler: settings.crawler,
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Get settings error:', error);
    
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

const saveSettingsSchema = z.object({
  settings: SettingsSchema.optional(),
  captcha_api_key: z.string().optional(),
  // Support simplified format from frontend
  sadcaptcha_enabled: z.boolean().optional(),
  sadcaptcha_api_key: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = saveSettingsSchema.parse(body);
    
    // Handle both full settings format and simplified format
    let settingsToUpdate;
    let apiKeyToSave;

    if (parsed.settings) {
      // Full settings format
      settingsToUpdate = parsed.settings;
      apiKeyToSave = parsed.captcha_api_key;
    } else {
      // Simplified format from frontend
      const currentSettings = await getSettings();
      settingsToUpdate = {
        ...currentSettings,
        captcha: {
          ...currentSettings.captcha,
          enabled: parsed.sadcaptcha_enabled ?? currentSettings.captcha.enabled,
        }
      };
      apiKeyToSave = parsed.sadcaptcha_api_key;
    }

    // Save settings (without API key)
    const settingsToSave = {
      ...settingsToUpdate,
      captcha: {
        ...settingsToUpdate.captcha,
        api_key: undefined, // Don't store in settings
      }
    };

    await saveSettings(settingsToSave);

    // Save captcha API key separately if provided
    if (apiKeyToSave) {
      await saveCaptchaApiKey(apiKeyToSave);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Settings saved successfully'
    });

  } catch (error) {
    console.error('Save settings error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid settings data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to save settings' },
      { status: 500 }
    );
  }
}