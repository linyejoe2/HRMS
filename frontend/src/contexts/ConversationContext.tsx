import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Conversation } from '../types';

interface ConversationContextType {
  currentConversation: Conversation | null;
  setCurrentConversation: (conversation: Conversation | null) => void;
}

const ConversationContext = createContext<ConversationContextType | undefined>(undefined);

export const useConversation = () => {
  const context = useContext(ConversationContext);
  if (context === undefined) {
    throw new Error('useConversation must be used within a ConversationProvider');
  }
  return context;
};

interface ConversationProviderProps {
  children: ReactNode;
}

export const ConversationProvider: React.FC<ConversationProviderProps> = ({ children }) => {
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);

  return (
    <ConversationContext.Provider value={{
      currentConversation,
      setCurrentConversation,
    }}>
      {children}
    </ConversationContext.Provider>
  );
};