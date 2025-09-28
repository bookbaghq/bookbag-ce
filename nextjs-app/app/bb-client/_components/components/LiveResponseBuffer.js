'use client';

import { useEffect, useRef, useState } from 'react';
import { ResponseBuffer } from './ResponseBuffer';
import { StreamingStatus } from './StreamingStatus';

export function LiveResponseBuffer({ messageId, frontendStreamingService, onCopyCodeBlock, onCopyMessage, isCopied, copiedCodeBlock }) {
  const [content, setContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [liveTokenCount, setLiveTokenCount] = useState(null);
  const doneRegisteredRef = useRef(false);

  useEffect(() => {
    const handleResponse = (event) => {
      const { messageId: eventMessageId, content: c } = event.detail || {};
      if (String(eventMessageId) !== String(messageId)) return;
      setContent(c || '');
      setIsStreaming(!!c);
    };
    const handleTokens = (event) => {
      const { messageId: eventMessageId, tokenCount } = event.detail || {};
      if (String(eventMessageId) !== String(messageId)) return;
      setLiveTokenCount(tokenCount);
    };
    window.addEventListener('streamingResponse', handleResponse);
    window.addEventListener('streamingTokens', handleTokens);
    return () => {
      window.removeEventListener('streamingResponse', handleResponse);
      window.removeEventListener('streamingTokens', handleTokens);
    };
  }, [messageId]);

  useEffect(() => {
    if (!frontendStreamingService) return;
    if (!frontendStreamingService.messageId) return;
    if (String(frontendStreamingService.messageId) !== String(messageId)) return;
    if (doneRegisteredRef.current) return;

    const doneHandler = (finishedMessageId) => {
      if (String(finishedMessageId) !== String(messageId)) return;
      setIsStreaming(false);
      setIsDone(true);
      setLiveTokenCount(null);
    };

    try {
      if (typeof frontendStreamingService.registerStreamDone === 'function') {
        frontendStreamingService.registerStreamDone(doneHandler);
        doneRegisteredRef.current = true;
      }
    } catch {}
  }, [frontendStreamingService, messageId]);

  const footer = <StreamingStatus isStreaming={isStreaming} isDone={isDone} inline={true} />;

  const contentParts = content ? [{ type: 'text', key: 'main', content }] : [];

  return (
    <>
      <ResponseBuffer 
        contentParts={contentParts}
        copiedCodeBlock={copiedCodeBlock}
        onCopyCodeBlock={onCopyCodeBlock}
        onCopyMessage={onCopyMessage}
        isCopied={isCopied}
        footer={footer}
      />
    </>
  );
} 