/**
 * Chat Input Component
 * Handles message input, model selection, and context display
 */
'use client';

import { useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { 
  Send, 
  Square, 
  Paperclip, 
  Mic
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ChatInput({
  inputValue,
  setInputValue,
  onSubmit,
  onStop,
  isLoading,
  isStreaming,
  // Model selection
  availableModels,
  selectedModelId,
  onModelSelection,
  modelsLoading,
  // Thinking mode
  currentModel,
  noThinking,
  setNoThinking,
  // Context info
  contextInfo,
  contextLoading,
  contextError,
  inputTokenCount,
  modelLimits
}) {
  const textareaRef = useRef(null);

  // Format large numbers for compact display
  const formatCompactNumber = (value, withDecimal = false) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return String(value ?? '');
    const abs = Math.abs(num);
    if (abs < 1000) return num.toLocaleString();
    if (withDecimal) {
      const k = Math.round((num / 1000) * 10) / 10; // one decimal place
      return `${k}k`;
    }
    const k = Math.round(num / 1000);
    return `${k}k`;
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [inputValue]);

  // Handle keyboard shortcuts
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit(e);
    }
  };

  return (
    <div className="flex-shrink-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-4xl mx-auto p-4">
        <form onSubmit={onSubmit} className="relative">
          <Card className="relative overflow-hidden">
            {/* No Thinking Toggle - only show if model supports it */}
            {(currentModel?.supportsNoThinking || currentModel?.settings?.system_prompt_force_no_thinking) && (
              <div className="flex items-center justify-between px-3 py-2 border-b">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 text-muted-foreground">
                    <svg viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M27.501 8.46875C27.249 8.3457 27.1406 8.58008 26.9932 8.69922C26.9434 8.73828 26.9004 8.78906 26.8584 8.83398C26.4902 9.22852 26.0605 9.48633 25.5 9.45508C24.6787 9.41016 23.9785 9.66797 23.3594 10.2969C23.2275 9.52148 22.79 9.05859 22.125 8.76172C21.7764 8.60742 21.4238 8.45312 21.1807 8.11719C21.0098 7.87891 20.9639 7.61328 20.8779 7.35156C20.8242 7.19336 20.7695 7.03125 20.5879 7.00391C20.3906 6.97266 20.3135 7.13867 20.2363 7.27734C19.9258 7.84375 19.8066 8.46875 19.8174 9.10156C19.8447 10.5234 20.4453 11.6562 21.6367 12.4629C21.7725 12.5547 21.8076 12.6484 21.7646 12.7832C21.6836 13.0605 21.5869 13.3301 21.501 13.6074C21.4473 13.7852 21.3662 13.8242 21.1768 13.7461C20.5225 13.4727 19.957 13.0684 19.458 12.5781C18.6104 11.7578 17.8438 10.8516 16.8877 10.1426C16.6631 9.97656 16.4395 9.82227 16.207 9.67578C15.2314 8.72656 16.335 7.94727 16.5898 7.85547C16.8574 7.75977 16.6826 7.42773 15.8193 7.43164C14.957 7.43555 14.167 7.72461 13.1611 8.10938C13.0137 8.16797 12.8594 8.21094 12.7002 8.24414C11.7871 8.07227 10.8389 8.0332 9.84766 8.14453C7.98242 8.35352 6.49219 9.23633 5.39648 10.7441C4.08105 12.5547 3.77148 14.6133 4.15039 16.7617C4.54883 19.0234 5.70215 20.8984 7.47559 22.3633C9.31348 23.8809 11.4307 24.625 13.8457 24.4824C15.3125 24.3984 16.9463 24.2012 18.7881 22.6406C19.2529 22.8711 19.7402 22.9629 20.5498 23.0332C21.1729 23.0918 21.7725 23.002 22.2373 22.9062C22.9648 22.752 22.9141 22.0781 22.6514 21.9531C20.5186 20.959 20.9863 21.3633 20.5605 21.0371C21.6445 19.752 23.2783 18.418 23.917 14.0977C23.9668 13.7539 23.9238 13.5391 23.917 13.2598C23.9131 13.0918 23.9512 13.0254 24.1445 13.0059C24.6787 12.9453 25.1973 12.7988 25.6738 12.5352C27.0557 11.7793 27.6123 10.5391 27.7441 9.05078C27.7637 8.82422 27.7402 8.58789 27.501 8.46875Z" fill="currentColor" fillRule="nonzero"/>
                    </svg>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {noThinking ? 'Quick Response Mode' : 'Deep Thinking Mode'}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setNoThinking(!noThinking)}
                  className={cn(
                    "h-6 px-2 text-xs transition-colors",
                    noThinking 
                      ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                      : "bg-muted hover:bg-muted/80"
                  )}
                  disabled={isLoading}
                >
                  {noThinking ? 'Quick' : 'Think'}
                </Button>
              </div>
            )}
            
            <div className="">
              <div className="flex-shrink-0 pl-[15px] pt-5">
                <Select 
                  value={selectedModelId} 
                  onValueChange={onModelSelection}
                  disabled={isLoading || modelsLoading}
                  name="model-select"
                >
                  <SelectTrigger 
                    id="model-select"
                    className="w-fit border-input data-[placeholder]:text-muted-foreground [&_svg:not([class*='text-'])]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 dark:hover:bg-input/50 flex items-center justify-between gap-2 rounded-md px-3 py-2 whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 text-xs border-0 bg-muted/30 hover:bg-muted/50 focus:ring-1 focus:ring-primary w-[200px] pl-[10px]"
                    style={{ height: '25px' }}
                  >
                    <SelectValue 
                      placeholder={modelsLoading ? "Loading..." : "Select model"} 
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {(availableModels || []).map((model) => (
                      <SelectItem key={model.id} value={model.id} className="text-xs">
                        <span className="truncate">{model.name}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-2 p-3">


                {/* Text Input */}
                <div className="flex-1 relative">
                  <Textarea
                    ref={textareaRef}
                    id="chat-input"
                    name="chat-input"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask anything..."
                    disabled={isLoading}
                    className="flex w-full rounded-md border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[44px] max-h-32 resize-none border-0 shadow-none focus-visible:ring-0 pl-2.5 pt-2.5 overflow-hidden"
                    rows={1}
                  />
                </div>

                

                {/* Send/Stop Button */}
                {isStreaming ? (
                  <Button 
                    type="button" 
                    onClick={onStop}
                    variant="destructive" 
                    size="sm"
                    className="flex-shrink-0"
                  >
                    <Square className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button 
                    type="submit" 
                    disabled={isLoading || !inputValue.trim() || !selectedModelId}
                    size="sm"
                    className="flex-shrink-0 disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </Card>
          
          {/* Context Info */}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-4">
              <p className="text-xs text-muted-foreground">
                Press Enter to send, Shift+Enter for new line
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Real-time Context Size Display with Skeleton Loading */}
              {contextLoading && !contextInfo ? (
                // Show skeleton loader while fetching context info
                <Skeleton className="h-6 w-32" />
              ) : contextInfo ? (
                // Show actual context info once loaded
                <Badge 
                  variant={
                    (contextInfo.contextLimit ?? 0) > 0
                      ? (contextInfo.wouldExceedLimit
                          ? "destructive"
                          : (contextInfo.utilizationPercentage > 80 ? "secondary" : "outline"))
                      : "outline"
                  } 
                  className="text-xs px-2 py-0.5"
                >
                  { (contextInfo?.contextLimit ?? 0) > 0 ? (
                    <>
                      Context: {formatCompactNumber(contextInfo.sizeWithInput || 0)}
                      <span className="text-muted-foreground ml-1">
                        / {formatCompactNumber(contextInfo.contextLimit || 0)}
                      </span>
                      <span className="ml-1">
                        ({contextInfo.utilizationPercentage || 0}%)
                      </span>
                    </>
                  ) : (
                    <>
                      Context: {formatCompactNumber(contextInfo.sizeWithInput || 0)}
                    </>
                  ) }
                </Badge>
              ) : null}

              {/* Input Token Count - always show when there's input text */}
              {/* Input token estimation removed; rely on backend context info */}
              {(
                typeof inputTokenCount === 'number' || contextInfo
              ) && (
                <Badge 
                  variant={
                    (contextInfo?.contextLimit ?? 0) > 0
                      ? (contextInfo.wouldExceedLimit
                          ? "destructive"
                          : contextInfo.utilizationPercentage > 80
                            ? "secondary"
                            : "outline")
                      : "outline"
                  } 
                  className="text-xs px-1 py-0.5"
                >
                  {(() => {
                    const val = (typeof inputTokenCount === 'number')
                      ? inputTokenCount
                      : Math.max(0, (contextInfo?.sizeWithInput ?? 0) - (contextInfo?.currentSize ?? 0));
                    return `Input: ${formatCompactNumber(val)}`;
                  })()}
                  {(contextInfo?.contextLimit ?? 0) > 0 && (
                    <span className="text-muted-foreground ml-1">
                      / {formatCompactNumber(contextInfo.contextLimit || 0)}
                    </span>
                  )}
                </Badge>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
