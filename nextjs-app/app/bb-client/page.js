'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ModernChatInterface } from './_components/modern-chat-interface';
import { KnowledgeBaseSidebar } from '@/plugins/rag-plugin/nextjs/pages/client/KnowledgeBaseSidebar';
import api from '@/apiConfig.json';

const BASE_URL = api.ApiConfig.main;

export default function ClientPage() {
  const router = useRouter();
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);

  // Check if client-side access is disabled
  useEffect(() => {
    const checkClientAccess = async () => {
      try {
        const response = await fetch(`${BASE_URL}/api/admin/settings`, {
          credentials: 'include'
        });
        const data = await response.json();

        if (data.success && data.settings.disable_client_side) {
          // Client-side is disabled - check if user is admin
          const userRes = await fetch(`${BASE_URL}/bb-user/api/auth/currentuser`, {
            credentials: 'include'
          });
          const userData = await userRes.json();

          if (userData?.isAdmin === true) {
            // User is admin - redirect to admin panel
            router.push('/bb-admin');
          } else {
            // User is not admin - logout and redirect to access denied
            await fetch(`${BASE_URL}/bb-user/api/auth/logout`, {
              credentials: 'include'
            });
            router.push('/bb-auth/access-denied');
          }
          return;
        }
      } catch (error) {
        console.error('Error checking client access:', error);
      } finally {
        setIsCheckingAccess(false);
      }
    };

    checkClientAccess();
  }, [router]);

  // Handle room selection from sidebar
  useEffect(() => {
    // Listen for room selection events from the sidebar
    const handleRoomSelected = (event) => {
      if (event.detail && event.detail.room) {
        const room = event.detail.room;
        setSelectedRoom(room);

        // Set chat messages from the room if available
        if (room.messages && Array.isArray(room.messages)) {
          setChatMessages(room.messages);
        } else {
          setChatMessages([]);
        }
      }
    };

    // Add event listener for custom event dispatched from sidebar
    window.addEventListener('roomSelected', handleRoomSelected);

    // Default room on initial load (will be replaced by actual selection
    const defaultRoom = {
      id: "1",
      name: "Open first room from sidebar",
      unread: 0 // dont know what this does
    };


      // TODO: click on the first item on the sidebar list when its ready
    // Simulate a room selection event to get default room data
    const simulatedEvent = new CustomEvent('roomSelected', {
      detail: {
        room: defaultRoom
      }
    });

    window.dispatchEvent(simulatedEvent);

    return () => {
      window.removeEventListener('roomSelected', handleRoomSelected);
    };
  }, []);

  // Save new messages to the current room
  const handleNewMessage = (message) => {
    console.log("save new messages", message)
    setChatMessages(prevMessages => [...prevMessages, message]);
  };

  // Show loading while checking access
  if (isCheckingAccess) {
    return null;
  }

  return (
    <div className="flex h-full w-full bg-background overflow-hidden">
      <KnowledgeBaseSidebar
        chatId={null}
      />
      <div className="flex-1 flex flex-col h-full relative">
        <ModernChatInterface />
      </div>
    </div>
  );
}
