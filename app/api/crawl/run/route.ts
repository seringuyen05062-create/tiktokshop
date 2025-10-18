import { NextResponse } from 'next/server';
import { getCrawlerState, saveCrawlerState, addLog } from '@/lib/kv';
import { formatDate } from '@/lib/models';

export async function POST() {
  try {
    const currentState = await getCrawlerState();
    
    if (currentState.is_running) {
      return NextResponse.json({
        success: false,
        message: 'Crawler is already running',
        state: currentState
      });
    }

    // Start crawler
    const newState = {
      ...currentState,
      is_running: true,
      started_at: formatDate(),
      stopped_at: undefined,
    };

    await saveCrawlerState(newState);

    await addLog({
      timestamp: formatDate(),
      level: 'info',
      message: 'Crawler started manually',
    });

    return NextResponse.json({
      success: true,
      started: true,
      message: 'Crawler started successfully',
      state: newState
    });

  } catch (error) {
    console.error('Start crawler error:', error);
    
    await addLog({
      timestamp: formatDate(),
      level: 'error',
      message: `Failed to start crawler: ${error}`,
    });

    return NextResponse.json(
      { error: 'Failed to start crawler' },
      { status: 500 }
    );
  }
}