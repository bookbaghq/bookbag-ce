import { uiEventBus } from './uiEventBus';

// Per-message state map
const stateById = new Map();
const listenersById = new Map(); // Map<id, Set<fn>>
const busBindings = new Map(); // Map<id, {unsubs: fn[], refCount: number}>

function getDefaultState(messageId) {
  return {
    id: String(messageId),
    // thinking
    thinkingContent: '',
    thinkingSegments: [], // [{ content, startTime, endTime, isShowing }]
    thinkingStartTime: null,
    thinkingEndTime: null,
    isThinkingShowing: false,
    // response
    responseContent: '',
    isStreaming: false,
    isDone: false,
    // metrics
    tokenCount: 0,
    tps: null,
    elapsed: 0,
  };
}

function emit(messageId) {
  const key = String(messageId);
  const set = listenersById.get(key);
  if (!set) return;
  for (const fn of Array.from(set)) {
    try { fn(); } catch (_) {}
  }
}

function ensureState(messageId) {
  const key = String(messageId);
  if (!stateById.has(key)) stateById.set(key, getDefaultState(key));
  if (!listenersById.has(key)) listenersById.set(key, new Set());
  return stateById.get(key);
}

export function getStreamState(messageId) {
  return ensureState(messageId);
}

export function updateStreamState(messageId, partial) {
  const key = String(messageId);
  const s = ensureState(key);
  // Merge persisted values
  const next = { ...s };
  if (partial) {
    if (typeof partial.responseContent === 'string') next.responseContent = partial.responseContent;
    if (typeof partial.isStreaming === 'boolean') next.isStreaming = partial.isStreaming;
    if (typeof partial.isDone === 'boolean') next.isDone = partial.isDone;
    if (typeof partial.tokenCount === 'number') next.tokenCount = Math.max(0, partial.tokenCount);
    if (typeof partial.tps === 'number') next.tps = partial.tps;
    if (typeof partial.elapsed === 'number') next.elapsed = Math.max(0, partial.elapsed);
  }
  try {
    console.log('[UISTORE] updateStreamState', {
      messageId: key,
      responseLen: typeof next.responseContent === 'string' ? next.responseContent.length : undefined,
      isStreaming: next.isStreaming,
      isDone: next.isDone,
      tokenCount: next.tokenCount,
      tps: next.tps
    });
  } catch (_) {}
  stateById.set(key, next);
  emit(key);
}

export function subscribeStream(messageId, listener) {
  const key = String(messageId);
  ensureState(key);
  const set = listenersById.get(key);
  set.add(listener);
  return () => {
    set.delete(listener);
    if (set.size === 0 && (!busBindings.get(key) || busBindings.get(key).refCount === 0)) {
      // optional GC: keep state for history, do not delete automatically
    }
  };
}

export function bindBusForMessage(messageId) {
  const key = String(messageId);
  ensureState(key);
  const binding = busBindings.get(key) || { unsubs: [], refCount: 0 };
  if (binding.refCount === 0) {
    // Create bus subscriptions
    const unsubReset = uiEventBus.subscribe(key, 'reset', () => {
      stateById.set(key, getDefaultState(key));
      emit(key);
    });
    const unsubThinkingSegment = uiEventBus.subscribe(key, 'thinkingSegment', ({ content, startTime, endTime }) => {
      const s = ensureState(key);
      const segment = {
        content: content || '',
        startTime: typeof startTime === 'number' ? startTime : Date.now(),
        endTime: typeof endTime === 'number' ? endTime : null,
        isShowing: true
      };
      s.thinkingSegments = Array.isArray(s.thinkingSegments) ? [...s.thinkingSegments, segment] : [segment];
      // Maintain summary fields for compatibility
      s.thinkingContent = segment.content;
      s.thinkingStartTime = segment.startTime;
      s.thinkingEndTime = segment.endTime;
      s.isThinkingShowing = true;
      emit(key);
    });
    const unsubThinking = uiEventBus.subscribe(key, 'thinking', ({ content, startTime, endTime }) => {
      const s = ensureState(key);
      s.thinkingContent = content || '';
      s.thinkingStartTime = startTime || s.thinkingStartTime || Date.now();
      s.thinkingEndTime = endTime ?? null;
      s.isThinkingShowing = !!content;
      emit(key);
    });
    const unsubResponse = uiEventBus.subscribe(key, 'response', ({ content }) => {
      const s = ensureState(key);
      s.responseContent = content || '';
      s.isStreaming = !!content;
      emit(key);
    });
    const unsubTokens = uiEventBus.subscribe(key, 'tokens', ({ tokenCount, tps, elapsed }) => {
      const s = ensureState(key);
      s.tokenCount = Math.max(0, tokenCount || 0);
      s.tps = typeof tps === 'number' ? tps : null;
      s.elapsed = Math.max(0, elapsed || 0);
      emit(key);
    });
    const unsubFinalize = uiEventBus.subscribe(key, 'finalize', () => {
      const s = ensureState(key);
      s.isStreaming = false;
      s.isDone = true;
      // Hide live thinking, keep persisted sections to render separately
      s.isThinkingShowing = false;
      // Mark last segment as ended
      if (Array.isArray(s.thinkingSegments) && s.thinkingSegments.length > 0) {
        const last = s.thinkingSegments[s.thinkingSegments.length - 1];
        s.thinkingSegments[s.thinkingSegments.length - 1] = { ...last, isShowing: false, endTime: last.endTime ?? Date.now() };
      }
      emit(key);
    });
    binding.unsubs = [unsubReset, unsubThinkingSegment, unsubThinking, unsubResponse, unsubTokens, unsubFinalize];
  }
  binding.refCount += 1;
  busBindings.set(key, binding);
  return () => {
    const b = busBindings.get(key);
    if (!b) return;
    b.refCount -= 1;
    if (b.refCount <= 0) {
      for (const u of b.unsubs) {
        try { u(); } catch (_) {}
      }
      busBindings.delete(key);
    } else {
      busBindings.set(key, b);
    }
  };
}

// React hook via useSyncExternalStore
export function createUseStreamState(react) {
  const { useSyncExternalStore, useMemo } = react;
  return function useStreamState(messageId) {
    const key = String(messageId);
    const getSnapshot = () => getStreamState(key);
    const subscribe = (fn) => subscribeStream(key, fn);
    // Ensure state exists immediately and is bound to bus for lifetime of component
    useMemo(() => { ensureState(key); }, [key]);
    return useSyncExternalStore(subscribe, getSnapshot);
  };
} 