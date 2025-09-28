'use client';

import React, { useImperativeHandle, useState, forwardRef } from 'react';
import { ThinkingBuffer } from './ThinkingBuffer';

// Container for multiple thinking segments per message
export const ThinkingUIHost = forwardRef(function ThinkingUIHost(_, ref) {
  const [segments, setSegments] = useState([]); // [{ content, startTime, endTime, isShowing }]

  useImperativeHandle(ref, () => ({
    // Default behavior: append a new segment
    setContent: (content, startTime, endTime) => {
      if (!content) return;
      setSegments(prev => [
        ...prev,
        { content, startTime: startTime || Date.now(), endTime: endTime || null, isShowing: true }
      ]);
    },
    // Explicit append (same as setContent)
    appendContent: (content, startTime, endTime) => {
      if (!content) return;
      setSegments(prev => [
        ...prev,
        { content, startTime: startTime || Date.now(), endTime: endTime || null, isShowing: true }
      ]);
    },
    // Replace last segment's content (e.g., continuing the same block)
    replaceContent: (content, startTime, endTime) => {
      setSegments(prev => {
        if (prev.length === 0) return prev;
        const last = prev[prev.length - 1];
        const updated = { 
          ...last, 
          content: content || '', 
          isShowing: !!content, 
          startTime: last.startTime || startTime || Date.now(),
          endTime: endTime ?? (content ? null : Date.now())
        };
        return [...prev.slice(0, prev.length - 1), updated];
      });
    },
    // Upsert a single current segment (create if none, replace otherwise)
    upsertCurrent: (content, startTime, endTime) => {
      if (!content) return;
      setSegments(prev => {
        if (prev.length === 0) {
          return [{ content, startTime: startTime || Date.now(), endTime: endTime || null, isShowing: true }];
        }
        const last = prev[prev.length - 1];
        const updated = {
          ...last,
          content: content,
          isShowing: true,
          startTime: last.startTime || startTime || Date.now(),
          endTime: endTime ?? null
        };
        return [...prev.slice(0, prev.length - 1), updated];
      });
    },
    // Mark the current segment as ended
    endCurrent: () => {
      setSegments(prev => {
        console.log("onFinalizeAssistantUI");
        if (prev.length === 0) return prev;
        const last = prev[prev.length - 1];
        if (!last.isShowing) return prev;
        const updated = { ...last, isShowing: false };
        return [...prev.slice(0, prev.length - 1), updated];
      });
    },
    // Clear all segments
    clear: () => setSegments([])
  }), []);

  if (segments.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 mb-3">
      {segments.map((seg, idx) => (
        <ThinkingBuffer
          key={idx}
          isShowingThinking={seg.isShowing}
          thinkingContent={seg.content}
          thinkingStartTime={seg.startTime}
          thinkingEndTime={seg.endTime}
        />
      ))}
    </div>
  );
}); 