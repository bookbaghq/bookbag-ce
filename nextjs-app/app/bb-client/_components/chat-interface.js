'use client';

import { useState, useEffect, useRef } from 'react';
import { ChatMessage } from './chat-message';

export function ChatInterface() {
  const [messages, setMessages] = useState([]);
  const [inputValue, setValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef(null);
  const abortControllerRef = useRef(null);
  
  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  // Function to stop the AI response
  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    setIsStreaming(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;
    
    // Create abort controller for this request
    abortControllerRef.current = new AbortController();
    
    // Add user message to array
    const userMessage = {
      id: `user-${Date.now()}`,
      content: inputValue,
      createdAt: Date.now()
    };
    
    // Add placeholder AI message to array (this will show thinking indicator)
    const aiMessage = {
      id: `ai-${Date.now()}`,
      content: '',
      createdAt: Date.now()
    };
    
    setMessages(prev => [...prev, userMessage, aiMessage]);
    setValue('');
    setIsLoading(true);
    setIsStreaming(true);
    
    try {
      // HTTP streaming with ReadableStream (like ChatGPT)
      const response = await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify({ 
          messages: [...messages, userMessage],
          stream: true 
        }),
        signal: abortControllerRef.current.signal // Add abort signal
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Handle streaming response with ReadableStream
      if (response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            break;
          }
          
          // Decode chunk and add to buffer
          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;
          
          // Process complete lines (like SSE format)
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer
          
          for (const line of lines) {
            if (line.trim() === '') continue;
            
            // Handle different streaming formats
            let content = '';
            if (line.startsWith('data: ')) {
              // SSE format: data: {"content": "token"}
              try {
                const data = JSON.parse(line.slice(6));
                content = data.content || data.delta?.content || line.slice(6);
              } catch {
                content = line.slice(6);
              }
            } else {
              // Plain text streaming
              content = line;
            }
            
            if (content && content !== '[DONE]') {
              // Update the AI message content (append new tokens)
              setMessages(prev => 
                prev.map(msg => 
                  msg.id === aiMessage.id 
                    ? { ...msg, content: (msg.content || '') + content }
                    : msg
                )
              );
            }
          }
        }
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        // Request was aborted by user
        setMessages(prev => 
          prev.map(msg => 
            msg.id === aiMessage.id 
              ? { ...msg, content: (msg.content || '') + '\n\n[Response stopped by user]' }
              : msg
          )
        );
      } else {
        console.error('Streaming error:', error);
        setMessages(prev => 
          prev.map(msg => 
            msg.id === aiMessage.id 
              ? { ...msg, content: 'Sorry, there was an error processing your request.' }
              : msg
          )
        );
      }
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };
  
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4">
        {messages.map(message => (
          <ChatMessage 
            key={message.id} 
            message={message} 
            isUser={message.id.startsWith('user-')} 
          />
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      <form onSubmit={handleSubmit} className="border-t p-4">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Type your message..."
            disabled={isLoading}
            className="flex-1 border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
          />
          
          {/* Stop button - only show when streaming */}
          {isStreaming && (
            <button
              type="button"
              onClick={handleStop}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md transition-colors flex items-center gap-2"
            >
              <svg 
                width="16" 
                height="16" 
                viewBox="0 0 16 16" 
                fill="currentColor"
                className="flex-shrink-0"
              >
                <rect x="4" y="4" width="8" height="8" rx="1" />
              </svg>
              Stop
            </button>
          )}
          
          {/* Send button - hide when streaming */}
          {!isStreaming && (
            <button
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-md disabled:opacity-50 transition-colors"
            >
              Send
            </button>
          )}
        </div>
      </form>
    </div>
  );
}