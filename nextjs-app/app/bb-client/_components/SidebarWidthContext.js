'use client';

import { createContext, useContext, useState, useEffect } from 'react';

const SidebarWidthContext = createContext({
  sidebarWidth: 256,
  setSidebarWidth: () => {},
  isCollapsed: false,
  setIsCollapsed: () => {},
});

export function SidebarWidthProvider({ children }) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    if (typeof window === 'undefined') return 256;
    try {
      const saved = localStorage.getItem('chatSidebarWidth');
      return saved ? parseInt(saved, 10) : 256;
    } catch {
      return 256;
    }
  });

  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      const saved = localStorage.getItem('chatSidebarCollapsed');
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  return (
    <SidebarWidthContext.Provider value={{ sidebarWidth, setSidebarWidth, isCollapsed, setIsCollapsed }}>
      {children}
    </SidebarWidthContext.Provider>
  );
}

export function useSidebarWidth() {
  return useContext(SidebarWidthContext);
}
