'use client';

import * as React from 'react';
import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface LinkType {
  value: 'shop' | 'product';
  label: string;
}

const linkTypes: LinkType[] = [
  { value: 'shop', label: 'Shop Links' },
  { value: 'product', label: 'Product Links' },
];

interface InputLinksProps {
  onSubmit: (urls: string[], type: 'shop' | 'product') => void;
  isLoading?: boolean;
}

export function InputLinks({ onSubmit, isLoading = false }: InputLinksProps) {
  const [selectedType, setSelectedType] = useState<'shop' | 'product'>('shop');
  const [urls, setUrls] = useState('');

  const handleSubmit = () => {
    if (!urls.trim()) return;
    
    const urlList = urls
      .split('\n')
      .map(url => url.trim())
      .filter(url => url.length > 0);

    if (urlList.length === 0) return;

    onSubmit(urlList, selectedType);
  };

  const handleClear = () => {
    setUrls('');
  };

  const urlCount = urls.split('\n').filter(line => line.trim().length > 0).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Input Links</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Link type selector */}
        <div className="flex space-x-2">
          {linkTypes.map((type) => (
            <Button
              key={type.value}
              variant={selectedType === type.value ? 'default' : 'outline'}
              onClick={() => setSelectedType(type.value)}
              disabled={isLoading}
            >
              {type.label}
            </Button>
          ))}
        </div>

        {/* URL input textarea */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Paste {selectedType === 'shop' ? 'shop' : 'product'} URLs (one per line)
          </label>
          <textarea
            value={urls}
            onChange={(e) => setUrls(e.target.value)}
            placeholder={`https://shop.tiktok.com/view/${selectedType}/123456\nhttps://shop.tiktok.com/view/${selectedType}/789012`}
            className="w-full h-32 px-3 py-2 border border-input rounded-md bg-background text-sm placeholder:text-muted-foreground resize-none"
            disabled={isLoading}
          />
          <div className="text-xs text-muted-foreground">
            {urlCount} URL{urlCount !== 1 ? 's' : ''} detected
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex space-x-2">
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !urls.trim()}
            className="flex-1"
          >
            {isLoading ? 'Processing...' : `Queue ${selectedType} URLs`}
          </Button>
          <Button
            variant="outline"
            onClick={handleClear}
            disabled={isLoading}
          >
            Clear
          </Button>
        </div>

        {/* Help text */}
        <div className="text-xs text-muted-foreground">
          <p className="font-medium">Tips:</p>
          <ul className="mt-1 space-y-1 list-disc list-inside">
            <li>Shop links will crawl all products in the shop with pagination</li>
            <li>Product links from the same shop will be deduplicated automatically</li>
            <li>Only valid TikTok Shop URLs are processed</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}