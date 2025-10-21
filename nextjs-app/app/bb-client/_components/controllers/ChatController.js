/**
 * Chat Controller
 * Orchestrates all chat logic, state management, and service coordination
 */
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { contextService, modelService } from '../services/contextService';
import { apiService } from '../services/apiService';
import { calculateConversationTokenCount, preprocessInput } from '../tools/tokenUtils';
import { createFrontendStreamingService } from '../services/frontendStreamingService';
import { bindBusForMessage } from '../services/uiStreamStore';
import { thinkingBubbleManager } from '../services/thinkingBubbleManager';
import { toast } from 'sonner';

export function useChatController({
  initialChatId = null,
  initialMessages = [],
  chatTitle = null
}) {
  const router = useRouter();

  // Core chat state
  const [messages, setMessages] = useState(initialMessages);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentChatId, setCurrentChatId] = useState(initialChatId);
  const [title, setTitle] = useState(chatTitle);

  // Token and context state
  const [inputTokenCount, setInputTokenCount] = useState(0);
  const [conversationTokenCount, setConversationTokenCount] = useState(0);
  const [contextInfo, setContextInfo] = useState(null);
  const [contextLoading, setContextLoading] = useState(false);
  const [contextError, setContextError] = useState(null);
  // Removed client-side auto-trim toggle; backend now controls trimming via model.auto_trim_on

  // Model state
  const [availableModels, setAvailableModels] = useState([]);
  const [selectedModelId, setSelectedModelId] = useState('');
  const [modelsLoading, setModelsLoading] = useState(true);
  const [currentModel, setCurrentModel] = useState(null);
  const [modelLimits, setModelLimits] = useState(null);
  const [noThinking, setNoThinking] = useState(true);

  

  // Modal state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorData, setErrorData] = useState(null);

  // Refs
  const abortControllerRef = useRef(null);
  const streamingStatsRef = useRef(null);
  const currentChatIdRef = useRef(currentChatId);
  const frontendStreamingServiceRef = useRef(null);
  const responseSaveRef = useRef({ timerId: null, lastSavedLength: 0, pendingContent: '', generationStartTime: 0, lastUpdateTime: 0, messageId: null });
  const thinkingTrackRef = useRef(new Map()); // Map<messageId, { lastSent: string, lastEnd: number|null }>
  const messagesContainerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const isUserAtBottomRef = useRef(true);
  const [isUserAtBottom, setIsUserAtBottom] = useState(true);

  // Live streaming metrics for UI badges
  const [streamingStats, setStreamingStats] = useState({ tokenCount: 0, tps: null, elapsed: 0 });

  // Image attachment state
  const [attachedImages, setAttachedImages] = useState([]);

  // Update refs when state changes
  useEffect(() => {
    currentChatIdRef.current = currentChatId;
  }, [currentChatId]);

  // Load unsent images when chat changes
  useEffect(() => {
    const loadUnsentImages = async () => {
      if (!currentChatId) {
        setAttachedImages([]);
        return;
      }

      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || (await import('@/apiConfig.json')).default.ApiConfig.main;
        const response = await fetch(`${backendUrl}/bb-media/api/media/unsent-images/${currentChatId}`, {
          method: 'GET',
          credentials: 'include'
        });

        if (!response.ok) {
          console.warn('Failed to load unsent images:', await response.text());
          return;
        }

        const result = await response.json();
        if (result.success && Array.isArray(result.images)) {
          // Map backend images to attachedImages format
          const loadedImages = result.images.map(img => ({
            url: img.url,
            fileId: img.id,
            uploading: false,
            preview: null // No preview for server images
          }));
          setAttachedImages(loadedImages);
        }
      } catch (error) {
        console.error('Error loading unsent images:', error);
      }
    };

    loadUnsentImages();
  }, [currentChatId]);


  // Update state when props change (for chat restoration)
  useEffect(() => {
    if (initialMessages.length > 0) {
      setMessages(initialMessages);
    }
    if (initialChatId) {
      setCurrentChatId(initialChatId);
      try { modelService.currentChatId = initialChatId; } catch (_) {}
    }
    if (chatTitle) {
      setTitle(chatTitle);
    }
  }, [initialMessages, initialChatId, chatTitle]);


  // Update input token count when input changes (frontend-only estimate)
  useEffect(() => {
    const text = String(inputValue || '');
    const avgCharsPerToken = 4;
    const estimate = text.length > 0 ? Math.ceil(text.length / avgCharsPerToken) : 0;
    setInputTokenCount(estimate);
  }, [inputValue]);

  // Calculate conversation token count when messages change
  useEffect(() => {
    const totalTokens = calculateConversationTokenCount(messages);
    setConversationTokenCount(totalTokens);
  }, [messages]);

  // Stable helpers and actions
  const buildModelStorageKey = useCallback((chatId) => {
    const base = 'bb:selectedModel';
    return chatId ? `${base}:${chatId}` : base;
  }, []);

  const tryRestoreSelectedModelForChat = useCallback((models, chatId) => {
    try {
      if (typeof window === 'undefined') return;
      // Prefer chat-specific key; fallback to global
      const chatKey = buildModelStorageKey(chatId);
      const globalKey = buildModelStorageKey(null);
      let savedId = window.localStorage.getItem(chatKey);
      if (!savedId) savedId = window.localStorage.getItem(globalKey);
      if (savedId) {
        const m = models.find(x => String(x.id) === String(savedId));
        if (m) {
          const selected = modelService.setSelectedModel(String(savedId));
          if (selected) {
            setSelectedModelId(String(savedId));
            setCurrentModel(selected);
            setModelLimits(modelService.getModelLimits());
          }
        }
      } else {
        // No saved selection; keep whatever modelService selected by default
        if (modelService.getSelectedModelId()) {
          setSelectedModelId(modelService.getSelectedModelId());
          setCurrentModel(modelService.getCurrentModel());
          setModelLimits(modelService.getModelLimits());
        }
      }
    } catch (_) {}
  }, [buildModelStorageKey]);

  const isWorkspaceCreated = useCallback(async (chatId) => {
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || (await import('@/apiConfig.json')).default.ApiConfig.main;
      const res = await fetch(`${backendUrl}/bb-chat/api/chat/${chatId}`, { method: 'GET', credentials: 'include' });
      if (!res.ok) return false;
      const data = await res.json();
      return !!(data?.success && data?.chat?.is_workspace_created);
    } catch (_) {
      return false;
    }
  }, []);

  const initializeModels = useCallback(async () => {
    try {
      // Provide chatId and hint if it's workspace-created for scoped filtering
      modelService.currentChatId = currentChatId;
      modelService.currentChatIsWorkspace = currentChatId ? await isWorkspaceCreated(currentChatId) : false;
      const models = await modelService.fetchAvailableModels();
      setAvailableModels(models);
      setModelsLoading(modelService.isLoading());

      // Try to restore previously selected model for this chat from localStorage
      tryRestoreSelectedModelForChat(models, currentChatId);
    } catch (error) {
      console.error('Failed to initialize models:', error);
    }
  }, [currentChatId, isWorkspaceCreated, tryRestoreSelectedModelForChat]);

  const fetchContextSize = useCallback(async (overrideModelId = null) => {
    const modelIdToUse = overrideModelId || selectedModelId;
    if (!modelIdToUse) return;

    setContextLoading(true);
    setContextError(null);

    try {
      const info = await contextService.fetchContextSize(currentChatId, inputValue, modelIdToUse);
      setContextInfo(info);
    } catch (error) {
      setContextError(error.message);
    } finally {
      setContextLoading(false);
    }
  }, [selectedModelId, currentChatId, inputValue]);

  // Fetch context size on page load, model change, and after new messages arrive
  useEffect(() => {
    if (modelLimits && selectedModelId && !isStreaming) {
      const timer = setTimeout(() => {
        fetchContextSize();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [selectedModelId, currentChatId, messages.length, isStreaming, modelLimits, fetchContextSize]);

  // Initialize models on mount
  useEffect(() => {
    initializeModels();
  }, [initializeModels]);

  // Scroll to bottom on initial mount/chat load
  useEffect(() => {
    if (messages.length > 0) {
      // Force scroll to bottom after initial messages load
      const timer = setTimeout(() => {
        isUserAtBottomRef.current = true;
        setIsUserAtBottom(true);
        scrollToBottom(false);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [currentChatId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    // Always scroll on initial load or when user is at bottom
    if (isUserAtBottomRef.current || messages.length === 0) {
      // Use setTimeout to ensure DOM has updated
      const timer = setTimeout(() => {
        try {
          const container = messagesContainerRef.current;
          if (container) {
            container.scrollTo({ top: container.scrollHeight, behavior: 'auto' });
          }
          if (messagesEndRef.current && typeof messagesEndRef.current.scrollIntoView === 'function') {
            messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
          }
        } catch (_) {}
      }, 0);

      return () => clearTimeout(timer);
    }
  }, [messages]);

  // Initial at-bottom check on message count changes
  useEffect(() => {
    try {
      const container = messagesContainerRef.current;
      if (!container) return;
      const threshold = 80;
      const atBottom = (container.scrollTop + container.clientHeight) >= (container.scrollHeight - threshold);
      isUserAtBottomRef.current = atBottom;
      setIsUserAtBottom(atBottom);
    } catch (_) {}
  }, [messages.length]);

  // Observe bottom sentinel visibility for robust at-bottom detection
  useEffect(() => {
    const container = messagesContainerRef.current;
    const sentinel = messagesEndRef.current;
    if (!container || !sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        const inView = !!entry?.isIntersecting;
        isUserAtBottomRef.current = inView;
        setIsUserAtBottom(inView);
      },
      { root: container, threshold: 0.01 }
    );

    try {
      observer.observe(sentinel);
    } catch (_) {}

    return () => {
      try { observer.disconnect(); } catch (_) {}
    };
  }, [messagesContainerRef, messagesEndRef, currentChatId]);

  const handleScroll = () => {
    try {
      const container = messagesContainerRef.current;
      if (!container) return;
      const threshold = 80; // px from bottom to consider as at-bottom
      const atBottom = (container.scrollTop + container.clientHeight) >= (container.scrollHeight - threshold);
      isUserAtBottomRef.current = atBottom;
      setIsUserAtBottom(atBottom);
    } catch (_) {}
  };

  const scrollToBottom = (smooth = true) => {
    try {
      const container = messagesContainerRef.current;
      if (container) {
        container.scrollTo({ top: container.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
      }
      if (messagesEndRef.current && typeof messagesEndRef.current.scrollIntoView === 'function') {
        messagesEndRef.current.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
      }
      isUserAtBottomRef.current = true;
      setIsUserAtBottom(true);
    } catch (_) {}
  };


  // Restore selection when chat changes and models are already loaded
  useEffect(() => {
    if (availableModels && availableModels.length > 0) {
      tryRestoreSelectedModelForChat(availableModels, currentChatId);
    }
    try { modelService.currentChatId = currentChatId; } catch (_) {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentChatId]);

  // isWorkspaceCreated moved above as useCallback

  // Keep local title in sync when header saves and broadcasts
  useEffect(() => {
    const onTitleUpdated = (e) => {
      const id = e?.detail?.chatId;
      const t = e?.detail?.title;
      if (!id || typeof t !== 'string') return;
      if (String(id) === String(currentChatIdRef.current || currentChatId)) {
        setTitle(t);
      }
    };
    try { window.addEventListener('bb:chat-title-updated', onTitleUpdated); } catch (_) {}
    return () => {
      try { window.removeEventListener('bb:chat-title-updated', onTitleUpdated); } catch (_) {}
    };
  }, [currentChatId]);


  // fetchContextSize moved above as useCallback

  const handleModelSelection = (modelId) => {
    const selectedModel = modelService.setSelectedModel(modelId);
    if (selectedModel) {
      setSelectedModelId(modelId);
      setCurrentModel(selectedModel);
      setModelLimits(modelService.getModelLimits());
      // Persist selection for this chat and globally
      try {
        if (typeof window !== 'undefined') {
          const chatKey = buildModelStorageKey(currentChatId);
          const globalKey = buildModelStorageKey(null);
          window.localStorage.setItem(chatKey, String(modelId));
          window.localStorage.setItem(globalKey, String(modelId));
        }
      } catch (_) {}
      
      // Trigger context size update when model changes
      setTimeout(() => {
        fetchContextSize(modelId);
      }, 100);
    }
  };

  const handleStreamCompletion = async (aiMessageId, _shouldSaveTPS = true) => {
    // Do not mutate message content after stream ends. Only clear streaming state.
    // Clear frontend streaming service
    if (frontendStreamingServiceRef.current) {
      frontendStreamingServiceRef.current = null;
    }
    
    // Reset streaming state
    setIsLoading(false);
    setIsStreaming(false);
    // Keep last streaming stats as-is for any immediate UI needs; optional reset can be applied if desired
  };

  const cleanupAbortController = () => {
    if (abortControllerRef.current) {
      try {
        const controller = abortControllerRef.current;
        
        if (controller && 
            typeof controller.abort === 'function' && 
            controller.signal && 
            !controller.signal.aborted) {
          controller.abort();
        }
      } catch (error) {
        console.debug('Abort controller already handled:', error.message);
      } finally {
        abortControllerRef.current = null;
      }
    }
  };

  const handleStop = async () => {
    // Signal end-of-stream to the frontend streaming service only
    try {
      if (frontendStreamingServiceRef.current && typeof frontendStreamingServiceRef.current.processToken === 'function') {
        frontendStreamingServiceRef.current.processToken({ token: '__STREAM_END__', tps: null, tokenCount: null });
      }
    } catch (e) {
      console.debug('Stop-triggered end signal warning:', e?.message);
    }

    // Find the last assistant message for TPS calculation
    const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
    const aiMessageId = lastMessage && lastMessage.role === 'assistant' ? lastMessage.id : null;
    
    // Complete the stream and refresh from backend
    await handleStreamCompletion(aiMessageId, true);
    
    // Clean up abort controller
    cleanupAbortController();
  };

  const handleStreamProcessing = async (reader, decoder, aiMessageId, response) => {
    let buffer = '';
    let currentId = aiMessageId;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.trim() || !line.startsWith('data: ')) continue;
          const data = line.slice(6);
          if (data === '[DONE]') { break; }
          if (data === '[TIMEOUT]') { break; }
          try {
            const parsed = JSON.parse(data);
            // Simple bubble tracking based on growing thinkingBuffer
            try {
              const mid = String((parsed && (parsed.messageId || parsed.realMessageId)) || aiMessageId);
              const trackMap = thinkingTrackRef.current;
              const track = trackMap.get(mid) || { lastSent: '', lastEnd: null };
              const tb = (typeof parsed.thinkingDelta === 'string') ? parsed.thinkingDelta : (typeof parsed.thinkingBuffer === 'string' ? parsed.thinkingBuffer : null);
              
              if (tb) {
                let delta = (typeof parsed.thinkingDelta === 'string') ? parsed.thinkingDelta : (tb.startsWith(track.lastSent) ? tb.slice(track.lastSent.length) : tb);
                if (delta && delta.trim()) {
                  thinkingBubbleManager.add(mid, delta, (typeof parsed.thinkingStartTime === 'number') ? parsed.thinkingStartTime : Date.now(), (typeof parsed.thinkingEndTime === 'number') ? parsed.thinkingEndTime : null);
                }
                if (typeof parsed.thinkingDelta !== 'string') {
                  track.lastSent = tb;
                } else {
                  track.lastSent = track.lastSent + parsed.thinkingDelta;
                }
                trackMap.set(mid, track);
              }
              if (typeof parsed.thinkingEndTime === 'number') {
                if (parsed.thinkingEndTime !== track.lastEnd) {
                  thinkingBubbleManager.end(mid, parsed.thinkingEndTime);
                  track.lastEnd = parsed.thinkingEndTime;
                  trackMap.set(mid, track);
                }
              }
            } catch (e) { console.error('[THINKING ERROR]', e); }
            // Map temp placeholder id to real message id when backend provides it
            try {
              const incomingId = parsed?.messageId || parsed?.realMessageId || (parsed?.finalMessage && parsed.finalMessage.id) || null;
              if (incomingId && String(incomingId) !== String(currentId)) {
                setMessages(prev => prev.map(msg => (String(msg.id) === String(currentId) ? { ...msg, id: incomingId } : msg)));
                currentId = String(incomingId);
                try { bindBusForMessage(String(currentId)); } catch (_) {}
              }
            } catch (_) {}
            // If backend streamed an error payload, surface it in the modal and stop updating content
            if (parsed && parsed.type === 'error') {
              try {
                setErrorData({
                  message: parsed.error || 'Unknown error',
                  code: parsed.code,
                  status: parsed.status,
                  provider: parsed.provider,
                  details: parsed.details
                });
                setErrorDialogOpen(true);
                // Clear the assistant placeholder from UI if it has no content
                setMessages(prev => prev.filter(msg => {
                  const isAI = String(msg.id) === String(aiMessageId);
                  if (!isAI) return true;
                  const hasContent = (msg.content || '').trim().length > 0;
                  // remove only if empty to preserve any already streamed text
                  return hasContent;
                }));
              } catch (_) {}
              continue;
            }

            // Handle AI-generated image events
            if (parsed && parsed.type === 'aiImage') {
              try {
                const imageMessageId = String(parsed.messageId || currentId);
                const imageUrl = parsed.imageUrl;

                console.log(`🖼️ Received AI-generated image event for message ${imageMessageId}:`, imageUrl);

                // Add image to the assistant message's attachments
                setMessages(prev => prev.map(msg => {
                  if (String(msg.id) !== imageMessageId) return msg;

                  const existingAttachments = msg.attachments || [];
                  const newAttachments = Array.isArray(existingAttachments)
                    ? [...existingAttachments, imageUrl]
                    : [imageUrl];

                  return {
                    ...msg,
                    attachments: newAttachments
                  };
                }));
              } catch (err) {
                console.error('Failed to handle AI image event:', err);
              }
              continue;
            }

            const latestContent = (typeof parsed.fullText === 'string')
              ? parsed.fullText
              : (typeof parsed.responseBuffer === 'string')
                ? parsed.responseBuffer
                : null;
            if (latestContent !== null) {
              setMessages(prev => {
                const hasAi = prev.some(m => String(m.id) === String(currentId));
                if (!hasAi) {
                  // First tokens: insert the AI card now
                  const aiCard = {
                    id: currentId,
                    content: latestContent,
                    role: 'assistant',
                    createdAt: Date.now(),
                    chatId: currentChatIdRef.current
                  };
                  return [...prev, aiCard];
                }
                return prev.map(msg => {
                  if (String(msg.id) !== String(currentId)) return msg;
                  const current = String(msg.content || '');
                  const incoming = String(latestContent);
                  // Never regress content length at end or during stream; keep the longest
                  return (incoming.length >= current.length) ? { ...msg, content: incoming } : msg;
                });
              });
            }

            // Live-update token counter from backend and use ONLY backend-provided TPS
            if (typeof parsed.tokenCount === 'number' || typeof parsed.tps === 'number') {
              const incomingCount = (typeof parsed.tokenCount === 'number') ? (Number(parsed.tokenCount) || 0) : null;
              const incomingTps = (typeof parsed.tps === 'number') ? parsed.tps : null;
              setMessages(prev => prev.map(msg => {
                if (String(msg.id) !== String(currentId)) return msg;
                const nextTokenCount = (incomingCount !== null)
                  ? Math.max(
                      typeof msg.token_count === 'number' ? msg.token_count : 0,
                      incomingCount
                    )
                  : msg.token_count;
                return {
                  ...msg,
                  token_count: nextTokenCount,
                  tokens_per_seconds: (incomingTps !== null) ? incomingTps : msg.tokens_per_seconds
                };
              }));
            }

            // Forward to frontend streaming service to publish thinking/response events
            try {
              if (frontendStreamingServiceRef.current && typeof frontendStreamingServiceRef.current.processToken === 'function') {
                const incomingId = parsed?.messageId || parsed?.realMessageId || null;
                frontendStreamingServiceRef.current.processToken({
                  token: (typeof parsed.chunk === 'string') ? parsed.chunk : '',
                  tps: (typeof parsed.tps === 'number') ? parsed.tps : null,
                  tokenCount: (typeof parsed.tokenCount === 'number') ? parsed.tokenCount : null,
                  messageId: incomingId || currentId,
                  responseBuffer: (typeof parsed.fullText === 'string') ? parsed.fullText : (typeof parsed.responseBuffer === 'string') ? parsed.responseBuffer : undefined,
                  thinkingBuffer: (typeof parsed.thinkingBuffer === 'string' || Array.isArray(parsed.thinkingBuffer) || (parsed.thinkingBuffer && typeof parsed.thinkingBuffer === 'object')) ? parsed.thinkingBuffer : undefined,
                  thinkingStartTime: (typeof parsed.thinkingStartTime === 'number') ? parsed.thinkingStartTime : undefined,
                  thinkingEndTime: (typeof parsed.thinkingEndTime === 'number') ? parsed.thinkingEndTime : undefined
                });
              }
            } catch (_) {}

            // Bubble management is handled above (lines 400-442) - no duplicate logic needed here

            // Apply final message payload if backend emits completion with final fields
            if (parsed && parsed.type === 'aiMessageComplete' && parsed.finalMessage) {
              const fm = parsed.finalMessage || {};
              setMessages(prev => prev.map(msg => {
                if (String(msg.id) !== String(currentId)) return msg;
                const current = String(msg.content || '');
                const finalContent = (typeof fm.content === 'string') ? fm.content : current;
                // Guard: do not overwrite longer in-memory content with shorter final payload
                const safeContent = (finalContent.length >= current.length) ? finalContent : current;
                return {
                  ...msg,
                  content: safeContent,
                  token_count: (typeof fm.token_count === 'number') ? fm.token_count : msg.token_count,
                  max_tokens: (typeof fm.max_tokens === 'number') ? fm.max_tokens : msg.max_tokens,
                  tokens_per_seconds: (typeof fm.tokens_per_seconds === 'number') ? fm.tokens_per_seconds : msg.tokens_per_seconds,
                  meta: { ...(msg.meta || {}), model: fm.model || (msg.meta && msg.meta.model) }
                };
              }));
              // Signal finalize to the UI event bus
              try { if (frontendStreamingServiceRef.current) { frontendStreamingServiceRef.current.processToken({ token: '__STREAM_END__', messageId: currentId }); } } catch (_) {}
              try { thinkingBubbleManager.end(currentId, Date.now()); } catch (_) {}
            }
          } catch (_) {
            // ignore bad line
          }
        }
      }
    } catch (_) {
      // ignore
    }
    // Do not mutate content on end; only stop streaming state
    await handleStreamCompletion(aiMessageId, true);
    try { if (frontendStreamingServiceRef.current) { frontendStreamingServiceRef.current.processToken({ token: '__STREAM_END__', messageId: aiMessageId }); } } catch (_) {}
    return aiMessageId;
  };


  // Handle image attachment
  const handleImageAttach = async (file) => {
    try {
      // Create preview URL for immediate display
      const previewUrl = URL.createObjectURL(file);

      // Add to attachedImages with loading state
      const tempImg = {
        file,
        preview: previewUrl,
        uploading: true
      };
      setAttachedImages(prev => [...prev, tempImg]);

      // Upload to backend
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || (await import('@/apiConfig.json')).default.ApiConfig.main;
      const formData = new FormData();
      formData.append('image', file);
      if (currentChatId) {
        formData.append('chatId', currentChatId);
      }

      const response = await fetch(`${backendUrl}/bb-media/api/media/upload-image`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Upload response not OK:', response.status, errorText);
        throw new Error(`Failed to upload image: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      if (!result.success || !result.imageUrl) {
        console.error('Upload failed with result:', result);
        throw new Error(result.error || 'Upload failed');
      }

      // If a chat was created, navigate to it
      if (result.chatId && !currentChatId) {
        setCurrentChatId(result.chatId);
        toast.success('Chat created! Navigating...');
        router.push(`/bb-client/${result.chatId}`);
      }

      // Update with server URL and file ID
      setAttachedImages(prev =>
        prev.map(img =>
          img.preview === previewUrl
            ? { ...img, url: result.imageUrl, fileId: result.fileId, uploading: false }
            : img
        )
      );
    } catch (error) {
      console.error('Image upload error:', error);
      toast.error(`Failed to upload image: ${error.message}`);
      // Remove failed upload
      setAttachedImages(prev => prev.filter(img => img.file !== file));
    }
  };

  // Handle image removal
  const handleImageRemove = async (index) => {
    try {
      const img = attachedImages[index];

      // If the image has been uploaded to the server, delete it from backend
      if (img?.url && !img.uploading) {
        // Extract file ID from URL: http://localhost:8080/bb-media/api/media/image/123
        const urlParts = img.url.split('/');
        const fileId = urlParts[urlParts.length - 1];

        if (fileId) {
          const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || (await import('@/apiConfig.json')).default.ApiConfig.main;

          // Call backend delete endpoint
          const response = await fetch(`${backendUrl}/bb-media/api/media/delete/media_${fileId}`, {
            method: 'DELETE',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json'
            }
          });

          if (!response.ok) {
            console.warn('Failed to delete image from server:', await response.text());
          }
        }
      }

      // Revoke preview URL to free memory
      if (img?.preview) {
        URL.revokeObjectURL(img.preview);
      }

      // Remove from UI state
      setAttachedImages(prev => prev.filter((_, i) => i !== index));
    } catch (error) {
      console.error('Error removing image:', error);
      // Still remove from UI even if backend deletion fails
      setAttachedImages(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e, retryCount = 0) => {
    e.preventDefault();
    
    // ✅ Enhanced blocking: Prevent overlapping requests during streaming
    if (!inputValue.trim() || isLoading || isStreaming) {
     
      return;
    }

  // Client no longer blocks on context limit; backend will trim if enabled on model

    const MAX_RETRIES = 2;
    const isRetry = retryCount > 0;
    const inputLength = inputValue.length;
    const userInputContent = inputValue; // Store original input

    // Preprocess input to check for spacing issues
    const { text: processedInput, needsSpacing } = preprocessInput(inputValue);

    // Note: Input preprocessing is handled automatically
    // Previously showed a confirmation dialog, but now proceeds automatically for better UX

    // Create abort controller with timeout
    abortControllerRef.current = new AbortController();
    
    const timeoutId = setTimeout(() => {
    
      abortControllerRef.current?.abort();
    }, 5 * 60 * 1000);

    setIsLoading(true);

    let userMessage, aiMessage;
    let imageUrls = [];
    let imageIds = [];

    try {
      if (!isRetry) {
        // Clear input and attachments immediately for better UX
        setInputValue('');

        // Collect image URLs and IDs from attachments
        imageUrls = attachedImages
          .filter(img => img.url && !img.uploading)
          .map(img => img.url);

        imageIds = attachedImages
          .filter(img => img.fileId && !img.uploading)
          .map(img => img.fileId);

        // Clear attachments after collecting URLs
        attachedImages.forEach(img => {
          if (img.preview) URL.revokeObjectURL(img.preview);
        });
        setAttachedImages([]);

        // Optimistic UI: add temporary user message only (do NOT show AI card yet)
        const tempUserId = `temp-user-${Date.now()}`;
        const tempAiId = `temp-ai-${Date.now()}`;
        const tempUserMessage = {
          id: tempUserId,
          content: userInputContent,
          role: 'user',
          createdAt: Date.now(),
          chatId: currentChatId,
          attachments: imageUrls.length > 0 ? imageUrls : undefined
        };
        setMessages(prev => [...prev, tempUserMessage]);

        // Scroll to bottom to show new user message
        isUserAtBottomRef.current = true;
        setIsUserAtBottom(true);
        // Use timeout to ensure DOM has updated
        setTimeout(() => scrollToBottom(false), 0);

        // Show streaming state immediately for better UX
        setIsStreaming(true);

        // ✅ DB-FIRST APPROACH: Create user message in database first

        const createResult = await apiService.createUserMessage(
          userInputContent,
          currentChatId,
          selectedModelId,
          imageUrls.length > 0 ? imageUrls : undefined
        );
        const serverUserMessage = createResult.message;
        if (!serverUserMessage) {
          throw new Error('Backend did not return created messages');
        }

        userMessage = serverUserMessage;
        // Prepare a temporary AI message id; do NOT render the card until first tokens arrive
        aiMessage = { id: tempAiId };

        // Update chat ID if this was a new chat
        if (userMessage.chatId && !currentChatId) {
          setCurrentChatId(userMessage.chatId);
          const newUrl = `/bb-client/${userMessage.chatId}`;
          window.history.pushState({}, '', newUrl);
        }

        // Replace temporary user message with server user message (includes attachments from backend)
        setMessages(prev => prev.map(m => (m.id === tempUserId ? {
          ...serverUserMessage,
          attachments: serverUserMessage.attachments || imageUrls || undefined
        } : m)));

        // Link images to the message if there are any
        if (imageIds.length > 0 && userMessage.id) {
          try {
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || (await import('@/apiConfig.json')).default.ApiConfig.main;
            const linkResponse = await fetch(`${backendUrl}/bb-media/api/media/link-images-to-message`, {
              method: 'POST',
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                imageIds: imageIds,
                messageId: userMessage.id
              })
            });

            if (!linkResponse.ok) {
              console.warn('Failed to link images to message:', await linkResponse.text());
            }
          } catch (error) {
            console.error('Error linking images to message:', error);
          }
        }

        // Add placeholder assistant message immediately so UI can show "Thinking…" before first tokens
        try {
          const placeholderId = String(tempAiId);
          setMessages(prev => {
            const hasAi = prev.some(m => String(m.id) === placeholderId);
            if (hasAi) return prev;
            const aiPlaceholder = {
              id: placeholderId,
              content: '',
              role: 'assistant',
              createdAt: Date.now(),
              chatId: serverUserMessage.chatId || currentChatIdRef.current || currentChatId
            };
            return [...prev, aiPlaceholder];
          });
        } catch (_) {}

        // ✅ STREAMING STATE remains true
      } else {
        // For retries, find existing messages
        const lastMessage = messages[messages.length - 1];
        if (lastMessage && lastMessage.role === 'assistant') {
          aiMessage = lastMessage;
          userMessage = messages[messages.length - 2];
          
          setMessages(prev => 
            prev.map(msg => 
              msg.id === aiMessage.id 
                ? { ...msg, content: '[Retrying...]\n\n' }
                : msg
            )
          );
        }
        
        // ✅ SET STREAMING STATE IMMEDIATELY for retries too
        setIsStreaming(true);
      }

        // ✅ INITIALIZE FRONTEND STREAMING SERVICE WITH REAL AI MESSAGE ID
       
        frontendStreamingServiceRef.current = createFrontendStreamingService(aiMessage.id, {
          
          
        });
        try { bindBusForMessage(String(aiMessage.id)); } catch (_) {}

        

      // Initialize streaming stats for live TPS tracking
      const streamStartTime = Date.now();
      streamingStatsRef.current = {
        startTime: streamStartTime,
        tokenCount: 0,
        lastUpdateTime: streamStartTime,
        tps: null
      };
      setStreamingStats({ tokenCount: 0, tps: null, elapsed: 0 });



      const response = await apiService.startAIStreamingResponse(
        null,
        userMessage.id,
        selectedModelId,
        {
          chatId: userMessage.chatId || currentChatId,
          noThinking: noThinking,
          // backend decides trimming via model.auto_trim_on
          signal: abortControllerRef.current.signal,
          modelType: String(currentModel?.type || '').toLowerCase()
        }
      );
      
      // Ensure loading state is visible as soon as we have initiated streaming
      setIsStreaming(true);
      
      clearTimeout(timeoutId);

      if (response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        // Use extracted stream processing function with REAL ID
        await handleStreamProcessing(reader, decoder, aiMessage.id, response);
      }
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        setMessages(prev => 
          prev.map(msg => 
            msg.id === aiMessage?.id 
              ? { ...msg, content: (msg.content || '') + '\n\n[Response stopped by user]' }
              : msg
          )
        );
      } else if (error.message.includes('ERR_INCOMPLETE_CHUNKED_ENCODING') || 
                 error.message.includes('network error') ||
                 error.name === 'TypeError') {
        
        if (retryCount < MAX_RETRIES) {
          
          
          setTimeout(() => {
            handleSubmit(e, retryCount + 1);
          }, 2000 * (retryCount + 1));
          
          return;
        } else {
          setMessages(prev => 
            prev.map(msg => 
              msg.id === aiMessage?.id 
                ? { 
                    ...msg, 
                    content: `❌ **Connection Failed After ${MAX_RETRIES + 1} Attempts**

The request failed due to network issues or the response was too large. This often happens with:

- Very long input text (${inputLength} characters)
- Network connectivity problems  
- Server timeouts during processing

**Suggestions:**
- Try breaking your text into smaller chunks
- Check your internet connection
- Try again in a moment

**Error:** ${error.message}` 
                  }
                : msg
            )
          );
        }
      } else {
        // Generic failure before/during stream start: show modal and clear empty assistant placeholder
        try {
          setErrorData({
            message: error?.message || 'Unknown error',
            code: 'CREATE_OR_STREAM_FAILED',
            provider: 'client',
            details: null
          });
          setErrorDialogOpen(true);
        } catch (_) {}

        // Remove assistant placeholder if it has no content
        setMessages(prev => prev.filter(m => {
          if (m.role === 'assistant') {
            const hasContent = (m.content || '').trim().length > 0;
            return hasContent; // keep only if it has content
          }
          return true;
        }));

        // Reset streaming/loading flags and restore input so user can retry
        setIsStreaming(false);
        setIsLoading(false);
        try { if (userInputContent) setInputValue(userInputContent); } catch (_) {}
      }
    }

  };

  const handleHeaderAction = (action) => {
    if (action === 'settings') {
     
    } else if (action === 'archive' && currentChatId) {
      setArchiveDialogOpen(true);
    } else if (action === 'delete' && currentChatId) {
      setDeleteDialogOpen(true);
    } else if ((action === 'archive' || action === 'delete') && !currentChatId) {
      toast.error('No chat is currently selected');
    }
  };

  const handleDeleteChat = async () => {
    const result = await apiService.deleteChat(currentChatId);
    if (result.success) {
      setDeleteDialogOpen(false);
      try {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('bb:chat-deleted', { detail: { chatId: currentChatId } }));
        }
      } catch (_) {}
      window.location.href = '/bb-client/';
    } else {
      toast.error(`Failed to delete chat: ${result.error}`);
    }
  };

  const handleArchiveChat = async () => {
    const result = await apiService.archiveChat(currentChatId);
    if (result.success) {
      setArchiveDialogOpen(false);
      try {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('bb:chat-archived', { detail: { chatId: currentChatId } }));
        }
      } catch (_) {}
      window.location.href = '/bb-client/';
    } else {
      toast.error(`Failed to archive chat: ${result.error}`);
    }
  };

  return {
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
    deleteDialogOpen,
    setDeleteDialogOpen,
    archiveDialogOpen,
    setArchiveDialogOpen,
    errorDialogOpen,
    setErrorDialogOpen,
    errorData,
    
    // Live streaming metrics
    streamingStats,
    
    // Service instance for ChatMessageItem
    frontendStreamingService: frontendStreamingServiceRef.current,
   
    // Scroll/refs
    messagesEndRef,
    messagesContainerRef,
    handleScroll,
    isUserAtBottomRef,
    isUserAtBottom,
    scrollToBottom,
    
    // Methods
    handleSubmit,
    handleStop,
    handleModelSelection,
    handleHeaderAction,
    handleDeleteChat,
    handleArchiveChat,

    // Image attachments
    attachedImages,
    handleImageAttach,
    handleImageRemove
  };
}