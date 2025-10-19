/**
 * Chat Header Component
 * Handles the header with title and settings dropdown
 */
'use client';

import React from 'react';
import { Button } from "@/components/ui/button";
import { 
  Settings,
  Bot,
  Archive,
  Trash2,
  Star
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ChatHeader({ 
  title, 
  currentChatId, 
  onHeaderAction 
}) {
  const [favorite, setFavorite] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [pendingTitle, setPendingTitle] = React.useState(title || '');

  React.useEffect(() => {
    let stop = false;
    (async () => {
      try {
        if (!currentChatId) { setFavorite(false); return; }
        const cfg = (await import('@/apiConfig.json')).default;
        const base = process.env.NEXT_PUBLIC_BACKEND_URL || cfg.ApiConfig.main;
        const url = new URL(`${base}/bb-chat/api/favorites/status`);
        url.searchParams.set('chatId', String(currentChatId));
        const res = await fetch(url.toString(), { method: 'GET', credentials: 'include' });
        const data = await res.json();
        if (!stop && data && data.success) {
          setFavorite(!!data.is_favorite);
        } else if (!stop) {
          setFavorite(false);
        }
      } catch (_) {
        if (!stop) setFavorite(false);
      }
    })();
    return () => { stop = true; };
  }, [currentChatId]);

  React.useEffect(() => {
    setPendingTitle((title || 'AI Assistant').replace(/\.+$/, ''));
  }, [title]);

  const toggleFavorite = async () => {
    if (!currentChatId) return;
    try {
      const base = process.env.NEXT_PUBLIC_BACKEND_URL || (await import('@/apiConfig.json')).default.ApiConfig.main;
      const res = await fetch(`${base}/bb-chat/api/favorites/toggle`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: currentChatId, favorite: !favorite })
      });
      const data = await res.json();
      if (data && data.success) {
        setFavorite(!!data.is_favorite);
      }
    } catch (_) {}
  };

  const saveTitle = async () => {
    try {
      const newTitle = String(pendingTitle || '').trim();
      setIsEditing(false);
      if (!currentChatId || !newTitle) {
        setPendingTitle((title || 'AI Assistant').replace(/\.+$/, ''));
        return;
      }
      const base = process.env.NEXT_PUBLIC_BACKEND_URL || (await import('@/apiConfig.json')).default.ApiConfig.main;
      const res = await fetch(`${base}/bb-chat/api/chat/edit`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: currentChatId, title: newTitle })
      });
      const data = await res.json();
      if (data?.success && data?.chat?.title) {
        // Update local title immediately by dispatching an event; parent owns the props
        try { window.dispatchEvent(new CustomEvent('bb:chat-title-updated', { detail: { chatId: currentChatId, title: data.chat.title } })); } catch (_) {}
        setPendingTitle(data.chat.title);
      } else {
        setPendingTitle((title || 'AI Assistant').replace(/\.+$/, ''));
      }
    } catch (_) {
      setPendingTitle((title || 'AI Assistant').replace(/\.+$/, ''));
    }
  };
  return (
    <div
      className="absolute top-0 right-0 left-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
    >
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5" />
          {currentChatId ? (
            isEditing ? (
              <input
                autoFocus
                value={pendingTitle}
                onChange={(e) => setPendingTitle(e.target.value)}
                onBlur={async () => {
                  await saveTitle();
                }}
                onKeyDown={async (e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    await saveTitle();
                  } else if (e.key === 'Escape') {
                    setIsEditing(false);
                    setPendingTitle((title || 'AI Assistant').replace(/\.+$/, ''));
                  }
                }}
                className="font-semibold bg-transparent border-b border-muted-foreground/40 focus:outline-none focus:border-primary/60 text-base px-1"
              />
            ) : (
              <h1
                className="font-semibold cursor-text"
                title="Click to rename"
                onClick={() => { if (currentChatId) setIsEditing(true); }}
              >
                {(title || "AI Assistant").replace(/\.+$/, '')}
              </h1>
            )
          ) : (
            <h1 className="font-semibold">{(title || "AI Assistant").replace(/\.+$/, '')}</h1>
          )}
        </div>
        
        {/* Settings Dropdown */}
        <div className="flex items-center gap-1">
          {currentChatId && (
            <Button variant="ghost" size="sm" onClick={toggleFavorite} aria-label="Toggle favorite">
              <Star className={`w-4 h-4 ${favorite ? 'text-yellow-400 fill-yellow-400' : ''}`} />
            </Button>
          )}
        {currentChatId && (
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <Settings className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48" sideOffset={5}>
              <DropdownMenuItem 
                onClick={() => onHeaderAction('settings')}
                className="flex items-center gap-2"
              >
                <Settings className="h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onHeaderAction('archive')}
                className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400"
              >
                <Archive className="h-4 w-4" />
                Archive
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onHeaderAction('delete')}
                className="flex items-center gap-2 text-red-600 dark:text-red-400"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        </div>
      </div>
    </div>
  );
}
