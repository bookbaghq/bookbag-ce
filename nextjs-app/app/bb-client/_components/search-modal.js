'use client'
import api from '@/apiConfig.json'

import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { 
  Search, 
  X, 
  MessageSquare,
  Edit 
} from "lucide-react";

export function SearchModal({ isOpen, onClose, onChatSelect }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef(null);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Clear search when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setSearchResults([]);
      setHasSearched(false);
    }
  }, [isOpen]);

  // Debounced search function
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    const searchTimeout = setTimeout(async () => {
      await performSearch(searchQuery.trim());
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [searchQuery]);

  const performSearch = async (query) => {
    if (query.length < 2) return;

    try {
      setIsSearching(true);
      const apiUrl = `${api.ApiConfig.main}/bb-chat/api/chat/search?q=${encodeURIComponent(query)}`;
      console.log('🔍 Searching chats with query:', query);
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Search results received:', data);
        
        if (data.success) {
          setSearchResults(data.groupedResults || {});
          setHasSearched(true);
        } else {
          console.warn('⚠️ Search API returned success: false', data);
          setSearchResults({});
          setHasSearched(true);
        }
      } else {
        console.error('❌ Search failed:', response.status, response.statusText);
        setSearchResults({});
        setHasSearched(true);
      }
    } catch (error) {
      console.error('❌ Error searching chats:', error);
      setSearchResults({});
      setHasSearched(true);
    } finally {
      setIsSearching(false);
    }
  };

  const handleChatClick = (chat) => {
    onChatSelect(chat);
    onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  const getTotalResults = () => {
    if (!searchResults) return 0;
    return Object.values(searchResults).reduce((total, group) => total + (group?.length || 0), 0);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm">
      <div 
        className="relative mt-16 w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col max-h-[440px] min-h-[440px] md:max-w-[680px] md:min-w-[680px]"
        onKeyDown={handleKeyDown}
        tabIndex={-1}
      >
        {/* Header with search input and close button */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 min-h-[64px] max-h-[64px]">
          <div className="flex items-center gap-3 flex-1">
            <Search className="h-5 w-5 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none text-gray-900 dark:text-gray-100 placeholder-gray-500 text-sm"
              onKeyDown={handleKeyDown}
            />
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="ml-4 p-1 h-8 w-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="h-4 w-4 text-gray-500" />
          </Button>
        </div>

        {/* Search results */}
        <div className="flex-1 overflow-y-auto my-2">
          {isSearching ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-gray-500">Searching...</div>
            </div>
          ) : !hasSearched ? (
            <div className="mx-2">
              <div className="cursor-pointer">
                <div className="group relative flex items-center rounded-xl px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <Edit className="h-5 w-5 text-gray-500" />
                  <div className="relative grow overflow-hidden whitespace-nowrap pl-2">
                    <div className="text-sm text-gray-900 dark:text-gray-100">New chat</div>
                  </div>
                </div>
              </div>
            </div>
          ) : getTotalResults() === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-gray-500">No chats found for &quot;{searchQuery}&quot;</div>
            </div>
          ) : (
            <div className="mx-2">
              <ol>
                {/* Recent results */}
                {searchResults.recent && searchResults.recent.length > 0 && (
                  <>
                    <li>
                      <div className="group text-gray-500 relative my-2 px-4 pt-2 text-xs leading-4">
                        Recent
                      </div>
                    </li>
                    {searchResults.recent.map(chat => (
                      <li key={`recent-${chat.id}`}>
                        <div className="cursor-pointer">
                          <div 
                            className="group relative flex items-center rounded-xl px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                            onClick={() => handleChatClick(chat)}
                          >
                            <MessageSquare className="h-5 w-5 text-gray-500" />
                            <div className="relative grow overflow-hidden whitespace-nowrap pl-2">
                              <div className="text-sm text-gray-900 dark:text-gray-100">{chat.title}</div>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </>
                )}

                {/* This week results */}
                {searchResults.thisWeek && searchResults.thisWeek.length > 0 && (
                  <>
                    <li>
                      <div className="group text-gray-500 relative my-2 px-4 pt-2 text-xs leading-4">
                        This Week
                      </div>
                    </li>
                    {searchResults.thisWeek.map(chat => (
                      <li key={`week-${chat.id}`}>
                        <div className="cursor-pointer">
                          <div 
                            className="group relative flex items-center rounded-xl px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                            onClick={() => handleChatClick(chat)}
                          >
                            <MessageSquare className="h-5 w-5 text-gray-500" />
                            <div className="relative grow overflow-hidden whitespace-nowrap pl-2">
                              <div className="text-sm text-gray-900 dark:text-gray-100">{chat.title}</div>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </>
                )}

                {/* This month results */}
                {searchResults.thisMonth && searchResults.thisMonth.length > 0 && (
                  <>
                    <li>
                      <div className="group text-gray-500 relative my-2 px-4 pt-2 text-xs leading-4">
                        This Month
                      </div>
                    </li>
                    {searchResults.thisMonth.map(chat => (
                      <li key={`month-${chat.id}`}>
                        <div className="cursor-pointer">
                          <div 
                            className="group relative flex items-center rounded-xl px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                            onClick={() => handleChatClick(chat)}
                          >
                            <MessageSquare className="h-5 w-5 text-gray-500" />
                            <div className="relative grow overflow-hidden whitespace-nowrap pl-2">
                              <div className="text-sm text-gray-900 dark:text-gray-100">{chat.title}</div>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </>
                )}

                {/* Older results */}
                {searchResults.older && searchResults.older.length > 0 && (
                  <>
                    <li>
                      <div className="group text-gray-500 relative my-2 px-4 pt-2 text-xs leading-4">
                        Older
                      </div>
                    </li>
                    {searchResults.older.map(chat => (
                      <li key={`older-${chat.id}`}>
                        <div className="cursor-pointer">
                          <div 
                            className="group relative flex items-center rounded-xl px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                            onClick={() => handleChatClick(chat)}
                          >
                            <MessageSquare className="h-5 w-5 text-gray-500" />
                            <div className="relative grow overflow-hidden whitespace-nowrap pl-2">
                              <div className="text-sm text-gray-900 dark:text-gray-100">{chat.title}</div>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </>
                )}
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
