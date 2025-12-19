'use client';

import { useMemo, useState } from 'react';
import { Circle, X, PenSquare, MessageCircle, Search } from 'lucide-react';
import { SidebarConversation } from './Sidebar';

type SearchModalProps = {
  isOpen: boolean;
  onClose: () => void;
  conversations: SidebarConversation[];
  onSelectConversation: (conversationId: string) => Promise<void> | void;
  onNewChat: () => void;
};

const now = () => new Date().getTime();

const dates = {
  today: 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
};

const groupLabel = (conversation: SidebarConversation) => {
  const updated = new Date(conversation.updatedAt).getTime();
  const diff = now() - updated;

  if (diff <= dates.today) return 'Hoy';
  if (diff <= dates.week) return '7 días anteriores';
  return 'Hace más de una semana';
};

export default function SearchModal({
  isOpen,
  onClose,
  conversations,
  onSelectConversation,
  onNewChat,
}: SearchModalProps) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return conversations;

    return conversations.filter((conversation) => {
      const title = conversation.title ?? '';
      const snippet = conversation.snippet ?? '';
      return (
        title.toLowerCase().includes(normalized) ||
        snippet.toLowerCase().includes(normalized)
      );
    });
  }, [conversations, query]);

  const grouped = useMemo(() => {
    const map = filtered.reduce<Record<string, SidebarConversation[]>>(
      (acc, conversation) => {
        const label = groupLabel(conversation);
        if (!acc[label]) acc[label] = [];
        acc[label].push(conversation);
        return acc;
      },
      {}
    );

    const sortedLabels = ['Hoy', '7 días anteriores', 'Hace más de una semana'];

    return sortedLabels
      .map((label) => ({
        label,
        items: map[label] ?? [],
      }))
      .filter((group) => group.items.length > 0);
  }, [filtered]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[60] flex items-start justify-center bg-black/60 px-4"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-2xl mt-20 bg-[#2f2f2f] rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header con búsqueda */}
        <div className="relative border-b border-white/10">
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar chats..."
            autoFocus
            className="w-full bg-transparent px-6 py-4 pr-14 text-[15px] text-white placeholder:text-[#fffc] focus:outline-none"
          />
          <button
            onClick={onClose}
            className="absolute right-4 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
            aria-label="Cerrar búsqueda"
          >
            <X size={20} />
          </button>
        </div>

        {/* Botón Nuevo chat */}
        <div className="px-4 py-3 border-b border-white/10">
          <button
            onClick={() => {
              onNewChat();
              onClose();
            }}
            className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[15px] text-white hover:bg-white/10 transition-colors"
          >
            <PenSquare size={18} className="text-white" />
            <span>Nuevo chat</span>
          </button>
        </div>

        {/* Lista de conversaciones */}
        <div className="max-h-[60vh] overflow-y-auto">
          {grouped.length === 0 ? (
            <div className="text-sm flex gap-2 text-gray-300 text-start pb-12 px-4 pt-6">
              <Search size={18} />
              {query ? 'Sin resultados' : 'No hay conversaciones'}
            </div>
          ) : (
            grouped.map((group) => (
              <div key={group.label} className="px-2 py-2">
                <p className="px-4 py-2 text-xs font-medium text-gray-100 uppercase tracking-wide">
                  {group.label}
                </p>
                <div className="space-y-0.5">
                  {group.items.map((conversation) => (
                    <button
                      key={conversation.id}
                      onClick={() => {
                        onSelectConversation(conversation.id);
                        onClose();
                      }}
                      className="w-full rounded-lg px-3 py-2.5 text-left hover:bg-white/10 transition-colors flex items-center gap-3 group"
                    >
                      <MessageCircle size={18} className="text-gray-100 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[15px] text-white truncate">
                          {conversation.title || 'Chat sin título'}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
