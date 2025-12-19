'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar, { SidebarConversation } from './Sidebar';
import Header, { GptModelOption, gptModels } from './Header';
import ChatInput, { ChatMode } from './ChatInput';
import ChatMessages, { Message, Upload } from './ChatMessages';
import NotificationBanner from './NotificationBanner';
import SearchModal from './SearchModal';
import AddPersonModal from './AddPersonModal';
import { SignedIn } from '@clerk/nextjs';

interface ChatWorkspaceProps {
  initialConversationId?: string | null;
}

export default function ChatWorkspace({ initialConversationId }: ChatWorkspaceProps) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingConversation, setIsLoadingConversation] = useState(!!initialConversationId);
  const [conversations, setConversations] = useState<SidebarConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(initialConversationId ?? null);
  const [selectedModel, setSelectedModel] = useState<GptModelOption>(gptModels[0]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAddPersonOpen, setIsAddPersonOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

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

  const loadConversationMessages = useCallback(
    async (conversationId: string) => {
      setIsLoadingConversation(true);
      try {
        const encodedId = encodeURIComponent(conversationId);
        const response = await fetch(`/api/conversations/${encodedId}`, {
          cache: 'no-store',
          credentials: 'include',
        });
        if (!response.ok) {
          const errorBody = await response.text();
          console.error('Fallo al cargar conversación:', response.status, errorBody);
          throw new Error('Error al cargar el chat seleccionado');
        }
        const payload: { messages: Message[] } = await response.json();
        setMessages(payload.messages);
      } catch (error) {
        console.error('Error cargando conversación:', error);
      } finally {
        setIsLoadingConversation(false);
      }
    },
    []
  );

  useEffect(() => {
    if (initialConversationId) {
      setActiveConversationId(initialConversationId);
      void loadConversationMessages(initialConversationId);
    }
  }, [initialConversationId, loadConversationMessages]);

  const handleNewChat = () => {
    setActiveConversationId(null);
    setMessages([]);
    router.push('/');
  };

  const handleSelectConversation = async (conversationId: string) => {
    setActiveConversationId(conversationId);
    setMessages([]);
    router.push(`/chat/${conversationId}`);
    await loadConversationMessages(conversationId);
  };

  const handleSendMessage = async (
    content: string,
    conversationId?: string | null,
    mode?: ChatMode,
    uploadIds?: string[]
  ) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      uploads: [],
    };

    const outgoingMessages = [...messages, userMessage];
    setMessages(outgoingMessages);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: conversationId ?? null,
          newMessage: content,
          messages: outgoingMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          model: selectedModel.value,
          mode: mode || 'normal',
          uploadIds: uploadIds || [],
        }),
      });

      if (!response.ok) throw new Error('Error en la respuesta');

      const decoder = new TextDecoder();
      const reader = response.body?.getReader();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMessage.id
                ? { ...m, content: m.content + chunk }
                : m
            )
          );
        }
      }

      const conversationFromHeader = response.headers.get('x-conversation-id');
      if (conversationFromHeader) {
        setActiveConversationId(conversationFromHeader);
        await loadConversationMessages(conversationFromHeader);
        router.replace(`/chat/${conversationFromHeader}`);
      }
    } catch (error) {
      console.error('Error:', error);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content:
            'Lo siento, hubo un error al procesar tu mensaje. Por favor, intenta de nuevo.',
        },
      ]);
    } finally {
      setIsLoading(false);
      void fetchConversations();
    }
  };

  return (
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

        {isLoadingConversation ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-[#8e8ea0] border-t-transparent rounded-full animate-spin"></div>
              <span className="text-[#8e8ea0] text-sm">Cargando conversación...</span>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-8 px-4">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-normal text-[#f3f3f3] text-center">
              ¿Qué toca hoy?
            </h1>
            <div className="w-full max-w-3xl">
              <ChatInput
                conversationId={activeConversationId}
                onSendMessage={handleSendMessage}
                isLoading={isLoading}
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto">
              <ChatMessages messages={messages} isLoading={isLoading} />
              <div ref={messagesEndRef} />
            </div>
            <div className="border-t border-[#2f2f2f] p-4">
              <div className="max-w-3xl mx-auto">
                <ChatInput
                  conversationId={activeConversationId}
                  onSendMessage={handleSendMessage}
                  isLoading={isLoading}
                />
              </div>
            </div>
          </div>
        )}

        {messages.length === 0 && !isLoadingConversation && <NotificationBanner />}

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
        <div className="h-4 sm:h-6"></div>
      </main>
    </div>
  );
}
