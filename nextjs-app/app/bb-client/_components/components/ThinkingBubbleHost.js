'use client';

import React, { useEffect, useState } from 'react';
import { ThinkingBuffer } from './ThinkingBuffer';

// Host that listens for bb:thinking-bubble events and renders bubble list per messageId
export function ThinkingBubbleHost({ messageId }) {
  const [segments, setSegments] = useState([]); // [{ content, startTime, endTime, isShowing }]

  useEffect(() => {
    const handler = (e) => {
      const d = e?.detail || {};
      if (String(d.messageId) !== String(messageId)) return;
      if (d.type === 'clear') {
        setSegments([]);
        return;
      }
      if (d.type === 'add') {
        const seg = {
          content: String(d.content || ''),
          startTime: typeof d.startTime === 'number' ? d.startTime : Date.now(),
          endTime: typeof d.endTime === 'number' ? d.endTime : null,
          isShowing: true
        };
        setSegments(prev => [...prev, seg]);
      } else if (d.type === 'end') {
        setSegments(prev => {
          if (prev.length === 0) return prev;
          const last = prev[prev.length - 1];
          const updated = { ...last, isShowing: false, endTime: typeof d.endTime === 'number' ? d.endTime : Date.now() };
          return [...prev.slice(0, prev.length - 1), updated];
        });
      }
    };
    window.addEventListener('bb:thinking-bubble', handler);
    return () => window.removeEventListener('bb:thinking-bubble', handler);
  }, [messageId]);

  if (!segments || segments.length === 0) return null;
  return (
    <div className="flex flex-col gap-3 mb-3">
      {segments.map((seg, idx) => (
        <ThinkingBuffer
          key={`${messageId}-bubble-${idx}`}
          isShowingThinking={!!seg.isShowing}
          thinkingContent={seg.content}
          thinkingStartTime={seg.startTime}
          thinkingEndTime={seg.endTime}
        />
      ))}
    </div>
  );
}


