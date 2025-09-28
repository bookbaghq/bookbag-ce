'use client';

import { useEffect, useState } from 'react';
import { ThinkingBuffer } from './ThinkingBuffer';

export function LiveThinkingBuffer({ messageId }) {
  const [thinkingContent, setThinkingContent] = useState('');
  const [isShowingThinking, setIsShowingThinking] = useState(false);
  const [thinkingStartTime, setThinkingStartTime] = useState(null);
  const [thinkingEndTime, setThinkingEndTime] = useState(null);

  useEffect(() => {
    const handle = (event) => {
      const { messageId: eventMessageId, content } = event.detail || {};
      if (String(eventMessageId) !== String(messageId)) return;
      const wasShowing = isShowingThinking;
      const now = !!content;
      setThinkingContent(content || '');
      setIsShowingThinking(now);
      if (!wasShowing && now) {
        setThinkingStartTime(Date.now());
        setThinkingEndTime(null);
      } else if (wasShowing && !now) {
        setThinkingEndTime(Date.now());
      }
    };

    window.addEventListener('streamingThinking', handle);
    return () => window.removeEventListener('streamingThinking', handle);
  }, [messageId, isShowingThinking]);

  if (!thinkingContent) return null;

  return (
    <ThinkingBuffer
      isShowingThinking={isShowingThinking}
      thinkingContent={thinkingContent}
      thinkingStartTime={thinkingStartTime}
      thinkingEndTime={thinkingEndTime}
    />
  );
} 