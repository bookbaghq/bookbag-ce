'use client'

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  Search,
  Settings,
  Square,
  Edit,
  Grid,
  BookOpen,
  PlayCircle,
  PlusCircle,
  ChevronDown,
  ChevronRight,
  Star,
  MoreHorizontal,
  Trash2,
  Archive
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter
} from "@/components/ui/sidebar";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { SearchModal } from "../_components/search-modal";
import WorkspaceService from "@/services/workspaceService";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// Navigation data structure
const navigationData = {
  // Top level navigation items
  topNav: [
    {
      id: "new-chat",
      title: "New chat",
      icon: PlusCircle,
    },
    {
      id: "search-chats",
      title: "Search chats",
      icon: Search,
    },
  ],
  
  // Chat history grouped by time period
  chatHistory: {
    favorites: [
      { 
        id: "fav-1", 
        title: "UI/UX Design Brief", 
        timestamp: "24 Mar",
        description: "UI/UX Designer creating delightful digital experiences with a user-centered..."
      },
      { 
        id: "fav-2", 
        title: "QA Process Explained", 
        timestamp: "22 Mar",
        description: "Quality Assurance (QA) is a process that ensures that a product or service meets specific..."
      }
    ],
    recent: [
      { 
        id: "recent-1", 
        title: "Quantum Entanglement", 
        timestamp: "Today",
        description: "Exploring the fascinating phenomenon of quantum entanglement and its implications for quantum computing."
      }
    ],
    yesterday: [
      { 
        id: "y-1", 
        title: "Big Data's Role in Science", 
        timestamp: "Yesterday",
        description: "Examining how big data analytics is transforming scientific research and enabling new discoveries."
      },
      { 
        id: "y-2", 
        title: "Artificial Intelligence in Healthcare", 
        timestamp: "Yesterday",
        description: "Analyzing the current applications and future potential of AI in improving healthcare outcomes."
      }
    ],
    previousWeek: [
      { 
        id: "pw-1", 
        title: "Blockchain's Influence on Digital Privacy", 
        timestamp: "5 days ago",
        description: "Investigating how blockchain technology is reshaping our approach to data privacy and security."
      },
      { 
        id: "pw-2", 
        title: "AI's Applications and Ethical Concerns", 
        timestamp: "6 days ago",
        description: "Discussing the wide-ranging applications of AI and the ethical questions they raise."
      },
      { 
        id: "pw-3", 
        title: "Biotechnology's Impact on Modern Medicine", 
        timestamp: "7 days ago",
        description: "Exploring how advances in biotechnology are revolutionizing medical treatments and diagnostics."
      }
    ]
  }
};

