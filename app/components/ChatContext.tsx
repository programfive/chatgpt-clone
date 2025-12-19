'use client';

import { createContext, useContext, ReactNode } from 'react';
import { GptModelOption } from './Header';
import { SidebarConversation } from './Sidebar';

interface ChatContextType {
  selectedModel: GptModelOption;
  setSelectedModel: (model: GptModelOption) => void;
  fetchConversations: () => Promise<void>;
  conversations: SidebarConversation[];
}

const ChatContext = createContext<ChatContextType | null>(null);

export function ChatProvider({ 
  children, 
  value 
}: { 
  children: ReactNode; 
  value: ChatContextType;
}) {
  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChatContext() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
}
