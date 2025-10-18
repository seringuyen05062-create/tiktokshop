import { NextResponse } from 'next/server';
import { getCrawlerState, saveCrawlerState, addLog } from '@/lib/kv';
import { formatDate } from '@/lib/models';

export async function POST() {
  try {
    const currentState = await getCrawlerState();
    
    if (!currentState.is_running) {
      return NextResponse.json({
        success: false,
        message: 'Crawler is not running',
        state: currentState
      });
    }

    // Stop crawler
    const newState = {
      ...currentState,
      is_running: false,
      stopped_at: formatDate(),
    };

    await saveCrawlerState(newState);

    await addLog({
      timestamp: formatDate(),
      level: 'info',
      message: 'Crawler stopped manually',
    });

    return NextResponse.json({
      success: true,
      stopped: true,
      message: 'Crawler stopped successfully',
      state: newState
    });

  } catch (error) {
    console.error('Stop crawler error:', error);
    
    await addLog({
      timestamp: formatDate(),
      level: 'error',
      message: `Failed to stop crawler: ${error}`,
    });

    return NextResponse.json(
      { error: 'Failed to stop crawler' },
      { status: 500 }
    );
  }
}