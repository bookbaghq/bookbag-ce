import React from 'react';
import { createUseStreamState } from "../services/uiStreamStore";
import { ThinkingBuffer } from './ThinkingBuffer';

export function createLiveThinkingComponent(react) {
  const useStreamState = createUseStreamState(react);
  return function LiveThinking({ messageId }) {
    const state = useStreamState(messageId);
    if (!state.isThinkingShowing || !state.thinkingContent) return null;
    return (
      <div className="flex flex-col gap-3 mb-3">
        <ThinkingBuffer
          isShowingThinking={true}
          thinkingContent={state.thinkingContent}
          thinkingStartTime={state.thinkingStartTime}
          thinkingEndTime={state.thinkingEndTime}
        />
      </div>
    );
  };
} 