export function SidebarNav(props) {
  const pathname = usePathname();
  const [activeNavItem, setActiveNavItem] = useState(null);
  const [activeChatId, setActiveChatId] = useState(null);
  const [expandedSections, setExpandedSections] = useState(() => {
    // Initialize expanded states from localStorage if available
    let allThreadsExpanded = false;
    let favoritesExpanded = true;
    try {
      const savedAll = localStorage.getItem('sidebarAllThreadsExpanded');
      if (savedAll !== null) allThreadsExpanded = JSON.parse(savedAll);
    } catch (error) {
      console.warn('Error loading allThreads state from localStorage:', error);
    }
    try {
      const savedFav = localStorage.getItem('sidebarFavoritesExpanded');
      if (savedFav !== null) favoritesExpanded = JSON.parse(savedFav);
    } catch (error) {
      console.warn('Error loading favorites state from localStorage:', error);
    }

    return {
      favorites: favoritesExpanded,
      recent: true,
      yesterday: true,
      previousWeek: true,
      allThreads: allThreadsExpanded
    };
  });
  const [chatData, setChatData] = useState({
    favorites: [],
    recent: [],
    yesterday: [],
    previousWeek: []
  });
  const [allThreads, setAllThreads] = useState([]);
  const [adminChats, setAdminChats] = useState([]);
  const [adminChatsTotal, setAdminChatsTotal] = useState(0);
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [allThreadsLoading, setAllThreadsLoading] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null); // composite key: scope:id or scope:wsId:chatId
  const [hoveredThread, setHoveredThread] = useState(null); // composite key: scope:id or scope:wsId:chatId
  const [workspaces, setWorkspaces] = useState([]);
  const [workspaceExpanded, setWorkspaceExpanded] = useState({});
  const [workspaceChats, setWorkspaceChats] = useState({});
  
  // AlertDialog state management
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [selectedThreadId, setSelectedThreadId] = useState(null);

  // Extract chat ID from pathname
  useEffect(() => {
    const pathParts = pathname.split('/');
    const chatId = pathParts[pathParts.length - 1];
    if (chatId && chatId !== 'bb-client' && !isNaN(chatId)) {
      setActiveChatId(chatId);
    } else {
      setActiveChatId(null);
    }
  }, [pathname]);

  // Save expanded states to localStorage when they change
  useEffect(() => {
    try { localStorage.setItem('sidebarAllThreadsExpanded', JSON.stringify(expandedSections.allThreads)); } catch (_) {}
  }, [expandedSections.allThreads]);
  useEffect(() => {
    try { localStorage.setItem('sidebarFavoritesExpanded', JSON.stringify(expandedSections.favorites)); } catch (_) {}
  }, [expandedSections.favorites]);

  useEffect(() => {
    // Handle global deletion/archival events to keep sidebar in sync
    const onDeleted = (e) => {
      const id = e?.detail?.chatId;
      if (!id) return;
      // Remove from all local state arrays, including workspace lists
      setAllThreads(prev => prev.filter(thread => String(thread.id) !== String(id)));
      setChatData(prev => ({
        favorites: prev.favorites.filter(chat => String(chat.id) !== String(id)),
        recent: prev.recent.filter(chat => String(chat.id) !== String(id)),
        yesterday: prev.yesterday.filter(chat => String(chat.id) !== String(id)),
        previousWeek: prev.previousWeek.filter(chat => String(chat.id) !== String(id))
      }));
      setWorkspaceChats(prev => {
        const next = { ...prev };
        for (const wid of Object.keys(next)) {
          next[wid] = (next[wid] || []).filter(c => String((c?.id ?? c?.chat_id)) !== String(id));
        }
        return next;
      });
    };
    const onArchived = onDeleted;
    const onTitleUpdated = (e) => {
      const id = e?.detail?.chatId;
      const t = e?.detail?.title;
      if (!id || typeof t !== 'string') return;
      const updateTitle = (arr) => arr.map(c => (String(c.id) === String(id) ? { ...c, title: t } : c));
      setAllThreads(prev => updateTitle(prev));
      setChatData(prev => ({
        favorites: updateTitle(prev.favorites),
        recent: updateTitle(prev.recent),
        yesterday: updateTitle(prev.yesterday),
        previousWeek: updateTitle(prev.previousWeek)
      }));
      setWorkspaceChats(prev => {
        const next = { ...prev };
        for (const wid of Object.keys(next)) {
          next[wid] = (next[wid] || []).map(c => {
            const cid = (c && (c.id != null ? c.id : c.chat_id != null ? c.chat_id : null));
            if (String(cid) === String(id)) {
              return { ...c, title: t };
            }
            return c;
          });
        }
        return next;
      });
    };
    try {
      window.addEventListener('bb:chat-deleted', onDeleted);
      window.addEventListener('bb:chat-archived', onArchived);
      window.addEventListener('bb:chat-title-updated', onTitleUpdated);
    } catch (_) {}

    return () => {
      try {
        window.removeEventListener('bb:chat-deleted', onDeleted);
        window.removeEventListener('bb:chat-archived', onArchived);
        window.removeEventListener('bb:chat-title-updated', onTitleUpdated);
      } catch (_) {}
    };
  }, []);

  useEffect(() => {
    fetchFavorites();
    fetchRecent();
    fetchYesterday();
    fetchPreviousWeek();
    fetchAdminChats();
    // Load user's workspaces
    (async () => {
      try {
        const svc = new WorkspaceService();
        const data = await svc.my();
        if (data?.success && Array.isArray(data.workspaces)) setWorkspaces(data.workspaces);
      } catch (_) {}
    })();
    // Restore workspace expanded states
    try {
      const saved = localStorage.getItem('sidebarWorkspaceExpanded');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') setWorkspaceExpanded(parsed);
      }
    } catch (_) {}
  }, []);

  // Auto-fetch threads if All Threads section is expanded on page load
  useEffect(() => {
    if (expandedSections.allThreads && allThreads.length === 0) {
      fetchAllThreads();
    }
  }, [expandedSections.allThreads, allThreads.length, fetchAllThreads]);

  // Expand section when active chat changes
  useEffect(() => {
    if (activeChatId && chatData) {
      expandSectionWithActiveChat(chatData, activeChatId);
    }
  }, [activeChatId, chatData]);

  const fetchFavorites = async () => {
    try {
      setLoading(true);
      const base = (await import('@/apiConfig.json')).default.ApiConfig.main;
      const resp = await fetch(`${base}/bb-chat/api/favorites/list`, { method: 'GET', credentials: 'include' });
      const data = await resp.json();
      if (data?.success) {
        setChatData(prev => ({ ...prev, favorites: data.chats || [] }));
      }
    } catch (_) {} finally { setLoading(false); }
  };

  const fetchRecent = async () => {
    try {
      const base = (await import('@/apiConfig.json')).default.ApiConfig.main;
      const resp = await fetch(`${base}/bb-chat/api/chat/recent`, { method: 'GET', credentials: 'include' });
      const data = await resp.json();
      if (data?.success) {
        setChatData(prev => ({ ...prev, recent: data.chats || [] }));
      }
    } catch (_) {}
  };

  const fetchYesterday = async () => {
    try {
      const base = (await import('@/apiConfig.json')).default.ApiConfig.main;
      const resp = await fetch(`${base}/bb-chat/api/chat/yesterday`, { method: 'GET', credentials: 'include' });
      const data = await resp.json();
      if (data?.success) {
        setChatData(prev => ({ ...prev, yesterday: data.chats || [] }));
      }
    } catch (_) {}
  };

  const fetchPreviousWeek = async () => {
    try {
      const base = (await import('@/apiConfig.json')).default.ApiConfig.main;
      const resp = await fetch(`${base}/bb-chat/api/chat/sevendays`, { method: 'GET', credentials: 'include' });
      const data = await resp.json();
      if (data?.success) {
        setChatData(prev => ({ ...prev, previousWeek: data.chats || [] }));
      }
    } catch (_) {}
  };

  async function fetchAllThreads() {
    try {
      setAllThreadsLoading(true);
      const apiUrl = `${process.env.NEXT_PUBLIC_BACKEND_URL || (await import('@/apiConfig.json')).default.ApiConfig.main}/bb-chat/api/chat/all?limit=20`;
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.chats) {
          // Format the chats to match our display format - limit to 20
          const formattedThreads = data.chats.slice(0, 20).map(chat => ({
            id: chat.id,
            title: (chat.title || `Chat ${chat.id}`).replace(/\.+$/, ''),
            timestamp: chat.timestamp || formatRelativeTime(chat.created_at),
            created_at: chat.created_at,
            updated_at: chat.updated_at
          }));
          
          // Preserve backend ordering; no client-side sorting
          setAllThreads(formattedThreads);
        } else {
          console.warn('⚠️ All threads API returned success: false', data);
        }
      } else {
        console.error('❌ Failed to fetch all threads:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('❌ Error fetching all threads:', error);
    } finally {
      setAllThreadsLoading(false);
    }
  }

  const fetchAdminChats = async () => {
    try {
      const apiUrl = `${process.env.NEXT_PUBLIC_BACKEND_URL || (await import('@/apiConfig.json')).default.ApiConfig.main}/bb-chat/api/chat/admin-created`;
      const response = await fetch(apiUrl, { method: 'GET', credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.chats)) {
          setAdminChats(data.chats.slice(0, 10));
          setAdminChatsTotal(parseInt(data.totalChats || 0));
        }
      }
    } catch (_) {}
  };

  // Helper function to format relative time
  const formatRelativeTime = (dateString) => {
    if (!dateString) return 'Unknown';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffMinutes < 60) {
      return diffMinutes <= 1 ? 'Just now' : `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  // Function to expand the section containing the active chat
  const expandSectionWithActiveChat = (chatData, activeChatId) => {
    // Do not auto-expand Favorites; respect user's persisted choice
    const sections = ['recent', 'yesterday', 'previousWeek'];
    
    for (const section of sections) {
      const hasActiveChat = chatData[section].some(chat => chat.id.toString() === activeChatId);
      if (hasActiveChat) {
        setExpandedSections(prev => ({
          ...prev,
          [section]: true
        }));
        break;
      }
    }
  };

  // Check if a chat is currently active
  const isChatActive = (chatId) => {
    return activeChatId && chatId.toString() === activeChatId;
  };

  const handleNavItemClick = (itemId) => {
    if (itemId === "new-chat") {
      // Navigate to new chat
      window.location.href = '/bb-client/';
    } else if (itemId === "search-chats") {
      setSearchModalOpen(true);
    } else {
      setActiveNavItem(itemId);
    }
  };

  const handleChatClick = (chat) => {
    // Navigate to chat with ID
    window.location.href = `/bb-client/${chat.id}`;
  };

  const toggleSection = (section) => {
    const wasExpanded = expandedSections[section];
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    // Fetch all threads when All Threads section is expanded for the first time
    if (section === 'allThreads' && !wasExpanded && allThreads.length === 0) {
      fetchAllThreads();
    }
    // Persist favorites state immediately when toggled
    if (section === 'favorites') {
      try { localStorage.setItem('sidebarFavoritesExpanded', JSON.stringify(!wasExpanded)); } catch (_) {}
    }
  };

  const toggleWorkspace = async (wid) => {
    const next = !workspaceExpanded[wid];
    const updated = { ...workspaceExpanded, [wid]: next };
    setWorkspaceExpanded(updated);
    try { localStorage.setItem('sidebarWorkspaceExpanded', JSON.stringify(updated)); } catch (_) {}
    if (next && !workspaceChats[wid]) {
      try {
        const svc = new WorkspaceService();
        const res = await svc.listChats(wid);
        if (res?.success) setWorkspaceChats(prev => ({ ...prev, [wid]: res.chats || [] }));
      } catch (_) {}
    }
  };

  // Auto-load chats for any workspaces that are restored as expanded on page load
  useEffect(() => {
    const loadExpanded = async () => {
      const svc = new WorkspaceService();
      for (const ws of workspaces) {
        const wid = ws.id;
        if (workspaceExpanded[wid] && !workspaceChats[wid]) {
          try {
            const res = await svc.listChats(wid);
            if (res?.success) setWorkspaceChats(prev => ({ ...prev, [wid]: res.chats || [] }));
          } catch (_) {}
        }
      }
    };
    loadExpanded();
  }, [workspaces, workspaceExpanded, workspaceChats]);


  const handleDeleteChat = async (chatId) => {
    try {
      console.log('Deleting chat:', chatId);
      
      // Call DELETE API endpoint
      const apiUrl = `${process.env.NEXT_PUBLIC_BACKEND_URL || (await import('@/apiConfig.json')).default.ApiConfig.main}/bb-chat/api/chat/${chatId}/delete`;
      const response = await fetch(apiUrl, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          console.log('✅ Chat deleted successfully');
          
          // Clear all modal states first
          setDeleteDialogOpen(false);
          setArchiveDialogOpen(false);
          setOpenDropdown(null);
          setSelectedThreadId(null);
          
          // Remove from all local state arrays
          setAllThreads(prev => prev.filter(thread => thread.id.toString() !== chatId.toString()));
          setChatData(prev => ({
            favorites: prev.favorites.filter(chat => chat.id.toString() !== chatId.toString()),
            recent: prev.recent.filter(chat => chat.id.toString() !== chatId.toString()),
            yesterday: prev.yesterday.filter(chat => chat.id.toString() !== chatId.toString()),
            previousWeek: prev.previousWeek.filter(chat => chat.id.toString() !== chatId.toString())
          }));
          setWorkspaceChats(prev => {
            const next = { ...prev };
            for (const wid of Object.keys(next)) {
              next[wid] = (next[wid] || []).filter(c => String((c?.id ?? c?.chat_id)) !== String(chatId));
            }
            return next;
          });

          // Broadcast global event for any other UI listeners
          try { window.dispatchEvent(new CustomEvent('bb:chat-deleted', { detail: { chatId } })); } catch (_) {}
          
          // If we deleted the currently active chat, navigate to main page
          if (activeChatId && activeChatId.toString() === chatId.toString()) {
            window.location.href = '/bb-client/';
          }
        } else {
          console.error('❌ Delete failed:', data.error);
          alert(`Failed to delete chat: ${data.error}`);
        }
      } else {
        console.error('❌ Delete request failed:', response.status, response.statusText);
        alert('Failed to delete chat. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
      alert('Failed to delete chat. Please try again.');
    }
  };

  const handleArchiveChat = async (chatId) => {
    try {
      console.log('Archiving chat:', chatId);
      
      // Call PATCH API endpoint
      const apiUrl = `${process.env.NEXT_PUBLIC_BACKEND_URL || (await import('@/apiConfig.json')).default.ApiConfig.main}/bb-chat/api/chat/${chatId}/delete`;
      const response = await fetch(apiUrl, {
        method: 'PATCH',
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          console.log('✅ Chat archived successfully');
          
          // Clear all modal states first
          setDeleteDialogOpen(false);
          setArchiveDialogOpen(false);
          setOpenDropdown(null);
          setSelectedThreadId(null);
          
          // Remove from all local state arrays
          setAllThreads(prev => prev.filter(thread => thread.id.toString() !== chatId.toString()));
          setChatData(prev => ({
            favorites: prev.favorites.filter(chat => chat.id.toString() !== chatId.toString()),
            recent: prev.recent.filter(chat => chat.id.toString() !== chatId.toString()),
            yesterday: prev.yesterday.filter(chat => chat.id.toString() !== chatId.toString()),
            previousWeek: prev.previousWeek.filter(chat => chat.id.toString() !== chatId.toString())
          }));
          setWorkspaceChats(prev => {
            const next = { ...prev };
            for (const wid of Object.keys(next)) {
              next[wid] = (next[wid] || []).filter(c => String((c?.id ?? c?.chat_id)) !== String(chatId));
            }
            return next;
          });

          // Broadcast global event for any other UI listeners
          try { window.dispatchEvent(new CustomEvent('bb:chat-archived', { detail: { chatId } })); } catch (_) {}
          
          // If we archived the currently active chat, navigate to main page
          if (activeChatId && activeChatId.toString() === chatId.toString()) {
            window.location.href = '/bb-client/';
          }
        } else {
          console.error('❌ Archive failed:', data.error);
          alert(`Failed to archive chat: ${data.error}`);
        }
      } else {
        console.error('❌ Archive request failed:', response.status, response.statusText);
        alert('Failed to archive chat. Please try again.');
      }
    } catch (error) {
      console.error('Error archiving chat:', error);
      alert('Failed to archive chat. Please try again.');
    }
  };

  return (
    <>
      <SearchModal 
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        onChatSelect={handleChatClick}
      />
      
      <Sidebar collapsible="icon" {...props} className="bb-fix-sidebar pt-16 dark:bg-black bg-zinc-50 dark:text-gray-300 text-zinc-800 flex flex-col">
      {/* Navigation section at the top - fixed */}
      <SidebarHeader className="space-y-4 pb-4 flex-shrink-0">
        <div className="px-2 space-y-0.5">
          {/* Top nav items from the image */}
          {navigationData.topNav.map(item => (
            <Button
              key={item.id}
              variant="ghost"
              className={`w-full flex items-center justify-start gap-3 h-auto p-1.5 cursor-pointer ${
                activeNavItem === item.id ? 'dark:bg-gray-800 bg-zinc-200' : 'hover:dark:bg-gray-800/50 hover:bg-zinc-200/50'
              }`}
              onClick={() => handleNavItemClick(item.id)}
            >
              <item.icon 
                className={`h-4 w-4 ${item.iconClass || 'dark:text-gray-300 text-zinc-800'}`} 
                strokeWidth={1.5} 
              />
              <span className="text-sm font-medium dark:text-gray-300 text-zinc-800">
                {item.title}
              </span>
            </Button>
          ))}

          {/* Settings button with dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="w-full flex items-center justify-start gap-3 h-auto p-1.5"
              >
                <Settings className="h-4 w-4 dark:text-gray-300 text-zinc-800" strokeWidth={1.5} />
                <span className="text-sm font-medium dark:text-gray-300 text-zinc-800">
                  Settings
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuItem 
                onClick={() => {
                  setActiveNavItem('settings');
                  console.log('Opening settings...');
                }}
                className="flex items-center gap-2"
              >
                <Settings className="h-4 w-4" />
                Settings
              </DropdownMenuItem>
              
              {activeChatId && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <div role="menuitem" className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400 cursor-pointer px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground">
                      <Archive className="h-4 w-4" />
                      Archive
                    </div>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Archive Chat</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to archive this chat session? You can restore it later from Archived Chats.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60"
                        onClick={() => handleArchiveChat(activeChatId)}
                      >
                        Yes, Archive
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              
              {activeChatId && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <div role="menuitem" className="flex items-center gap-2 text-red-600 dark:text-red-400 cursor-pointer px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground">
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </div>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Chat</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete this chat session? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-red-600 hover:bg-red-700"
                        onClick={() => handleDeleteChat(activeChatId)}
                      >
                        Yes, Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </SidebarHeader>
        
      {/* Scrollable chat history section */}
      <SidebarContent className="px-2 flex-grow overflow-hidden">
        <ScrollArea className="h-full pr-2">
          {/* Workspaces section */}
          {workspaces.length > 0 && (
            <div className="mb-4">
              <div className="px-4 py-1 text-sm font-medium text-gray-500">Workspaces</div>
              <div className="space-y-1 mt-1">
                {workspaces.map(ws => (
                  <div key={`ws-${ws.id}`} className="rounded-md mx-2">
                    <button className="w-full flex items-center justify-between px-2 py-2 rounded hover:bg-zinc-200/50 dark:hover:bg-gray-800/50 cursor-pointer"
                      onClick={() => toggleWorkspace(ws.id)}>
                      <span className="text-sm truncate mr-2">{ws.name}</span>
                      {workspaceExpanded[ws.id] ? <ChevronDown className="h-4 w-4 text-gray-500" /> : <ChevronRight className="h-4 w-4 text-gray-500" />}
                    </button>
                    {workspaceExpanded[ws.id] && (
                      <div className="ml-3 pl-2 border-l border-gray-200 dark:border-gray-700 space-y-1">
                        {(workspaceChats[ws.id] || []).map((c, idx) => {
                          const chatId = (c && (c.id != null ? c.id : c.chat_id != null ? c.chat_id : null));
                          const keyId = chatId != null ? chatId : `tmp-${idx}`;
                          return (
                          <div 
                            key={`wsc-${ws.id}-${keyId}`} 
                            className={`flex items-center justify-between rounded-md mx-2 mb-1 w-full ${isChatActive(chatId) ? 'dark:bg-gray-800/60 bg-zinc-200/60 border-l-2 border-zinc-400 dark:border-gray-600' : ''}`}
                            onMouseEnter={() => { if (chatId != null) setHoveredThread(`ws:${ws.id}:${chatId}`); }}
                            onMouseLeave={() => setHoveredThread(null)}
                          > 
                            <div className="flex-1 relative overflow-hidden mx-1 cursor-pointer transition-colors dark:hover:bg-gray-800/50 hover:bg-zinc-200/70 min-w-0 cursor-pointer"
                              onClick={() => { if (chatId != null) handleChatClick({ id: chatId }); }}>
                              <div className="flex items-center px-1 py-1 min-w-0">
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-medium text-xs truncate dark:text-gray-200 text-zinc-800">{c.title || `Chat ${chatId ?? ''}`}</h4>
                                </div>
                              </div>
                            </div>
                            {chatId != null && (
                              <div className="flex-shrink-0 flex items-center justify-end w-6 mr-2">
                                <DropdownMenu 
                                  open={openDropdown === `ws:${ws.id}:${chatId}`} 
                                  onOpenChange={(open) => setOpenDropdown(open ? `ws:${ws.id}:${chatId}` : null)}
                                >
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className={`h-6 w-6 p-0 transition-opacity relative z-20 hover:bg-transparent border-none bg-transparent cursor-pointer ${
                                        hoveredThread === `ws:${ws.id}:${chatId}` ? 'opacity-100' : 'opacity-0'
                                      }`}
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <MoreHorizontal className="h-4 w-4 text-gray-400 hover:text-white" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-48 z-50">
                                    <DropdownMenuItem 
                                      onClick={() => {
                                        setSelectedThreadId(chatId);
                                        setOpenDropdown(null);
                                        setArchiveDialogOpen(true);
                                      }}
                                      className="flex items-center gap-2"
                                    >
                                      <Archive className="h-4 w-4" />
                                      Archive
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      onClick={() => {
                                        setSelectedThreadId(chatId);
                                        setOpenDropdown(null);
                                        setDeleteDialogOpen(true);
                                      }}
                                      className="flex items-center gap-2 text-red-600 dark:text-red-400"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            )}
                          </div>
                          );
                        })}
                        <div className="mx-2">
                          <Button variant="ghost" size="sm" className="h-7 text-xs w-full" onClick={async () => {
                            try {
                              const svc = new WorkspaceService();
                              const res = await svc.createWorkspaceChat(ws.id, 'thread');
                              if (res?.success && res.chat?.id) {
                                // Refresh chats under this workspace and navigate to the new chat
                                const list = await svc.listChats(ws.id);
                                if (list?.success) setWorkspaceChats(prev => ({ ...prev, [ws.id]: list.chats || [] }));
                                window.location.href = `/bb-client/${res.chat.id}`;
                              }
                            } catch (_) {}
                          }}>+ New chat</Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Admin-created chats list (simple) */}
          {adminChats.length > 0 && (
            <div className="mb-2">
              {adminChats.map(chat => {
                const colors = ['bg-zinc-500','bg-emerald-500','bg-amber-500','bg-purple-500','bg-rose-500'];
                const dot = colors[Number(chat.id) % colors.length];
                return (
                  <div key={`admin-${chat.id}`} className="flex items-center justify-between rounded-md mx-2 mb-1 px-3 py-2 cursor-pointer dark:hover:bg-gray-800/50 hover:bg-zinc-200/50" onClick={() => handleChatClick(chat)}>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-medium text-zinc-900 dark:text-gray-200 truncate max-w-[170px]">{(chat.title || '').replace(/\.+$/, '')}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-zinc-100 text-zinc-700 dark:bg-gray-800/60 dark:text-gray-300 shrink-0">{chat.timestamp || formatRelativeTime(chat.updated_at)}</span>
                    </div>
                    <span className={`h-2.5 w-2.5 rounded-full ${dot}`}></span>
                  </div>
                );
              })}
              {adminChatsTotal > 10 && (
                <div className="mx-2 mt-1">
                  <Button variant="ghost" className="w-full h-7 text-xs" onClick={() => setAdminModalOpen(true)}>View more</Button>
                </div>
              )}
            </div>
          )}
          {/* Favorites section */}
          {chatData.favorites.length > 0 && (
            <div className="mb-4">
              <Button
                variant="ghost"
                className="w-full flex items-center justify-between px-4 py-1 h-auto text-left cursor-pointer"
                onClick={() => toggleSection('favorites')}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-500">Favorites</span>
                </div>
                {expandedSections.favorites ? 
                  <ChevronDown className="h-4 w-4 text-gray-400" /> : 
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                }
              </Button>
              
              {expandedSections.favorites && (
                <div className="space-y-1 mt-1">
                  {chatData.favorites.map(chat => (
                    <div key={chat.id} className="flex items-center justify-between rounded-md mx-2 mb-2 w-full">
                      <div 
                        className="flex-1 relative overflow-hidden mx-2 cursor-pointer transition-colors dark:hover:bg-gray-800/50 hover:bg-zinc-200/70 min-w-0"
                        onClick={() => handleChatClick(chat)}
                      >
                        <div className="flex items-center px-1 py-2 min-w-0">
                          <div className="flex-1 min-w-0 relative">
                            <h4 className={`font-medium text-sm whitespace-nowrap dark:text-gray-200 text-zinc-800`}
                              style={{ textOverflow: 'ellipsis', overflow: 'hidden' }}
                            >
                              {(chat.title || '').replace(/\.+$/, '')}
                            </h4>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* Recent chats */}
          {chatData.recent.length > 0 && (
            <div className="mb-4">
              <Button
                variant="ghost"
                className="w-full flex items-center justify-between px-4 py-1 h-auto text-left cursor-pointer"
                onClick={() => toggleSection('recent')}
              >
                <span className="text-sm font-medium text-gray-500">Recent</span>
                {expandedSections.recent ? 
                  <ChevronDown className="h-4 w-4 text-gray-500" /> : 
                  <ChevronRight className="h-4 w-4 text-gray-500" />
                }
              </Button>
              
              {expandedSections.recent && (
                <div className="space-y-1 mt-1">
                  {chatData.recent.map(chat => (
                    <div 
                      key={chat.id}
                      className={`rounded-md overflow-hidden mx-2 mb-2 cursor-pointer transition-colors ${
                        isChatActive(chat.id) 
                          ? 'dark:bg-gray-800/60 bg-zinc-200/60 border-l-2 border-zinc-400 dark:border-gray-600' 
                          : 'dark:hover:bg-gray-800/50 hover:bg-zinc-200/70'
                      }`}
                      onClick={() => handleChatClick(chat)}
                    >
                      <div className="p-3">
                        <div className="flex justify-between items-start mb-1">
                          <h4 className={`font-medium text-sm ${
                            isChatActive(chat.id) 
                              ? 'dark:text-gray-200 text-zinc-900' 
                              : 'dark:text-gray-200 text-zinc-800'
                          }`}>
                            {(chat.title || '').replace(/\.+$/, '')}
                          </h4>
                          <span className="text-xs text-gray-500">
                            {chat.timestamp}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 line-clamp-2">
                          {chat.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* Yesterday's chats */}
          {chatData.yesterday.length > 0 && (
            <div className="mb-4">
              <Button
                variant="ghost"
                className="w-full flex items-center justify-between px-4 py-1 h-auto text-left cursor-pointer"
                onClick={() => toggleSection('yesterday')}
              >
                <span className="text-sm font-medium text-gray-500">Yesterday</span>
                {expandedSections.yesterday ? 
                  <ChevronDown className="h-4 w-4 text-gray-500" /> : 
                  <ChevronRight className="h-4 w-4 text-gray-500" />
                }
              </Button>
              
              {expandedSections.yesterday && (
                <div className="space-y-1 mt-1">
                  {chatData.yesterday.map(chat => (
                    <div 
                      key={chat.id}
                      className={`rounded-md overflow-hidden mx-2 mb-2 cursor-pointer transition-colors ${
                        isChatActive(chat.id) 
                          ? 'dark:bg-gray-800/60 bg-zinc-200/60 border-l-2 border-zinc-400 dark:border-gray-600' 
                          : 'dark:hover:bg-gray-800/50 hover:bg-zinc-200/70'
                      }`}
                      onClick={() => handleChatClick(chat)}
                    >
                      <div className="p-3">
                        <div className="flex justify-between items-start mb-1">
                          <h4 className={`font-medium text-sm ${
                            isChatActive(chat.id) 
                              ? 'dark:text-gray-200 text-zinc-900' 
                              : 'dark:text-gray-200 text-zinc-800'
                          }`}>
                            {(chat.title || '').replace(/\.+$/, '')}
                          </h4>
                          <span className="text-xs text-gray-500">
                            {chat.timestamp}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 line-clamp-2">
                          {chat.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* Previous week chats */}
          {chatData.previousWeek.length > 0 && (
            <div className="mb-4">
              <Button
                variant="ghost"
                className="w-full flex items-center justify-between px-4 py-1 h-auto text-left cursor-pointer"
                onClick={() => toggleSection('previousWeek')}
              >
                <span className="text-sm font-medium text-gray-500">Previous 7 Days</span>
                {expandedSections.previousWeek ? 
                  <ChevronDown className="h-4 w-4 text-gray-500" /> : 
                  <ChevronRight className="h-4 w-4 text-gray-500" />
                }
              </Button>
              
              {expandedSections.previousWeek && (
                <div className="space-y-1 mt-1">
                  {chatData.previousWeek.map(chat => (
                    <div 
                      key={chat.id}
                      className={`rounded-md overflow-hidden mx-2 mb-2 cursor-pointer transition-colors ${
                        isChatActive(chat.id) 
                          ? 'dark:bg-gray-800/60 bg-zinc-200/60 border-l-2 border-zinc-400 dark:border-gray-600' 
                          : 'dark:hover:bg-gray-800/50 hover:bg-zinc-200/70'
                      }`}
                      onClick={() => handleChatClick(chat)}
                    >
                      <div className="p-3">
                        <div className="flex justify-between items-start mb-1">
                          <h4 className={`font-medium text-sm mr-2 ${
                            isChatActive(chat.id) 
                              ? 'dark:text-gray-200 text-zinc-900' 
                              : 'dark:text-gray-200 text-zinc-800'
                          }`}>
                            {(chat.title || '').replace(/\.+$/, '')}
                          </h4>
                          <span className="text-xs text-gray-500 shrink-0">
                            {chat.timestamp}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 line-clamp-2">
                          {chat.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* All Threads collapsible section */}
          <div className="mb-4">
            <Button
              variant="ghost"
              className="w-full flex items-center justify-between px-4 py-1 h-auto text-left"
              onClick={() => toggleSection('allThreads')}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-500">All Threads</span>
              </div>
              {expandedSections.allThreads ? 
                <ChevronDown className="h-4 w-4 text-gray-500" /> : 
                <ChevronRight className="h-4 w-4 text-gray-500" />
              }
            </Button>
            
            {/* All Threads content */}
            {expandedSections.allThreads && (
              <div className="space-y-1 mt-1">
                {allThreadsLoading ? (
                  <div className="mx-2 p-3 text-center">
                    <span className="text-xs text-gray-500">Loading threads...</span>
                  </div>
                ) : allThreads.length > 0 ? (
                  allThreads.map(thread => (
                    <div 
                      key={thread.id}
                      className="flex items-center justify-between rounded-md mx-2 mb-2 w-full"
                      style={isChatActive(thread.id) ? { backgroundColor: 'rgba(57, 58, 59, 0.5)' } : {}}
                      onMouseEnter={() => setHoveredThread(`all:${thread.id}`)}
                      onMouseLeave={() => setHoveredThread(null)}
                    >
                      <div 
                        className="flex-1 relative overflow-hidden mx-2 cursor-pointer transition-colors dark:hover:bg-gray-800/50 hover:bg-zinc-200/70 min-w-0"
                        onClick={() => handleChatClick(thread)}
                      >
                        <div className="flex items-center px-1 py-2 min-w-0">
                          <div className="flex-1 min-w-0 relative">
                            <h4 className={`font-medium text-sm whitespace-nowrap transition-transform duration-[5000ms] ease-linear ${
                              isChatActive(thread.id) 
                                ? 'dark:text-gray-200 text-gray-200' 
                                : 'dark:text-gray-200 text-zinc-800'
                            }`}
                            style={{ 
                              textOverflow: 'clip',
                              overflow: 'visible'
                            }}
                            onMouseEnter={(e) => {
                              const element = e.currentTarget;
                              const container = element.parentElement;
                              const containerWidth = container.offsetWidth;
                              const textWidth = element.scrollWidth;
                              if (textWidth > containerWidth) {
                                element.style.zIndex = '5';
                                element.style.position = 'relative';
                                element.style.backgroundColor = isChatActive(thread.id) ? 'rgba(57, 58, 59, 0.5)' : '#1f2937';
                                const translateX = -(textWidth - containerWidth + 20);
                                element.style.transform = `translateX(${translateX}px)`;
                              }
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'translateX(0px)';
                              e.currentTarget.style.zIndex = '';
                              e.currentTarget.style.position = '';
                              e.currentTarget.style.backgroundColor = '';
                            }}>
                              {(thread.title || '').replace(/\.+$/, '')}
                            </h4>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex-shrink-0 flex items-center justify-end w-6 mr-2">
                        <DropdownMenu 
                          open={openDropdown === `all:${thread.id}`} 
                          onOpenChange={(open) => setOpenDropdown(open ? `all:${thread.id}` : null)}
                        >
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`h-6 w-6 p-0 transition-opacity relative z-20 hover:bg-transparent border-none bg-transparent ${
                                hoveredThread === `all:${thread.id}` ? 'opacity-100' : 'opacity-0'
                              }`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="h-4 w-4 text-gray-400 hover:text-white" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 z-50">
                            <DropdownMenuItem 
                              onClick={() => {
                                setSelectedThreadId(thread.id);
                                setOpenDropdown(null);
                                setArchiveDialogOpen(true);
                              }}
                              className="flex items-center gap-2"
                            >
                              <Archive className="h-4 w-4" />
                              Archive
                            </DropdownMenuItem>
                            
                            <DropdownMenuItem 
                              onClick={() => {
                                setSelectedThreadId(thread.id);
                                setOpenDropdown(null);
                                setDeleteDialogOpen(true);
                              }}
                              className="flex items-center gap-2 text-red-600 dark:text-red-400"
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="mx-2 p-3 text-center">
                    <span className="text-xs text-gray-500">No threads found</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </SidebarContent>
    </Sidebar>
    
    {/* Global AlertDialogs outside of scroll containers */}
    {/* Admin Chats modal with search + list */}
    {adminModalOpen && (
      <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm">
        <div className="relative mt-16 w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col max-h-[440px] min-h-[440px] md:max-w-[680px] md:min-w-[680px]" tabIndex="-1">
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 min-h-[64px] max-h-[64px]">
            <div className="flex items-center gap-3 flex-1">
              <Search className="h-5 w-5 text-gray-400" />
              <input placeholder="Search chats..." className="flex-1 bg-transparent border-none outline-none text-gray-900 dark:text-gray-100 placeholder-gray-500 text-sm" type="text" onChange={() => {}} />
            </div>
            <button className="ml-4 p-1 h-8 w-8 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => setAdminModalOpen(false)}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x h-4 w-4 text-gray-500"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto my-2">
            <div className="mx-2">
              {adminChats.map(chat => (
                <div key={`adm-dd-${chat.id}`} className="cursor-pointer" onClick={() => { setAdminModalOpen(false); handleChatClick(chat); }}>
                  <div className="group relative flex items-center rounded-xl px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <Star className="h-5 w-5 text-yellow-500" />
                    <div className="relative grow overflow-hidden whitespace-nowrap pl-2">
                      <div className="text-sm text-gray-900 dark:text-gray-100">{(chat.title || '').replace(/\.+$/, '')}</div>
                    </div>
                  </div>
                </div>
              ))}
              {adminChatsTotal > adminChats.length && (
                <div className="px-4 py-2 text-xs text-gray-500">Showing {adminChats.length} of {adminChatsTotal}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    )}
    <AlertDialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Archive Chat</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to archive this chat session? You can restore it later from Archived Chats.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => {
            setArchiveDialogOpen(false);
            setSelectedThreadId(null);
          }}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            className="bg-yellow-600 hover:bg-yellow-700"
            onClick={() => {
              if (selectedThreadId) {
                handleArchiveChat(selectedThreadId);
              }
            }}
          >
            Yes, Archive
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    
    <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Chat</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this chat session? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => {
            setDeleteDialogOpen(false);
            setSelectedThreadId(null);
          }}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60"
            onClick={() => {
              if (selectedThreadId) {
                handleDeleteChat(selectedThreadId);
              }
            }}
          >
            Yes, Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
