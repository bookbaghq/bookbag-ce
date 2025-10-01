'use client';

// Lightweight event API to add/end/clear thinking bubbles by messageId

const eventName = 'bb:thinking-bubble';

export const thinkingBubbleManager = {
  add(messageId, content, startTime = Date.now(), endTime = null) {
    try {
      window.dispatchEvent(new CustomEvent(eventName, {
        detail: { type: 'add', messageId: String(messageId), content: String(content || ''), startTime, endTime }
      }));
    } catch (_) {}
  },
  end(messageId, endTime = Date.now()) {
    try {
      window.dispatchEvent(new CustomEvent(eventName, {
        detail: { type: 'end', messageId: String(messageId), endTime }
      }));
    } catch (_) {}
  },
  clear(messageId) {
    try {
      window.dispatchEvent(new CustomEvent(eventName, {
        detail: { type: 'clear', messageId: String(messageId) }
      }));
    } catch (_) {}
  }
};


