'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar, { SidebarConversation } from '@/app/components/Sidebar';
import Header, { GptModelOption, gptModels } from '@/app/components/Header';
import SearchModal from '@/app/components/SearchModal';
import AddPersonModal from '@/app/components/AddPersonModal';
import { SignedIn } from '@clerk/nextjs';
import { ChatProvider } from '@/app/components/ChatContext';

interface ChatShellProps {
  children: React.ReactNode;
}

export default function ChatShell({ children }: ChatShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [conversations, setConversations] = useState<SidebarConversation[]>([]);
  const [selectedModel, setSelectedModel] = useState<GptModelOption>(gptModels[0]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAddPersonOpen, setIsAddPersonOpen] = useState(false);

  const activeConversationId =
    pathname && pathname.startsWith('/chat/') ? pathname.replace('/chat/', '') : null;

  useEffect(() => {
    const handleResize = () => {
      setSidebarOpen(window.innerWidth >= 1024);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchConversations = useCallback(async () => {
    try {
      const response = await fetch('/api/conversations', { credentials: 'include' });
      if (!response.ok) throw new Error('Error al cargar las conversaciones');
      const data: SidebarConversation[] = await response.json();
      setConversations(data);
    } catch (error) {
      console.error('Error cargando conversaciones:', error);
    }
  }, []);

  useEffect(() => {
    void fetchConversations();
  }, [fetchConversations]);

  const handleNewChat = () => {
    router.push('/');
  };

  const handleSelectConversation = (conversationId: string) => {
    router.push(`/chat/${conversationId}`);
  };

  return (
    <ChatProvider
      value={{
        selectedModel,
        setSelectedModel,
        fetchConversations,
        conversations,
      }}
    >
      <div className="flex h-screen overflow-hidden">
        <SignedIn>
          <Sidebar
            isOpen={sidebarOpen}
            onToggle={() => setSidebarOpen((prev) => !prev)}
            onNewChat={handleNewChat}
            onSelectConversation={handleSelectConversation}
            activeConversationId={activeConversationId}
            conversations={conversations}
            onSearch={() => setIsSearchOpen(true)}
            onRefreshConversations={fetchConversations}
          />
        </SignedIn>

        <main className="flex-1 flex flex-col bg-[var(--main-bg)] relative overflow-hidden w-full">
          <Header
            onMenuClick={() => setSidebarOpen((prev) => !prev)}
            onAddPerson={() => setIsAddPersonOpen(true)}
            selectedModel={selectedModel}
            onModelChange={(model) => setSelectedModel(model)}
          />

          {children}

          <SearchModal
            isOpen={isSearchOpen}
            onClose={() => setIsSearchOpen(false)}
            conversations={conversations}
            onSelectConversation={handleSelectConversation}
            onNewChat={handleNewChat}
          />

          <AddPersonModal
            isOpen={isAddPersonOpen}
            onClose={() => setIsAddPersonOpen(false)}
            conversationId={activeConversationId}
          />
          <div className="h-4 sm:h-6" />
        </main>
      </div>
    </ChatProvider>
  );
}
