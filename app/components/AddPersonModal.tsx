'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { MoreHorizontal, RefreshCw, Trash2, Check } from 'lucide-react';
import { useToast } from './ToastProvider';

interface AddPersonModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string | null;
  initialStep?: ModalStep;
  initialSharedLinkToken?: string | null;
}

type ModalStep = 'initial' | 'link';

interface SharedLinkData {
  token: string;
  isActive: boolean;
}

export default function AddPersonModal({
  isOpen,
  onClose,
  conversationId,
  initialStep,
  initialSharedLinkToken,
}: AddPersonModalProps) {
  const router = useRouter();
  const [step, setStep] = useState<ModalStep>('initial');
  const [sharedLink, setSharedLink] = useState<SharedLinkData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const { showToast } = useToast();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setStep('initial');
      setSharedLink(null);
      setShowMenu(false);
      setCopied(false);
      return;
    }

    const nextStep = initialStep ?? 'initial';
    setStep(nextStep);

    if (nextStep === 'link') {
      if (initialSharedLinkToken) {
        setSharedLink({ token: initialSharedLinkToken, isActive: true });
      } else if (conversationId) {
        void (async () => {
          setIsLoading(true);
          try {
            const response = await fetch('/api/shared-link', {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ conversationId }),
            });
            if (!response.ok) throw new Error('Error al crear enlace');
            const data = await response.json();
            setSharedLink(data);
          } catch (error) {
            console.error('Error:', error);
            setStep('initial');
          } finally {
            setIsLoading(false);
          }
        })();
      }
    }
  }, [isOpen, conversationId, initialSharedLinkToken, initialStep]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleStartGroupChat = async () => {
    if (!conversationId) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/shared-link', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId }),
      });
      
      if (!response.ok) throw new Error('Error al crear enlace');
      
      const data = await response.json();
      setSharedLink(data);
      setStep('link');

      router.replace(`/chat/${conversationId}?group-started=true`, { scroll: false });
      onClose();
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!sharedLink) return;
    
    const link = `${window.location.origin}/join/${sharedLink.token}`;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    showToast({
      variant: 'success',
      title: 'Copiado',
      message: 'Enlace copiado al portapapeles',
    });
    onClose();
  };

  const handleResetLink = async () => {
    if (!conversationId) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/shared-link', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, action: 'reset' }),
      });
      
      if (!response.ok) throw new Error('Error al restablecer enlace');
      
      const data = await response.json();
      setSharedLink(data);
      setShowMenu(false);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteLink = async () => {
    if (!conversationId) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/shared-link', {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId }),
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        console.warn('Delete shared link failed:', {
          status: response.status,
          statusText: response.statusText,
          body,
        });

        // Si el enlace ya no existe (operación idempotente), evitamos mostrar error.
        if (response.status !== 404) {
          throw new Error('Error al eliminar enlace');
        }
      }

      setSharedLink(null);
      setStep('initial');
      setShowMenu(false);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const linkUrl = sharedLink ? `${typeof window !== 'undefined' ? window.location.origin : ''}/join/${sharedLink.token}` : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      
      <div className="relative bg-[#2a2a2a] rounded-2xl w-full max-w-md mx-4 shadow-2xl border border-white/10">
        {step === 'initial' ? (
          <div className="p-6">
            <h2 className="text-lg font-semibold text-white mb-2">
              Inicia un chat de grupo desde esta conversación
            </h2>
            <p className="text-sm text-gray-400 mb-6">
              Solo se compartirá esta conversación. Tu memoria personal de ChatGPT siempre es privada.
            </p>
            
            <div className="flex items-center w-full">
              <div className="flex gap-3 justify-end md:flex-row w-full flex-col-reverse gap-3">
                <button
                  onClick={onClose}
                  className="px-4 w-full md:w-fit py-2 text-sm font-medium text-white bg-transparent border border-white/20 rounded-full hover:bg-white/5 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleStartGroupChat}
                  disabled={isLoading || !conversationId}
                  className="px-4 py-2 text-sm font-medium text-black bg-white rounded-full hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Creando...' : 'Iniciar chat de grupo'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6">
            <h2 className="text-lg font-semibold text-white mb-4">
              Enlace de grupo
            </h2>
            
            <div className="flex items-center gap-2 mb-4">
              <div className="flex-1  rounded-lg px-4 py-3 border border-white/10">
                <input
                  type="text"
                  value={linkUrl}
                  readOnly
                  className="w-full bg-transparent text-white text-sm outline-none"
                />
              </div>
              
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-3 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <MoreHorizontal size={20} className="text-white" />
                </button>
                
                {showMenu && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-[#2a2a2a] rounded-xl shadow-xl border border-white/10 py-2 z-10">
                    <button
                      onClick={handleResetLink}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-[#ff6b6b] hover:bg-white/5 transition-colors"
                    >
                      <RefreshCw size={16} />
                      Restablecer enlace
                    </button>
                    <button
                      onClick={handleDeleteLink}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-[#ff6b6b] hover:bg-white/5 transition-colors"
                    >
                      <Trash2 size={16} />
                      Eliminar enlace
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            <p className="text-sm text-gray-200 mb-6">
              Usa un enlace de grupo para invitar a otros a unirse a tu chat de grupo. 
              Cualquiera puede unirse con ese enlace y podrá ver los mensajes anteriores del grupo.
            </p>
            
            <div className="flex flex-col md:flex-row justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-white bg-transparent border border-white/20 rounded-full hover:bg-white/5 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCopyLink}
                className="px-4 py-2 text-sm font-medium text-black bg-white rounded-full hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
              >
                {copied ? (
                  <>
                    <Check size={16} />
                    Copiado
                  </>
                ) : (
                  'Copiar enlace'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
