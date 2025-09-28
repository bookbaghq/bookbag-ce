'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { getMessageMaxTokens } from '../tools/tokenUtils';

export function LiveTokenCounter({ message, modelLimits }) {
  const [count, setCount] = useState(null);

  useEffect(() => {
    const handle = (event) => {
      const { messageId, tokenCount } = event.detail || {};
      if (String(messageId) !== String(message.id)) return;
      setCount(tokenCount);
    };
    window.addEventListener('streamingTokens', handle);
    return () => window.removeEventListener('streamingTokens', handle);
  }, [message.id]);

  const current = count ?? 0;
  const maxTokens = getMessageMaxTokens(message, modelLimits);
  console.log('live token counter', message.id, current, maxTokens);
  return (
    <Badge 
      variant={
        (typeof maxTokens === 'number' && maxTokens > 0)
          ? (current > maxTokens * 0.85 ? 'destructive' : current > maxTokens * 0.5 ? 'secondary' : 'outline')
          : 'outline'
      }
      className="text-xs px-2 py-1"
    >
      {(typeof maxTokens === 'number' && maxTokens > 0)
        ? (<>{current.toLocaleString()} / {maxTokens.toLocaleString()} tokens</>)
        : (<>{current.toLocaleString()} tokens</>)}
      {count !== null ? (
        <span className="text-muted-foreground ml-1 text-[10px]">(live)</span>
      ) : null}
    </Badge>
  );
} 