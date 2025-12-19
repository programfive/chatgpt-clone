'use client';

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

export default function RenameGroupModal({
  isOpen,
  onClose,
  conversationId,
  currentTitle,
  onRenamed,
}: {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string | null;
  currentTitle?: string | null;
  onRenamed?: (nextTitle: string) => void;
}) {
  const [value, setValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setValue(currentTitle ?? '');
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [isOpen, currentTitle]);

  const handleSubmit = async () => {
    if (!conversationId) return;

    const nextTitle = value.trim();
    if (!nextTitle) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/conversations/${encodeURIComponent(conversationId)}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: nextTitle }),
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(body || 'Error al renombrar');
      }

      onRenamed?.(nextTitle);
      onClose();
    } catch (error) {
      console.error('Rename group failed:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const canSubmit = !!conversationId && value.trim().length > 0 && !isSaving;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      <div className="relative bg-[#2a2a2a] rounded-2xl w-full max-w-lg mx-4 shadow-2xl border border-white/10">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="text-lg font-semibold text-white">Renombrar chat de grupo</div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 pb-6">
          <div className="rounded-xl border border-white/20 bg-transparent px-4 py-3">
            <input
              ref={inputRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full bg-transparent text-white text-sm outline-none"
              type="text"
            />
          </div>

          <div className="mt-5 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 text-sm font-medium text-white bg-transparent border border-white/20 rounded-full hover:bg-white/5 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="px-5 py-2 text-sm font-medium text-black bg-white rounded-full hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Guardando...' : 'Cambiar el nombre'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
