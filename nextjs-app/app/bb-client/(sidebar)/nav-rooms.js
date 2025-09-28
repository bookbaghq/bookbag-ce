'use client'

import { useState, useEffect } from 'react'
import { PlusCircle, Hash, Lock, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'

// Sample chat rooms data - In a real app, this would come from an API
const sampleRooms = [
  {
    id: "1",
    name: "ChatGPT",
    unread: 0,
    isSelected: true,
    isPrivate: false,
    lastMessage: {
      content: "How can I help you today?",
      timestamp: "2025-05-26T10:30:00Z"
    }
  },
  {
    id: "2",
    name: "Gemma AI",
    unread: 3,
    isSelected: false,
    isPrivate: false,
    lastMessage: {
      content: "I've analyzed the data and found some interesting patterns.",
      timestamp: "2025-05-25T15:45:00Z"
    }
  },
  {
    id: "3",
    name: "Claude",
    unread: 0,
    isSelected: false,
    isPrivate: false,
    lastMessage: {
      content: "Let me take some time to think through this problem...",
      timestamp: "2025-05-24T09:15:00Z"
    }
  },
  {
    id: "4",
    name: "Personal AI",
    unread: 2,
    isSelected: false,
    isPrivate: true,
    lastMessage: {
      content: "Your meeting is scheduled for tomorrow at 3pm.",
      timestamp: "2025-05-26T08:20:00Z"
    }
  },
  {
    id: "5",
    name: "Code Assistant",
    unread: 0,
    isSelected: false,
    isPrivate: false,
    lastMessage: {
      content: "Here's the refactored function with better error handling.",
      timestamp: "2025-05-23T16:50:00Z"
    }
  },
  {
    id: "6",
    name: "Research Helper",
    unread: 1,
    isSelected: false,
    isPrivate: false,
    lastMessage: {
      content: "I found 5 relevant academic papers on that topic.",
      timestamp: "2025-05-22T11:30:00Z"
    }
  }
];

export function NavRooms({ onRoomSelect }) {
  const [rooms, setRooms] = useState(sampleRooms);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter rooms based on search query
  const filteredRooms = rooms.filter(room => 
    room.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle room selection
  const handleRoomClick = (room) => {
    // Update local state to show selection
    setRooms(prevRooms => 
      prevRooms.map(r => ({
        ...r,
        isSelected: r.id === room.id,
        // Reset unread count when selecting a room
        unread: r.id === room.id ? 0 : r.unread
      }))
    );
    
    // Dispatch custom event for parent components to listen to
    const roomSelectedEvent = new CustomEvent('roomSelected', {
      detail: { room }
    });
    window.dispatchEvent(roomSelectedEvent);

    // Call the callback if provided
    if (onRoomSelect) {
      onRoomSelect(room);
    }
  };

  // Format timestamp to a more readable format
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    
    // Check if it's today
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // Check if it's yesterday
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    
    // Check if it's this week (within 7 days)
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 7);
    if (date > weekAgo) {
      const options = { weekday: 'short' };
      return date.toLocaleDateString([], options);
    }
    
    // Otherwise, show the date
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-270px)] py-2">
      <div className="px-3 flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold flex items-center">
          Chat Rooms
        </h2>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <PlusCircle className="h-4 w-4" />
              <span className="sr-only">Create new chat</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Create new chat
          </TooltipContent>
        </Tooltip>
      </div>

      <div className="px-3 mb-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search chats" 
            className="pl-8 h-8 text-xs" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <ScrollArea className="flex-1 overflow-y-auto">
        <div className="px-1">
          {filteredRooms.map((room) => (
            <button
              key={room.id}
              onClick={() => handleRoomClick(room)}
              className={cn(
                "w-full text-left flex items-start gap-x-3 rounded-md p-2 mb-1 relative group",
                room.isSelected 
                  ? "bg-primary/10 text-primary"
                  : "text-primary-foreground hover:bg-muted"
              )}
            >
              <div className={cn(
                "rounded-full h-9 w-9 flex items-center justify-center border",
                room.isSelected ? "border-primary bg-primary/10" : "border-muted-foreground/20 bg-muted"
              )}>
                {room.isPrivate ? 
                  <Lock className="h-4 w-4" /> : 
                  <Hash className="h-4 w-4" />
                }
              </div>
              
              <div className="flex flex-col flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className={cn(
                    "text-sm font-medium truncate",
                    room.isSelected ? "text-primary" : "text-primary-foreground"
                  )}>
                    {room.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatTimestamp(room.lastMessage.timestamp)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-xs text-muted-foreground truncate max-w-[180px]">
                    {room.lastMessage.content}
                  </span>
                  {room.unread > 0 && (
                    <Badge variant="default" className="h-5 min-w-5 flex items-center justify-center rounded-full text-[10px]">
                      {room.unread}
                    </Badge>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
