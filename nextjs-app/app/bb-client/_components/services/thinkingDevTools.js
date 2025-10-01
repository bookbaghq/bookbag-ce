'use client';

import { thinkingBubbleManager } from './thinkingBubbleManager';

export function installThinkingTestAPI() {
  try {
    if (typeof window === 'undefined') return;
    if (!window.bbAddThinkingBubble) {
      window.bbAddThinkingBubble = function(messageId, text, seconds = 0) {
        try {
          const ms = Math.max(0, Number(seconds || 0) * 1000);
          thinkingBubbleManager.add(messageId, text, Date.now(), null);
          if (ms > 0) {
            setTimeout(() => {
              try { thinkingBubbleManager.end(messageId, Date.now()); } catch (_) {}
            }, ms);
          }
        } catch (_) {}
      };
    }
    if (!window.bbEndThinkingBubble) {
      window.bbEndThinkingBubble = function(messageId) {
        try { thinkingBubbleManager.end(messageId, Date.now()); } catch (_) {}
      };
    }
    if (!window.bbClearThinkingBubbles) {
      window.bbClearThinkingBubbles = function(messageId) {
        try { thinkingBubbleManager.clear(messageId); } catch (_) {}
      };
    }
  } catch (_) {}
}


