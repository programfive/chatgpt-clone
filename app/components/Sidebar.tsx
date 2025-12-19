'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  MessageSquarePlus,
  Search,
  PanelLeftClose,
  PanelLeft,
  MoreHorizontal,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
} from '@clerk/nextjs';
import { Logo } from './icons/logo';

export type SidebarConversation = {
  id: string;
  title?: string;
  snippet?: string;
  updatedAt: string;
  isShared?: boolean;
  isOwner?: boolean;
  sharedLinkToken?: string | null;
};

type SidebarProps = {
  isOpen: boolean;
  onToggle: () => void;
  onNewChat: () => void;
  onSelectConversation: (conversationId: string) => void;
  activeConversationId: string | null;
  conversations: SidebarConversation[];
  onSearch: () => void;
  onRefreshConversations?: () => void;
};

export default function Sidebar({
  isOpen,
  onToggle,
  onNewChat,
  onSelectConversation,
  activeConversationId,
  conversations,
  onSearch,
  onRefreshConversations,
}: SidebarProps) {
  const [gptExpanded, setGptExpanded] = useState(true);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [confirmDeleteConversationId, setConfirmDeleteConversationId] = useState<string | null>(null);

  const navItems = [
    {
      icon: <MessageSquarePlus size={18} />,
      label: 'Nuevo chat',
      onClick: onNewChat,
    },
    { icon: <Search size={18} />, label: 'Buscar chats', onClick: onSearch }
  ];

  const ownedConversations = conversations.filter((c) => !c.isShared);
  const sharedConversations = conversations.filter((c) => c.isShared);
  const mySharedConversations = ownedConversations.filter((c) => !!c.sharedLinkToken);

  const handleResetSharedLink = async (conversationId: string) => {
    try {
      const response = await fetch('/api/shared-link', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, action: 'reset' }),
      });
      if (!response.ok) {
        const errorBody = await response.text();
        console.error('Error restableciendo enlace:', response.status, errorBody);
        throw new Error('Error al restablecer enlace');
      }
      setOpenMenuId(null);
      await onRefreshConversations?.();
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteSharedLink = async (conversationId: string) => {
    try {
      const response = await fetch('/api/shared-link', {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId }),
      });
      if (!response.ok) {
        const errorBody = await response.text();
        console.error('Error eliminando enlace:', response.status, errorBody);
        throw new Error('Error al eliminar enlace');
      }
      setOpenMenuId(null);
      await onRefreshConversations?.();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <>
      {confirmDeleteConversationId && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4"
          onClick={() => setConfirmDeleteConversationId(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-[#212121] border border-white/10 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 pt-6">
              <div className="text-lg font-semibold text-[#f3f3f3]">Eliminar enlace compartido</div>
              <div className="mt-2 text-sm text-[#afafaf]">
                Si eliminas el enlace, las personas que se unieron con este enlace ya no podrán ver este chat.
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-6 pb-6 pt-5">
              <button
                type="button"
                onClick={() => setConfirmDeleteConversationId(null)}
                className="px-4 py-2 rounded-xl text-sm text-[#f3f3f3] hover:bg-white/10 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  const id = confirmDeleteConversationId;
                  setConfirmDeleteConversationId(null);
                  if (id) {
                    await handleDeleteSharedLink(id);
                  }
                }}
                className="px-4 py-2 rounded-xl text-sm bg-[#ff6b6b] text-black hover:opacity-90 transition-opacity"
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`h-screen bg-[var(--sidebar-bg)] flex flex-col flex-shrink-0 transition-all duration-200 z-50
          ${isOpen ? 'w-[260px]' : 'w-0 lg:w-[72px]'}
          ${isOpen ? 'fixed lg:relative' : 'fixed lg:relative'}
          ${!isOpen ? 'lg:items-center' : ''}
        `}
      >
      <div
        className={`flex items-center justify-between p-3 ${
          isOpen ? '' : 'hidden lg:flex lg:flex-col lg:gap-3'
        }`}
      >
        {isOpen ? (
          <>
            <div className=" hover:bg-[#2f2f2f] rounded-md p-[3px] flex items-center justify-center">
                <Logo width={24} height={24}  />
              </div>
            <button
              onClick={onToggle}
              className="p-2 rounded-lg hover:bg-[#2f2f2f] transition-colors"
            >
              <PanelLeftClose size={20} className="text-[#afafaf]" />
            </button>
          </>
        ) : (
          <button
            onClick={onToggle}
            className="p-2 rounded-lg hover:bg-[#2f2f2f] transition-colors"
          >
            <PanelLeft size={20} className="text-[#afafaf]" />
          </button>
        )}
      </div>

      {isOpen ? (
        <nav className="px-2 space-y-1.5 mt-1">
          {navItems.map((item) => (
            <button
              key={item.label}
              onClick={item.onClick}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#2f2f2f] text-[#f3f3f3] text-sm transition-colors"
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      ) : (
        <nav className="hidden lg:flex flex-col items-center gap-3 mt-4">
          {navItems.map((item) => (
            <button
              key={item.label}
              aria-label={item.label}
              className="flex items-center justify-center w-12 h-12 rounded-full hover:bg-[#2f2f2f] text-[#f3f3f3] transition-colors"
              onClick={item.onClick}
            >
              {item.icon}
            </button>
          ))}
        </nav>
        
      )}

      {isOpen && (
        <>
          <div className="flex-1 overflow-y-auto px-2 mt-2">
            <div className="text-xs text-[#afafaf] px-3 py-2">Tus chats</div>
            <div className="space-y-0.5">
              {ownedConversations.length > 0 ? (
                ownedConversations.map((chat) => (
                  <button
                    key={chat.id}
                    onClick={() => onSelectConversation(chat.id)}
                    className="w-full text-left px-3 py-2 rounded-lg transition-colors text-[#f3f3f3] text-sm truncate hover:bg-[#2f2f2f]"
                  >
                    <div className="font-semibold truncate">
                      {chat.title || 'Chat sin título'}
                    </div>
                  </button>
                ))
              ) : (
                <div className="px-3 py-2 text-xs text-[#8f8f8f]">
                  Crea tu primer chat para que aparezca aquí.
                </div>
              )}
            </div>

            <div className="text-xs text-[#afafaf] px-3 py-2 mt-3">Chats de grupo</div>
            <div className="space-y-0.5">
              {mySharedConversations.length > 0 ? (
                mySharedConversations.map((chat) => (
                  <div key={chat.id} className="relative group">
                    <button
                      onClick={() => onSelectConversation(chat.id)}
                      className="w-full text-left px-3 py-2 pr-10 rounded-lg transition-colors text-[#f3f3f3] text-sm truncate hover:bg-[#2f2f2f]"
                    >
                      <div className="font-semibold truncate">
                        {chat.title || 'Chat sin título'}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId((prev) => (prev === chat.id ? null : chat.id));
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center justify-center w-7 h-7 rounded-md hover:bg-white/10 text-[#f3f3f3]"
                      aria-label="Opciones de enlace"
                    >
                      <MoreHorizontal size={16} />
                    </button>

                    {openMenuId === chat.id && (
                      <div
                        className="absolute right-2 top-full mt-1 w-52 rounded-xl bg-[#2a2a2a] shadow-xl border border-white/10 py-2 z-20"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => handleResetSharedLink(chat.id)}
                          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-[#ff6b6b] hover:bg-white/5 transition-colors"
                        >
                          <RefreshCw size={16} />
                          Restablecer enlace
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setOpenMenuId(null);
                            setConfirmDeleteConversationId(chat.id);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-[#ff6b6b] hover:bg-white/5 transition-colors"
                        >
                          <Trash2 size={16} />
                          Eliminar enlace
                        </button>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="px-3 py-2 text-xs text-[#8f8f8f]">
                  No has compartido chats aún.
                </div>
              )}
            </div>

            <div className="text-xs text-[#afafaf] px-3 py-2 mt-3">Compartidos</div>
            <div className="space-y-0.5">
              {sharedConversations.length > 0 ? (
                sharedConversations.map((chat) => (
                  <button
                    key={chat.id}
                    onClick={() => onSelectConversation(chat.id)}
                    className="w-full text-left px-3 py-2 rounded-lg transition-colors text-[#f3f3f3] text-sm truncate hover:bg-[#2f2f2f]"
                  >
                    <div className="font-semibold truncate">
                      {chat.title || 'Chat sin título'}
                    </div>
                  </button>
                ))
              ) : (
                <div className="px-3 py-2 text-xs text-[#8f8f8f]">
                  No tienes chats compartidos aún.
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <div
        className={`mt-auto p-2 border-t border-[#2f2f2f] w-full ${
          isOpen ? '' : 'hidden lg:flex lg:flex-col lg:items-center lg:gap-3'
        }`}
      >
        <div className={`w-full ${isOpen ? '' : 'flex flex-col items-center gap-3'}`}>
          <SignedOut>
            {isOpen ? (
              <div className="space-y-2 px-3">
                <SignInButton mode="modal">
                  <button className="w-full text-left px-3 py-2 rounded-lg bg-[#2f2f2f] hover:bg-[#3f3f3f] text-sm text-[#f3f3f3] transition-colors">
                    Iniciar sesión
                  </button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button className="w-full text-left px-3 py-2 rounded-lg border border-[#2f2f2f] hover:bg-[#2f2f2f] text-sm text-[#f3f3f3] transition-colors">
                    Registrarse gratuitamente
                  </button>
                </SignUpButton>
              </div>
            ) : (
              <SignInButton mode="modal">
                <button className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 text-white font-semibold">
                  ?
                </button>
              </SignInButton>
            )}
          </SignedOut>

          <SignedIn>
            {isOpen ? (
              <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg hover:bg-[#2f2f2f] cursor-pointer transition-colors">
                <div className="flex items-center gap-3">
                  <UserButton
                    appearance={{
                      elements: {
                        userButtonAvatarBox: 'w-10 h-10',
                        userButtonPopoverCard: 'bg-[#212121] text-white',
                      },
                    }}
                  />
                  <div className="flex flex-col">
                    <span className="text-sm text-[#f3f3f3] truncate">Josue Ken...</span>
                    <span className="text-xs text-[#afafaf]">Gratis</span>
                  </div>
                </div>
                <Link
                  href="/pricing"
                  onClick={(e) => e.stopPropagation()}
                  className="px-3 py-1.5 text-xs rounded-full border border-[#3c3c3c] hover:bg-[#3f3f3f] text-[#f3f3f3] transition-colors cursor-pointer"
                >
                  Mejorar plan
                </Link>
              </div>
            ) : (
              <div className="flex items-center justify-center">
                <UserButton
                  appearance={{
                    elements: {
                      userButtonAvatarBox: 'w-12 h-12',
                    },
                  }}
                />
              </div>
            )}
          </SignedIn>

        </div>
      </div>
    </aside>
    </>
  );
}
