'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface CrawlerState {
  status: 'idle' | 'running' | 'stopping' | 'error';
  currentShop?: string;
  processedShops: number;
  totalShops: number;
  processedProducts: number;
  errors: string[];
  startedAt?: string;
}

interface RunControlsProps {
  onRun: () => void;
  onStop: () => void;
}

export function RunControls({ onRun, onStop }: RunControlsProps) {
  const [state, setState] = useState<CrawlerState>({
    status: 'idle',
    processedShops: 0,
    totalShops: 0,
    processedProducts: 0,
    errors: [],
  });

  const isRunning = state.status === 'running';
  const isStopping = state.status === 'stopping';
  const canRun = state.status === 'idle' && state.totalShops > 0;

  const getStatusColor = () => {
    switch (state.status) {
      case 'running':
        return 'text-green-600';
      case 'stopping':
        return 'text-yellow-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusText = () => {
    switch (state.status) {
      case 'running':
        return 'Running';
      case 'stopping':
        return 'Stopping...';
      case 'error':
        return 'Error';
      default:
        return 'Idle';
    }
  };

  const progress = state.totalShops > 0 ? (state.processedShops / state.totalShops) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Crawler Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status display */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${isRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
            <span className={`font-medium ${getStatusColor()}`}>
              {getStatusText()}
            </span>
          </div>
          
          {state.currentShop && (
            <div className="text-sm text-muted-foreground">
              Current: {state.currentShop}
            </div>
          )}
        </div>

        {/* Progress bar */}
        {state.totalShops > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{state.processedShops}/{state.totalShops} shops</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="p-3 bg-gray-50 rounded-md">
            <div className="text-2xl font-bold text-gray-900">{state.processedProducts}</div>
            <div className="text-sm text-gray-600">Products Found</div>
          </div>
          <div className="p-3 bg-gray-50 rounded-md">
            <div className="text-2xl font-bold text-red-600">{state.errors.length}</div>
            <div className="text-sm text-gray-600">Errors</div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex space-x-2">
          <Button
            onClick={onRun}
            disabled={!canRun || isRunning || isStopping}
            variant={isRunning ? 'secondary' : 'default'}
            className="flex-1"
          >
            {isRunning ? 'Running...' : 'Start Crawling'}
          </Button>
          
          {(isRunning || isStopping) && (
            <Button
              onClick={onStop}
              disabled={isStopping}
              variant="outline"
            >
              {isStopping ? 'Stopping...' : 'Stop'}
            </Button>
          )}
        </div>

        {/* Recent errors */}
        {state.errors.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-red-600">Recent Errors:</h4>
            <div className="max-h-20 overflow-y-auto space-y-1">
              {state.errors.slice(-3).map((error, index) => (
                <div key={index} className="text-xs text-red-600 bg-red-50 p-2 rounded">
                  {error}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Runtime info */}
        {state.startedAt && (
          <div className="text-xs text-muted-foreground">
            Started: {new Date(state.startedAt).toLocaleString()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}