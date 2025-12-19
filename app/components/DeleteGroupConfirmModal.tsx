'use client';

import { X } from 'lucide-react';

export default function DeleteGroupConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
  groupTitle,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
  groupTitle?: string | null;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      <div className="relative bg-[#2a2a2a] rounded-2xl w-full max-w-lg mx-4 shadow-2xl border border-white/10">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="text-lg font-semibold text-white">Eliminar grupo</div>
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
          <div className="text-sm text-white/80">
            {groupTitle ? (
              <span>
                ¿Seguro que deseas eliminar <span className="font-semibold text-white">{groupTitle}</span>?
              </span>
            ) : (
              <span>¿Seguro que deseas eliminar este grupo?</span>
            )}
          </div>
          <div className="mt-2 text-xs text-white/60">
            Esta acción no se puede deshacer.
          </div>

          <div className="mt-5 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 text-sm font-medium text-white bg-transparent border border-white/20 rounded-full hover:bg-white/5 transition-colors"
              disabled={!!isLoading}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={!!isLoading}
              className="px-5 py-2 text-sm font-medium text-white bg-[#ff4d4f] rounded-full hover:bg-[#ff6668] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Eliminando...' : 'Eliminar grupo'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
