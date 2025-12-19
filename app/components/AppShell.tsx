'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';

import Sidebar, { SidebarConversation } from '@/app/components/Sidebar';
import Header, { type GptModelOption, gptModels } from '@/app/components/Header';
import SearchModal from '@/app/components/SearchModal';
import AddPersonModal from '@/app/components/AddPersonModal';
import GroupPeopleModal from '@/app/components/GroupPeopleModal';
import RenameGroupModal from '@/app/components/RenameGroupModal';
import DeleteGroupConfirmModal from '@/app/components/DeleteGroupConfirmModal';
import { ChatProvider } from '@/app/components/ChatContext';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isChatShellRoute = pathname === '/' || pathname.startsWith('/chat');

  if (!isChatShellRoute) return <>{children}</>;

  return <ChatShell pathname={pathname}>{children}</ChatShell>;
}

function ChatShell({
  children,
  pathname,
}: {
  children: React.ReactNode;
  pathname: string;
}) {
  const router = useRouter();
  const { isSignedIn } = useUser();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [conversations, setConversations] = useState<SidebarConversation[]>([]);
  const [selectedModel, setSelectedModel] = useState<GptModelOption>(gptModels[0]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAddPersonOpen, setIsAddPersonOpen] = useState(false);
  const [addPersonInitialStep, setAddPersonInitialStep] = useState<'initial' | 'link'>('initial');
  const [addPersonInitialToken, setAddPersonInitialToken] = useState<string | null>(null);
  const [isGroupPeopleOpen, setIsGroupPeopleOpen] = useState(false);
  const [isRenameGroupOpen, setIsRenameGroupOpen] = useState(false);
  const [isDeleteGroupOpen, setIsDeleteGroupOpen] = useState(false);
  const [isDeletingGroup, setIsDeletingGroup] = useState(false);

  const activeConversationId = pathname.startsWith('/chat/') ? pathname.replace('/chat/', '') : null;

  const activeConversation = activeConversationId
    ? conversations.find((c) => c.id === activeConversationId) ?? null
    : null;

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
    if (!isSignedIn) return;
    void fetchConversations();
  }, [fetchConversations, isSignedIn]);

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
        {isSignedIn ? (
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
        ) : null}

        <main className="flex-1 flex flex-col bg-[var(--main-bg)] relative overflow-hidden w-full pb-[env(safe-area-inset-bottom)]">
          <Suspense fallback={null}>
            <Header
              onMenuClick={() => setSidebarOpen((prev) => !prev)}
              onAddPerson={() => {
                setAddPersonInitialStep('initial');
                setAddPersonInitialToken(null);
                setIsAddPersonOpen(true);
              }}
              activeConversation={activeConversation}
              onOpenGroupPeople={() => setIsGroupPeopleOpen(true)}
              onOpenGroupLink={() => {
                setAddPersonInitialStep('link');
                setAddPersonInitialToken(activeConversation?.sharedLinkToken ?? null);
                setIsAddPersonOpen(true);
              }}
              onOpenGroupRename={() => setIsRenameGroupOpen(true)}
              onOpenGroupDelete={() => setIsDeleteGroupOpen(true)}
              selectedModel={selectedModel}
              onModelChange={(model) => setSelectedModel(model)}
            />
          </Suspense>

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
            onClose={() => {
              setIsAddPersonOpen(false);
              setAddPersonInitialStep('initial');
              setAddPersonInitialToken(null);
            }}
            conversationId={activeConversationId}
            initialStep={addPersonInitialStep}
            initialSharedLinkToken={addPersonInitialToken}
          />

          <GroupPeopleModal
            isOpen={isGroupPeopleOpen}
            onClose={() => setIsGroupPeopleOpen(false)}
            conversationId={activeConversationId}
            onAddPeople={() => {
              setAddPersonInitialStep('link');
              setAddPersonInitialToken(activeConversation?.sharedLinkToken ?? null);
              setIsAddPersonOpen(true);
            }}
          />

          <RenameGroupModal
            isOpen={isRenameGroupOpen}
            onClose={() => setIsRenameGroupOpen(false)}
            conversationId={activeConversationId}
            currentTitle={activeConversation?.title ?? null}
            onRenamed={() => {
              void fetchConversations();
            }}
          />

          <DeleteGroupConfirmModal
            isOpen={isDeleteGroupOpen}
            onClose={() => {
              if (!isDeletingGroup) setIsDeleteGroupOpen(false);
            }}
            isLoading={isDeletingGroup}
            groupTitle={activeConversation?.title ?? null}
            onConfirm={() => {
              if (!activeConversationId) return;
              void (async () => {
                setIsDeletingGroup(true);
                try {
                  const response = await fetch(
                    `/api/conversations/${encodeURIComponent(activeConversationId)}`,
                    {
                      method: 'DELETE',
                      credentials: 'include',
                    }
                  );

                  if (!response.ok) {
                    const body = await response.text().catch(() => '');
                    throw new Error(body || 'Error al eliminar grupo');
                  }

                  setIsDeleteGroupOpen(false);
                  await fetchConversations();
                  router.push('/');
                } catch (error) {
                  console.error('Delete group failed:', error);
                } finally {
                  setIsDeletingGroup(false);
                }
              })();
            }}
          />
          <div className="h-4 sm:h-6"></div>
        </main>
      </div>
    </ChatProvider>
  );
}
