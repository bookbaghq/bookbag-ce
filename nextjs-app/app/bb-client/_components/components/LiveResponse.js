import React, { useState } from 'react';
import { createUseStreamState } from "../services/uiStreamStore";
import { StreamingStatus } from './StreamingStatus';
import { ResponseBuffer } from './ResponseBuffer';
import { ClipboardService } from "../services/apiService";

export function createLiveResponseComponent(react) {
  const useStreamState = createUseStreamState(react);
  return function LiveResponse({ messageId }) {
    const state = useStreamState(messageId);
    const content = state.responseContent || '';
    const [isCopied, setIsCopied] = useState(false);

    const footer = <StreamingStatus isStreaming={state.isStreaming} isDone={state.isDone} inline={true} />;
    const contentParts = content ? [{ type: 'text', key: 'main', content }] : [];

    if (!content && !state.isStreaming && !state.isDone) return null;

    if (contentParts.length === 0) {
      return (
        <div className="mt-2">
          {footer}
        </div>
      );
    }

    const handleCopyMessage = async () => {
      try {
        const ok = await ClipboardService.copyToClipboard(content);
        if (ok) {
          setIsCopied(true);
          setTimeout(() => setIsCopied(false), 2000);
        }
      } catch (_) {}
    };

    return (
      <ResponseBuffer
        contentParts={contentParts}
        copiedCodeBlock={null}
        onCopyCodeBlock={() => {}}
        onCopyMessage={handleCopyMessage}
        isCopied={isCopied}
        footer={footer}
      />
    );
  };
} 