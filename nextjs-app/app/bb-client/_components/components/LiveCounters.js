import React from 'react';
import { Badge } from "@/components/ui/badge";
import { createUseStreamState } from "../services/uiStreamStore";

export function createLiveCountersComponent(react) {
  const useStreamState = createUseStreamState(react);
  return function LiveCounters({ messageId, modelLimits, getMaxTokens, getTokenCount, modelName }) {
    const state = useStreamState(messageId);
    const currentTokenCount = state.tokenCount || 0;
    const computedMax = typeof getMaxTokens === 'function' ? getMaxTokens(currentTokenCount, modelLimits) : (modelLimits?.maxTokens ?? null);
    const nameToShow = modelName || modelLimits?.modelName;

    return (
      <div className="mt-2 flex justify-start gap-2">
        <Badge 
          variant={
            computedMax && currentTokenCount > computedMax * 0.85 
              ? "destructive" 
              : computedMax && currentTokenCount > computedMax * 0.5 
                ? "secondary" 
                : "outline"
          } 
          className="text-xs px-2 py-1"
        >
          {computedMax ? (
            <>
              {currentTokenCount.toLocaleString()} / {computedMax.toLocaleString()} tokens
            </>
          ) : (
            <>
              {currentTokenCount.toLocaleString()} tokens
            </>
          )}
          {state.isStreaming && (
            <span className="text-muted-foreground ml-1 text-[10px]">(live)</span>
          )}
          {!state.isStreaming && state.isDone && (
            <span className="text-muted-foreground ml-1 text-[10px]">(final)</span>
          )}
        </Badge>

        {state.isStreaming && typeof state.tps === 'number' && (
          <Badge 
            variant="secondary" 
            className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 animate-pulse"
          >
            {state.tps.toFixed(1)} TPS
            <span className="text-muted-foreground ml-1 text-[10px]">
              ({(state.tokenCount || 0)} tokens, {(state.elapsed || 0).toFixed(1)}s)
            </span>
          </Badge>
        )}

        {!state.isStreaming && state.isDone && typeof state.tps === 'number' && (
          <Badge 
            variant="outline" 
            className="text-xs px-2 py-1"
          >
            {(state.tps || 0).toFixed(1)} TPS
          </Badge>
        )}

        {nameToShow && (
          <Badge 
            variant="outline"
            className="text-xs px-2 py-1"
          >
            {nameToShow}
          </Badge>
        )}
      </div>
    );
  };
} 