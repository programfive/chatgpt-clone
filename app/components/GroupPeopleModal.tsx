'use client';

import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';

type Member = {
  id: string;
  name: string | null;
  image: string | null;
  role: 'Administrador' | 'Miembro';
};

export default function GroupPeopleModal({
  isOpen,
  onClose,
  conversationId,
  onAddPeople,
}: {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string | null;
  onAddPeople: () => void;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [meId, setMeId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !conversationId) return;

    let cancelled = false;
    setTimeout(() => {
      if (!cancelled) {
        setIsLoading(true);
      }
    }, 0);

    fetch(`/api/conversations/${encodeURIComponent(conversationId)}/members`, {
      credentials: 'include',
      cache: 'no-store',
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      })
      .then((data: { meId?: string; members: Member[] }) => {
        if (cancelled) return;
        setMeId(typeof data.meId === 'string' ? data.meId : null);
        setMembers(Array.isArray(data.members) ? data.members : []);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Error loading group members:', err);
        setMeId(null);
        setMembers([]);
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, conversationId]);

  const orderedMembers = useMemo(() => {
    const me = meId ? members.find((m) => m.id === meId) : null;
    const rest = meId ? members.filter((m) => m.id !== meId) : members;
    return me ? [me, ...rest] : rest;
  }, [members, meId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      <div className="relative w-full max-w-md mx-4 rounded-2xl bg-[#2a2a2a] border border-white/10 shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="text-base font-semibold text-white">Personas</div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5">
          {isLoading ? (
            <div className="text-sm text-white/70">Cargando...</div>
          ) : (
            <div className="space-y-4">
              {orderedMembers.map((member) => {
                const isMe = !!meId && member.id === meId;
                return (
                  <div key={member.id} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#1a1a1a] overflow-hidden flex items-center justify-center text-sm font-semibold text-white">
                      {member.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={member.image} alt={member.name ?? ''} className="w-full h-full object-cover" />
                      ) : (
                        <span>{(member.name ?? 'U').slice(0, 2).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm text-white">{member.name ?? 'Sin nombre'}</div>
                      <div className="text-xs text-white/60">{isMe ? `Tú · ${member.role}` : member.role}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-white">Añadir personas</div>
            <button
              type="button"
              onClick={() => {
                onClose();
                onAddPeople();
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-transparent border border-white/20 rounded-full hover:bg-white/5 transition-colors"
            >
              Añadir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
