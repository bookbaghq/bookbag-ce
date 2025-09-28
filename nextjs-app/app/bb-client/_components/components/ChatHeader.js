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

  React.useEffect(() => {
    let stop = false;
    (async () => {
      try {
        if (!currentChatId) { setFavorite(false); return; }
        const cfg = (await import('@/apiConfig.json')).default;
        const url = new URL(`${cfg.ApiConfig.main}/bb-chat/api/favorites/status`);
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

  const toggleFavorite = async () => {
    if (!currentChatId) return;
    try {
      const res = await fetch(`${(await import('@/apiConfig.json')).default.ApiConfig.main}/bb-chat/api/favorites/toggle`, {
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
  return (
    <div className="flex-shrink-0 fixed top-16 left-[var(--sidebar-width,theme(spacing.16))] right-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5" />
          <h1 className="font-semibold">{(title || "AI Assistant").replace(/\.+$/, '')}</h1>
        </div>
        
        {/* Settings Dropdown */}
        <div className="flex items-center gap-1">
          {currentChatId && (
            <Button variant="ghost" size="sm" onClick={toggleFavorite} aria-label="Toggle favorite">
              <Star className={`w-4 h-4 ${favorite ? 'text-yellow-400 fill-yellow-400' : ''}`} />
            </Button>
          )}
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
            {currentChatId && (
              <DropdownMenuItem 
                onClick={() => onHeaderAction('archive')}
                className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400"
              >
                <Archive className="h-4 w-4" />
                Archive
              </DropdownMenuItem>
            )}
            {currentChatId && (
              <DropdownMenuItem 
                onClick={() => onHeaderAction('delete')}
                className="flex items-center gap-2 text-red-600 dark:text-red-400"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
