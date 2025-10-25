/**
 * Modern Chat Interface - Refactored Modular Version
 * Now uses separated components, services, and controllers for better maintainability
 */
'use client';

import { Bot, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatHeader } from "./components/ChatHeader";
import { ChatInput } from "./components/ChatInput";
import { ChatMessageItemAI } from "./components/ChatMessageItemAI";
import { ChatModals } from "./components/ChatModals";
import { useChatController } from "./controllers/ChatController";
import { useMemo } from "react";

// Main Chat Interface Component
export function ModernChatInterface({ 
  initialChatId = null, 
  initialMessages = [], 
  chatTitle = null 
}) {
  // Use the controller to manage all state and logic
  const {
    // State
    messages,
    inputValue,
    setInputValue,
    isLoading,
    isStreaming,
    currentChatId,
    title,
    inputTokenCount,
    conversationTokenCount,
    contextInfo,
    contextLoading,
    contextError,
    availableModels,
    selectedModelId,
    modelsLoading,
    currentModel,
    modelLimits,
    noThinking,
    setNoThinking,
    streamingStats,
    thinkingState,
    streamingThinking,
    streamingResponse,
    streamingThinkingSections,
    deleteDialogOpen,
    setDeleteDialogOpen,
    archiveDialogOpen,
    setArchiveDialogOpen,
    // Error modal
    errorDialogOpen,
    setErrorDialogOpen,
    errorData,
    
    // Service instance
    frontendStreamingService,
    
    // Refs
    messagesEndRef,
    messagesContainerRef,
    handleScroll,
    isUserAtBottomRef,
    isUserAtBottom,
    
    // Methods
    handleSubmit,
    handleStop,
    handleModelSelection,
    handleHeaderAction,
    handleDeleteChat,
    handleArchiveChat,
    scrollToBottom,

    // Image attachments
    attachedImages,
    handleImageAttach,
    handleImageRemove
  } = useChatController({
    initialChatId,
    initialMessages,
    chatTitle
  });

  return (
    <div className="flex flex-col h-full max-h-full bg-background relative overflow-hidden">
      {/* Header */}
      <ChatHeader 
        title={title}
        currentChatId={currentChatId}
        onHeaderAction={handleHeaderAction}
      />

      {/* Messages Area - ChatGPT Style */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 flex flex-col gap-2 pt-20 min-h-0">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <Bot className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">Start a conversation</h3>
            <p className="text-muted-foreground">
              Ask me anything! I&apos;m here to help with questions, coding, writing, and more.
            </p>
          </div>
        )}
        {useMemo(() => (
          messages.map((message, index) => {
            const isUser = message.role?.toLowerCase() === 'user';
            const isLastMessage = index === messages.length - 1;
            const isStreamingCurrentMessage = !isUser && isStreaming && isLastMessage;

            return (
              <div
                key={String(message.id)}
                className={`max-w-4xl mx-auto w-full ${isStreamingCurrentMessage ? 'pt-4' : ''}`}
              >
                <ChatMessageItemAI
                  message={message}
                  isUser={isUser}
                  modelLimits={modelLimits}
                  isStreamingCurrentMessage={isStreamingCurrentMessage}
                  streamingThinking={isStreamingCurrentMessage ? streamingThinking : ''}
                  streamingResponse={isStreamingCurrentMessage ? streamingResponse : ''}
                  streamingThinkingSections={isStreamingCurrentMessage ? streamingThinkingSections : []}
                />
              </div>
            );
          })
        ), [messages, isStreaming, modelLimits, streamingThinking, streamingResponse, streamingThinkingSections])}

        {/* Bottom sentinel for intersection detection */}
        <div ref={messagesEndRef} className="h-1 w-full" />
        
        {/* Scroll to Bottom Button */}
        {messages.length > 0 && !isUserAtBottom && (
          <Button
            onClick={() => scrollToBottom(true)}
            className="fixed bottom-20 right-6 z-10 rounded-full w-10 h-10 p-0 shadow-lg"
            variant="secondary"
            title="Scroll to bottom"
          >
            <ChevronDown className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Input Area */}
      <ChatInput
        inputValue={inputValue}
        setInputValue={setInputValue}
        onSubmit={handleSubmit}
        onStop={handleStop}
        isLoading={isLoading}
        isStreaming={isStreaming}
        // Model selection
        availableModels={availableModels}
        selectedModelId={selectedModelId}
        onModelSelection={handleModelSelection}
        modelsLoading={modelsLoading}
        // Thinking mode
        currentModel={currentModel}
        noThinking={noThinking}
        setNoThinking={setNoThinking}
        // Context info
        contextInfo={contextInfo}
        contextLoading={contextLoading}
        contextError={contextError}

        inputTokenCount={inputTokenCount}
        modelLimits={modelLimits}

        // Image attachments
        attachedImages={attachedImages}
        onImageAttach={handleImageAttach}
        onImageRemove={handleImageRemove}
      />
      
      {/* Modals */}
      <ChatModals
        deleteDialogOpen={deleteDialogOpen}
        setDeleteDialogOpen={setDeleteDialogOpen}
        archiveDialogOpen={archiveDialogOpen}
        setArchiveDialogOpen={setArchiveDialogOpen}
        errorDialogOpen={errorDialogOpen}
        setErrorDialogOpen={setErrorDialogOpen}
        errorData={errorData}
        onDeleteConfirm={handleDeleteChat}
        onArchiveConfirm={handleArchiveChat}
      />
    </div>
  );
}
