'use client';

import { useState, useEffect } from 'react';
import { ModernChatInterface } from './_components/modern-chat-interface';

export default function ClientPage() {
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);

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

  return (
    <div className="flex h-full w-full bg-background overflow-hidden">
      <div className="flex-1 flex flex-col h-full relative">
        <ModernChatInterface />
      </div>
    </div>
  );
}
