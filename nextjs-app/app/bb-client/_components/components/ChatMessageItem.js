/**
 * Individual Chat Message Component
 * Handles rendering of user and assistant messages
 */
'use client';

import React from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Bot, User } from "lucide-react";
import { getMessageTokenCount, getMessageMaxTokens } from "../tools/tokenUtils";
import { Spinner } from "@/components/spinner";
import { cn } from "@/lib/utils";
import { createLiveThinkingComponent } from './LiveThinking';
import { createLiveResponseComponent } from './LiveResponse';
import { ThinkingBuffer } from './ThinkingBuffer';
import { ThinkingBubbleHost } from './ThinkingBubbleHost';

// Helper: parse timestamps defensively
const parseTimestamp = (timestamp) => {
  if (!timestamp) return new Date();
  if (timestamp instanceof Date) return timestamp;
  if (typeof timestamp === 'string' && /^\d{13}$/.test(timestamp)) {
    const ms = parseInt(timestamp, 10);
    const d = new Date(ms);
    return isNaN(d.getTime()) ? new Date() : d;
  }
  if (typeof timestamp === 'number') {
    const d = new Date(timestamp);
    return isNaN(d.getTime()) ? new Date() : d;
  }
  try {
    const d = new Date(timestamp);
    return isNaN(d.getTime()) ? new Date() : d;
  } catch {
    return new Date();
  }
};

export class ChatMessageItem extends React.Component {
  constructor(props) {

    super(props);
    this.state = {
      // Minimal state; streaming UI disabled
    };
  }

  shouldComponentUpdate(nextProps) {
    const nextMessageId = String(nextProps.message?.id);
    const currMessageId = String(this.props.message?.id);
    if (nextMessageId !== currMessageId) return true;

    // Re-render if message content changes
    if ((nextProps.message?.content || '') !== (this.props.message?.content || '')) return true;

    return false;
  }

  componentDidMount() {
    // No-op: streaming UI removed; rendering uses persisted message content only
  }

  componentDidUpdate(prevProps) {
    // No-op: persist-only rendering
  }

  componentWillUnmount() {
    // No-op
  }

  render() {
    const { message, isUser, isStreamingCurrentMessage } = this.props;
    const LiveThinking = createLiveThinkingComponent(React);
    const LiveResponse = createLiveResponseComponent(React);
    const messageDate = parseTimestamp(message.createdAt);
    const messageTime = messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const hasAssistantContent = !!(message?.content && String(message.content).trim().length);

    return (
      <div className={cn("flex gap-3 group", isUser ? "flex-row-reverse" : "flex-row")}> 
        {/* Avatar */}
        <div className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted"
        )}>
          {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
        </div>

        {/* Message Content */}
        <div className={cn("flex-1 max-w-[80%]", isUser ? "text-right" : "text-left")}> 
          {/* Header */}
          <div className={cn("flex items-center gap-2 mb-1", isUser ? "justify-end" : "justify-start")}> 
            <span className="text-sm font-medium">
              {isUser ? "You" : "Assistant"}
            </span>
            <span className="text-xs text-muted-foreground">
              {messageTime}
            </span>
          </div>

          {/* Message Content */}
          {!isUser ? (
            <>
              {/* Simple bubble host API (event-driven) */}
              <ThinkingBubbleHost messageId={message.id} />

              {/* Persisted thinking sections for refresh */}
              {Array.isArray(message.thinkingSections) && message.thinkingSections.length > 0 && (
                <div className="flex flex-col gap-3 mb-3">
                  {message.thinkingSections.map((sec, idx) => (
                    <ThinkingBuffer
                      key={`${message.id}-think-${idx}`}
                      isShowingThinking={false}
                      thinkingContent={sec?.content || ''}
                      thinkingStartTime={sec?.startTime || sec?.start_time || null}
                      thinkingEndTime={sec?.endTime || sec?.end_time || null}
                    />
                  ))}
                </div>
              )}

              {/* Thinking indicator while awaiting first tokens */}
              {isStreamingCurrentMessage && !hasAssistantContent && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Spinner size="sm" />
                  <span>Thinking…</span>
                </div>
              )}

              {/* Live Response buffer or persisted content */}
              {(() => {
                const persisted = message.content?.trim?.() || '';
                if (!persisted) {
                  return (
                    <div className="p-0">
                      <LiveResponse messageId={message.id} />
                    </div>
                  );
                }
                return (
                  <Card className="p-4 relative group/message">
                    <div className="whitespace-pre-wrap text-left">
                      {persisted}
                    </div>
                  </Card>
                );
              })()}

              {/* Stats pills: tokens, TPS, model */}
              <div className="mt-2 flex justify-start gap-2">
                    {/* Tokens pill */}
                    {(() => {
                      const tokenCount = getMessageTokenCount(message);
                      const maxTokens = getMessageMaxTokens(message, this.props.modelLimits);
                      const showMax = typeof maxTokens === 'number' && maxTokens > 0;
                      const finalTag = (message?.is_final || message?.finalized || typeof message?.tokens_per_seconds === 'number');
                      return (
                        <div className="inline-flex items-center rounded-full border font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 text-xs px-2 py-1">
                          {showMax ? `${tokenCount} / ${maxTokens} tokens` : `${tokenCount} tokens`}
                          {finalTag && (
                            <span className="text-muted-foreground ml-1 text-[10px]">(final)</span>
                          )}
                        </div>
                      );
                    })()}
                    {/* TPS pill */}
                    {typeof message?.tokens_per_seconds === 'number' && (
                      <div className="inline-flex items-center rounded-full border font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 text-xs px-2 py-1">
                        {`${Number(message.tokens_per_seconds).toFixed(1)} TPS`}
                      </div>
                    )}
                    {/* Model pill */}
                    {(() => {
                      const modelName = message?.meta?.modelName || message?.meta?.model || this.props.modelLimits?.modelName || null;
                      return modelName ? (
                        <div className="inline-flex items-center rounded-full border font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 text-xs px-2 py-1">
                          {modelName}
                        </div>
                      ) : null;
                    })()}
                  </div>
                </>
          ) : (
            <Card className="p-4 relative group/message ml-auto bg-primary text-primary-foreground">
              <div className="whitespace-pre-wrap text-left">
                {message.content?.trim?.() || ''}
              </div>
            </Card>
          )}
        </div>
      </div>
    );
  }
}
