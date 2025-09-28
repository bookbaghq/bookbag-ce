export class UIEventBus {
  constructor() {
    this.subscribers = new Map(); // key: `${messageId}:${event}`, value: Set<fn>
  }

  _key(messageId, event) {
    return `${String(messageId)}:${event}`;
  }

  subscribe(messageId, event, handler) {
    const key = this._key(messageId, event);
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }
    const set = this.subscribers.get(key);
    set.add(handler);
    return () => this.unsubscribe(messageId, event, handler);
  }

  unsubscribe(messageId, event, handler) {
    const key = this._key(messageId, event);
    const set = this.subscribers.get(key);
    if (!set) return;
    set.delete(handler);
    if (set.size === 0) this.subscribers.delete(key);
  }

  publish(messageId, event, payload) {
    const key = this._key(messageId, event);
    const set = this.subscribers.get(key);
    try {
      const summary = event === 'response'
        ? { contentLen: typeof payload?.content === 'string' ? payload.content.length : undefined }
        : event === 'thinking'
          ? { contentLen: typeof payload?.content === 'string' ? payload.content.length : undefined, startTime: payload?.startTime, endTime: payload?.endTime }
          : event === 'tokens'
            ? { tokenCount: payload?.tokenCount, tps: payload?.tps, elapsed: payload?.elapsed }
            : {};
      console.log('[BUS] publish', { messageId: String(messageId), event, ...summary });
    } catch (_) {}
    if (!set) return;
    for (const fn of Array.from(set)) {
      try { fn(payload); } catch (_) {}
    }
  }
}

export const uiEventBus = new UIEventBus(); 