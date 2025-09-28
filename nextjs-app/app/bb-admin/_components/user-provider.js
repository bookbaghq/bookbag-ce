'use client';

import { createContext, useContext, useState } from 'react';

// Create a context for user data
export const UserContext = createContext(null);

// Custom hook to use the user context
export const useUser = () => {
  const context = useContext(UserContext);
  if (context === null) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

// Provider component to wrap the application
export const UserProvider = ({ children, initialUserState }) => {
  const [currentUserState, setCurrentUserState] = useState(initialUserState);

  return (
    <UserContext.Provider value={{ currentUserState, setCurrentUserState }}>
      {children}
    </UserContext.Provider>
  );
};
