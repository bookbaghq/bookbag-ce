'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ModernChatInterface } from '../_components/modern-chat-interface';
import { KnowledgeBaseSidebar } from '../_components/components/KnowledgeBaseSidebar';

export default function ChatPage() {
  const params = useParams();
  const chatId = params.chatId;
  const router = useRouter();
  const [chatData, setChatData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadChatSession = useCallback(async () => {
    try {
      setLoading(true);

      // Call the backend directly to get chat data with messages
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || (await import('@/apiConfig.json')).default.ApiConfig.main;
      // If sign-in is disabled, backend will switch to temp user via cookie
      const response = await fetch(`${backendUrl}/bb-chat/api/chat/${chatId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for authentication
      });

      if (!response.ok) {
        if (response.status === 404) {
          // Unknown chat: redirect to /bb-client
          router.replace('/bb-client');
          return;
        }
        throw new Error(`Failed to load chat: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success || !data.chat) {
        // Invalid response: treat as unknown chat and redirect
        router.replace('/bb-client');
        return;
      }

      const chat = data.chat;

      // Transform the data to match frontend format including TPS data
      const transformedMessages = (chat.messages || []).map(msg => {
        return {
          id: msg.id,
          content: msg.content,
          createdAt: msg.createdAt || msg.created_at,
          role: msg.role, // 'user' or 'assistant'
          // ✅ Include TPS-related fields for persistent display
          tokens_per_seconds: msg.tokens_per_seconds,
          token_count: msg.token_count,
          max_tokens: msg.max_tokens,
          generation_time_ms: msg.generation_time_ms,
          startTime: msg.start_time,
          endTime: msg.end_time,
          model_id: msg.model_id,
          meta: msg.meta || null,
          // ✅ CRITICAL FIX: Include thinking sections from backend
          thinkingSections: msg.thinkingSections || [],
          // ✅ Include attachments from backend
          attachments: msg.attachments || null
        };
      });

      setChatData({
        chatId: chat.id,
        title: chat.title,
        messages: transformedMessages,
        createdAt: chat.created_at,
        updatedAt: chat.updated_at,
        isWorkspaceCreated: chat.is_workspace_created || false
      });

    } catch (err) {
      console.error('Error loading chat session:', err);
      // On any unexpected error, redirect away to avoid error screen
      try { router.replace('/bb-client'); } catch (_) {}
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [chatId, router]);

  useEffect(() => {
    if (chatId) {
      loadChatSession();
    }
  }, [chatId, loadChatSession]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading chat...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Error</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button 
            onClick={() => window.location.href = '/bb-client'}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md"
          >
            Go to New Chat
          </button>
        </div>
      </div>
    );
  }

  // Add safety check for chatData
  if (!chatData) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Initializing chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full bg-background overflow-hidden">
      <KnowledgeBaseSidebar
        chatId={chatData.chatId}
        isWorkspaceCreated={chatData.isWorkspaceCreated}
      />
      <div className="flex-1 flex flex-col h-full relative">
        <ModernChatInterface
          initialChatId={chatData.chatId}
          initialMessages={chatData.messages || []}
          chatTitle={chatData.title}
        />
      </div>
    </div>
  );
}
