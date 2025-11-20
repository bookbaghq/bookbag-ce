/**
 * Individual Chat Message Component with AI SDK Integration
 * Handles rendering of user and assistant messages using AI SDK Elements
 */
'use client';

import React from 'react';
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Bot, User } from "lucide-react";
import { getMessageTokenCount, getMessageMaxTokens } from "../tools/tokenUtils";
import { Spinner } from "@/components/spinner";
import { cn } from "@/lib/utils";

// Our enhanced AI components
import { AIResponse } from './AIResponse';
import { AIReasoning, AIReasoningSections } from './AIReasoning';

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

export function ChatMessageItemAI({
  message,
  isUser,
  isStreamingCurrentMessage,
  modelLimits,
  streamingThinking = '',
  streamingResponse = '',
  streamingThinkingSections = []
}) {
  const messageDate = parseTimestamp(message.createdAt);
  const messageTime = messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const hasAssistantContent = !!(message?.content && String(message.content).trim().length);

  // Determine what content to show
  const persistedContent = message.content?.trim?.() || '';
  const displayContent = persistedContent || streamingResponse;

  // Determine thinking sections to show (persisted or streaming)
  const persistedThinkingSections = message.thinkingSections || [];
  const displayThinkingSections = persistedThinkingSections.length > 0
    ? persistedThinkingSections
    : streamingThinkingSections;

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
            {/* Thinking Sections using enhanced AIReasoning Component */}
            {displayThinkingSections.length > 0 && (
              <div className="mb-3">
                <AIReasoningSections
                  sections={displayThinkingSections}
                  isStreaming={isStreamingCurrentMessage}
                />
              </div>
            )}

            {/* Streaming thinking indicator (when no persisted sections yet) */}
            {isStreamingCurrentMessage && streamingThinking && displayThinkingSections.length === 0 && (
              <div className="mb-3">
                <AIReasoning
                  content={streamingThinking}
                  status="in-progress"
                  isStreaming={true}
                />
              </div>
            )}

            {/* Thinking indicator while awaiting first tokens */}
            {isStreamingCurrentMessage && !hasAssistantContent && !streamingResponse && !streamingThinking && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Spinner size="sm" />
                <span>Thinking…</span>
              </div>
            )}

            {/* Response Content using enhanced AIResponse Component */}
            {displayContent && (
              <Card className="p-4 relative group/message">
                <AIResponse
                  content={displayContent}
                  status={isStreamingCurrentMessage && !persistedContent ? 'streaming' : 'complete'}
                />
              </Card>
            )}

            {/* Display AI-generated images if present - BELOW the message card */}
            {message.attachments && Array.isArray(message.attachments) && message.attachments.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2 justify-start">
                {message.attachments.map((imageUrl, idx) => (
                  <Image
                    key={idx}
                    src={imageUrl}
                    alt={`AI-generated image ${idx + 1}`}
                    width={200}
                    height={200}
                    className="max-w-[200px] rounded border border-border"
                    unoptimized
                  />
                ))}
              </div>
            )}

            {/* Stats pills: tokens, TPS, model */}
            <div className="mt-2 flex justify-start gap-2">
              {/* Tokens pill */}
              {(() => {
                const tokenCount = getMessageTokenCount(message);
                const maxTokens = getMessageMaxTokens(message, modelLimits);
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
                const modelName = message?.meta?.modelName || message?.meta?.model || modelLimits?.modelName || null;
                return modelName ? (
                  <div className="inline-flex items-center rounded-full border font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 text-xs px-2 py-1">
                    {modelName}
                  </div>
                ) : null;
              })()}
            </div>
          </>
        ) : (
          <>
            {/* User Message */}
            <Card className="p-4 relative group/message ml-auto bg-primary text-primary-foreground">
              <div className="whitespace-pre-wrap text-left">
                {message.content?.trim?.() || ''}
              </div>
            </Card>

            {/* Display attached images if present - BELOW the message card */}
            {message.attachments && Array.isArray(message.attachments) && message.attachments.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2 justify-end">
                {message.attachments.map((imageUrl, idx) => (
                  <Image
                    key={idx}
                    src={imageUrl}
                    alt={`Attachment ${idx + 1}`}
                    width={200}
                    height={200}
                    className="max-w-[200px] rounded border border-border"
                    unoptimized
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Export both class and function component for backward compatibility
export class ChatMessageItem extends React.Component {
  render() {
    return <ChatMessageItemAI {...this.props} />;
  }
}

export default ChatMessageItemAI;
