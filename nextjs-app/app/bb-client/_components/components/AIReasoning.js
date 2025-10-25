/**
 * AI Reasoning Component
 * Collapsible thinking/reasoning display for AI responses
 * Inspired by AI SDK Elements but adapted for your backend architecture
 */
'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Brain } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

/**
 * Format duration for display
 */
const formatDuration = (startTime, endTime) => {
  if (!startTime || !endTime) return null;
  const duration = (endTime - startTime) / 1000; // Convert to seconds
  if (duration < 1) return `${Math.round(duration * 1000)}ms`;
  return `${duration.toFixed(1)}s`;
};

/**
 * AI Reasoning Component
 * Shows collapsible thinking/reasoning sections
 */
export function AIReasoning({
  children,
  content,
  isStreaming = false,
  status = 'complete', // 'in-progress' | 'complete'
  startTime = null,
  endTime = null,
  title = 'Thinking',
  className,
  defaultOpen,
  ...props
}) {
  const displayContent = content || children || '';
  const duration = formatDuration(startTime, endTime);

  // Auto-open when streaming
  const [isOpen, setIsOpen] = useState(defaultOpen ?? (isStreaming || status === 'in-progress'));

  // Auto-open/close based on streaming state
  React.useEffect(() => {
    if (isStreaming || status === 'in-progress') {
      setIsOpen(true);
    }
  }, [isStreaming, status]);

  if (!displayContent) return null;

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className={cn("w-full", className)}
      {...props}
    >
      <div className="border rounded-lg overflow-hidden bg-muted/30">
        {/* Header with trigger */}
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between px-4 py-2 hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">{title}</span>

              {/* Status indicator */}
              {status === 'in-progress' && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary">
                  In progress...
                </span>
              )}

              {/* Duration badge */}
              {duration && status === 'complete' && (
                <span className="text-xs text-muted-foreground">
                  ({duration})
                </span>
              )}
            </div>

            {/* Chevron icon */}
            {isOpen ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        </CollapsibleTrigger>

        {/* Content */}
        <CollapsibleContent>
          <div className="px-4 py-3 text-sm border-t bg-background/50">
            <div className="whitespace-pre-wrap text-muted-foreground">
              {displayContent}
            </div>

            {/* Streaming indicator */}
            {(isStreaming || status === 'in-progress') && (
              <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1 mt-1" />
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

/**
 * Multiple Reasoning Sections Component
 * Displays multiple thinking sections in sequence
 */
export function AIReasoningSections({ sections = [], isStreaming = false, className }) {
  if (!sections || sections.length === 0) return null;

  return (
    <div className={cn("space-y-2", className)}>
      {sections.map((section, idx) => {
        const isLastSection = idx === sections.length - 1;
        const sectionStatus = section.endTime || section.end_time ? 'complete' : 'in-progress';
        const showStreaming = isStreaming && isLastSection && sectionStatus === 'in-progress';

        return (
          <AIReasoning
            key={`reasoning-${idx}`}
            content={section.content || ''}
            status={sectionStatus}
            isStreaming={showStreaming}
            startTime={section.startTime || section.start_time}
            endTime={section.endTime || section.end_time}
            title={section.title || `Thinking ${idx + 1}`}
            defaultOpen={showStreaming}
          />
        );
      })}
    </div>
  );
}

export default AIReasoning;
