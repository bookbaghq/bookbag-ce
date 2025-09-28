'use client';

import React, { forwardRef, useImperativeHandle, useState } from 'react';
import { ResponseBuffer } from './ResponseBuffer';
import { StreamingStatus } from './StreamingStatus';
import { ClipboardService } from "../services/apiService";

export const ResponseUIHost = forwardRef(function ResponseUIHost(_, ref) {
  const [content, setContentState] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [copiedCodeBlock, setCopiedCodeBlock] = useState(null);

  useImperativeHandle(ref, () => ({
    setContent: (c) => {
      if (typeof c !== 'string') return;
      setContentState(c);
      setIsStreaming(!!c);
      if (!c) setIsDone(false);
    },
    appendContent: (c) => {
      if (typeof c !== 'string' || c.length === 0) return;
      setContentState(prev => (prev || '') + c);
      setIsStreaming(true);
    },
    replaceContent: (c) => {
      setContentState(c || '');
      setIsStreaming(!!c);
    },
    markDone: () => {
      setIsStreaming(false);
      setIsDone(true);
    },
    clear: () => {
      setContentState('');
      setIsStreaming(false);
      setIsDone(false);
    }
  }), []);

  const footer = <StreamingStatus isStreaming={isStreaming} isDone={isDone} inline={true} />;
  const contentParts = content ? [{ type: 'text', key: 'main', content }] : [];

  if (!content && !isStreaming && !isDone) return null;

  // When there is no content but we are streaming or done, still render the footer visibly
  if (contentParts.length === 0) {
    return (
      <div className="mt-2">
        {footer}
      </div>
    );
  }

  return (
    <ResponseBuffer
      contentParts={contentParts}
      copiedCodeBlock={copiedCodeBlock}
      onCopyCodeBlock={(code, idx) => {
        setCopiedCodeBlock(idx);
        setTimeout(() => setCopiedCodeBlock(null), 2000);
      }}
      onCopyMessage={async () => {
        try {
          const ok = await ClipboardService.copyToClipboard(content || '');
          if (ok) {
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
          }
        } catch (_) {}
      }}
      isCopied={isCopied}
      footer={footer}
    />
  );
}); 