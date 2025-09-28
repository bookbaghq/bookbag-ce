'use client';

import { Badge } from '@/components/ui/badge';

export function LiveTPSBadge({ streamingStats, isStreamingCurrentMessage, historical }) {
  // Live TPS removed; rely solely on backend historical TPS
  if (historical && typeof historical.tps === 'number') {
    return (
      <Badge 
        variant="secondary" 
        className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
      >
        {historical.tps.toFixed(1)} TPS
      </Badge>
    );
  }
  return null;
} 