'use client';

import { useEffect, useRef, useState } from 'react';
import { Menu, ChevronDown, Sparkles, Brain, UserPlus, MessageCircle, X, Zap, ShieldCheck, Rocket, Users, Link2, Pencil, Trash2 } from 'lucide-react';
import { SignedIn, SignedOut, SignInButton, SignUpButton, useUser } from '@clerk/nextjs';
import { Logo } from './icons/logo';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export type HeaderProps = {
  onMenuClick?: () => void;
  onAddPerson?: () => void;
  activeConversation?: {
    id: string;
    title?: string;
    isShared?: boolean;
    isOwner?: boolean;
    sharedLinkToken?: string | null;
  } | null;
  onOpenGroupPeople?: () => void;
  onOpenGroupLink?: () => void;
  onOpenGroupRename?: () => void;
  onOpenGroupDelete?: () => void;
};

export const gptModels = [
  {
    value: 'gpt-4o',
    label: 'GPT-4o',
    description: 'Nuestro modelo multimodal más avanzado. Rápido, inteligente y versátil.',
    icon: <Zap size={32} className="text-[#f3f3f3]" />,
  },
  {
    value: 'gpt-4o-mini',
    label: 'GPT-4o mini',
    description: 'Modelo rápido y económico para tareas cotidianas.',
    icon: <ShieldCheck size={32} className="text-[#f3f3f3]" />,
  },
  {
    value: 'gpt-4-turbo',
    label: 'GPT-4 Turbo',
    description: 'Modelo potente con contexto de 128k tokens.',
    icon: <Sparkles size={32} className="text-[#f3f3f3]" />,
  },
  {
    value: 'gpt-3.5-turbo',
    label: 'GPT-3.5 Turbo',
    description: 'Modelo clásico, rápido y económico para tareas simples.',
    icon: <Rocket size={32} className="text-[#f3f3f3]" />,
  },
];

export type GptModelOption = (typeof gptModels)[number];

export default function Header({
  onMenuClick,
  onAddPerson,
  activeConversation,
  onOpenGroupPeople,
  onOpenGroupLink,
  onOpenGroupRename,
  onOpenGroupDelete,
  selectedModel,
  onModelChange,
}: HeaderProps & {
  selectedModel: GptModelOption;
  onModelChange: (model: GptModelOption) => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isTemporaryChat = searchParams.get('temporary-chat') === 'true';
  const { user } = useUser();
  const [menuOpen, setMenuOpen] = useState(false);
  const [groupMenuOpen, setGroupMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const groupMenuRef = useRef<HTMLDivElement>(null);

  const isGroupChat = !!activeConversation && (Boolean(activeConversation.sharedLinkToken) || Boolean(activeConversation.isShared));

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuOpen && menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }

      if (groupMenuOpen && groupMenuRef.current && !groupMenuRef.current.contains(event.target as Node)) {
        setGroupMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen, groupMenuOpen]);

  return (
    <header className="flex items-center justify-between px-3 sm:px-4 py-3 relative">
      {/* Left - Menu + Model Selector */}
      <div className="flex items-center gap-2">
        <SignedOut>
          <Logo className="text-white" width={24} height={24} />
        </SignedOut>
        {/* Mobile Menu Button */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 hover:bg-[#2f2f2f] rounded-lg transition-colors"
        >
          <Menu size={20} className="text-[#f3f3f3]" />
        </button>

        {isGroupChat ? (
          <div className="relative" ref={groupMenuRef}>
            <button
              type="button"
              onClick={() => setGroupMenuOpen((prev) => !prev)}
              className="flex items-center gap-2 px-2 sm:px-3 py-1.5 hover:bg-[#2f2f2f] rounded-lg transition-colors"
            >
              <span className="text-[#f3f3f3] font-medium text-sm sm:text-base truncate max-w-[200px] sm:max-w-[260px]">
                {activeConversation?.title || 'Chat de grupo'}
              </span>
              <ChevronDown size={16} className="text-[#afafaf]" />
            </button>

            {groupMenuOpen && (
              <div className="absolute left-0 top-full mt-2 w-68 rounded-2xl bg-[#2a2a2a] p-2 shadow-xl border border-white/10 z-50">
                <button
                  type="button"
                  onClick={() => {
                    setGroupMenuOpen(false);
                    onOpenGroupPeople?.();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 transition-colors text-sm text-white"
                >
                  <Users size={16} className="text-white/80" />
                  Personas
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setGroupMenuOpen(false);
                    onOpenGroupLink?.();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 transition-colors text-sm text-white"
                >
                  <Link2 size={16} className="text-white/80" />
                  Gestionar enlace del grupo
                </button>

                {activeConversation?.isOwner ? (
                  <button
                    type="button"
                    onClick={() => {
                      setGroupMenuOpen(false);
                      onOpenGroupRename?.();
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 transition-colors text-sm text-white"
                  >
                    <Pencil size={16} className="text-white/80" />
                    Cambiar el nombre del grupo
                  </button>
                ) : null}

                <div className="my-2 h-px bg-white/10" />
                {activeConversation?.isOwner ? (
                  <button
                    type="button"
                    onClick={() => {
                      setGroupMenuOpen(false);
                      onOpenGroupDelete?.();
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 transition-colors text-sm text-[#ff6b6b]"
                  >
                    <Trash2 size={16} className="text-[#ff6b6b]" />
                    Eliminar grupo
                  </button>
                ) : null}
              </div>
            )}
          </div>
        ) : (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((prev) => !prev)}
              className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 hover:bg-[#2f2f2f] rounded-lg transition-colors"
              type="button"
            >
              <span className="text-[#f3f3f3] font-medium text-sm sm:text-base">{selectedModel.label}</span>
              <ChevronDown size={16} className="text-[#afafaf]" />
            </button>

            {menuOpen && (
              <div className="absolute z-50 left-0 top-full mt-2 w-64 rounded-2xl bg-[#2a2a2a] p-2 shadow-xl border border-white/5">
                {gptModels.map((model) => (
                  <button
                    key={model.value}
                    onClick={() => {
                      onModelChange(model);
                      setMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 mb-2 rounded-lg transition-colors hover:bg-[#2d2d2d] flex items-center gap-3`}
                  >
                    {model.icon}
                    <div>
                      <p className="text-sm font-semibold">{model.label}</p>
                      <p className="text-xs text-gray-300">{model.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Center - Upgrade Button */}
      {!isGroupChat ? (
        <div className="absolute left-1/2 -translate-x-1/2 hidden md:block">
          <Link
            href="/pricing"
            className="flex items-center gap-2 px-4 py-2 bg-[#5856d6] hover:bg-[#4a48c7] rounded-full text-white text-sm font-medium transition-colors cursor-pointer"
          >
            <Sparkles size={16} />
            <span>Mejora tu plan a Go</span>
          </Link>
        </div>
      ) : null}

      <div className="flex items-center gap-2 sm:gap-3">
        <SignedIn>
          {!isGroupChat && !isTemporaryChat && (
            <>
              {/* Memoria llena - visible on mobile */}
              <div className="relative group">
                <button className="flex items-center justify-center text-white p-2 hover:bg-[#2f2f2f] rounded-lg transition-colors">
                  <Brain size={18} className="sm:w-5 sm:h-5" />
                  <span className="text-xs sm:text-sm pl-1.5 sm:pl-2 font-semibold hidden md:inline">Memoria llena</span>
                </button>
                <div className="pointer-events-none absolute top-full mt-2 left-1/2 -translate-x-1/2 hidden w-64 max-w-[min(22rem,calc(100vw-2rem))] rounded-2xl bg-[#101010] px-4 py-3 text-left text-sm text-white shadow-lg group-hover:block">
                  <p className="text-[13px] leading-snug">
                    ChatGPT se ha quedado sin espacio para las memorias guardadas.{' '}
                    <span className="text-[#5b95ff] underline cursor-pointer">Gestiona las memorias guardadas</span> para crear más espacio.
                  </p>
                </div>
              </div>

              {/* User Plus Icon - Añadir persona */}
              <div className="relative group">
                <button 
                  onClick={onAddPerson}
                  className="flex items-center justify-center hover:bg-white/10 transition-colors p-2 rounded-full"
                >
                  <UserPlus size={18} className="sm:w-5 sm:h-5" />
                </button>
                <div className="pointer-events-none absolute top-full mt-2 left-1/2 -translate-x-1/2 hidden w-40 max-w-[min(16rem,calc(100vw-2rem))] rounded-2xl bg-[#101010] px-3 py-2 text-center text-xs text-white shadow-lg group-hover:block">
                  Añadir persona
                </div>
              </div>
            </>
          )}

          {isGroupChat && !isTemporaryChat ? (
            <button
              type="button"
              onClick={() => onOpenGroupPeople?.()}
              className="w-9 h-9 rounded-full bg-[#2f2f2f] hover:bg-[#3a3a3a] transition-colors flex items-center justify-center overflow-hidden"
              aria-label="Personas"
            >
              {user?.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.imageUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs font-semibold text-white">
                  {(user?.fullName || user?.username || 'U').slice(0, 2).toUpperCase()}
                </span>
              )}
            </button>
          ) : null}

          {!isGroupChat ? (
            <div className="relative group">
              <button
                type="button"
                onClick={() => {
                  if (isTemporaryChat) {
                    router.push('/');
                  } else {
                    router.push('/?temporary-chat=true');
                  }
                }}
                className="flex items-center justify-center hover:bg-white/10 transition-colors p-2 rounded-full"
              >
                {isTemporaryChat ? (
                  <X size={18} className="sm:w-5 sm:h-5" />
                ) : (
                  <MessageCircle size={18} className="sm:w-5 sm:h-5" />
                )}
              </button>
              <div className="pointer-events-none absolute top-full mt-2 right-0 hidden w-36 max-w-[min(16rem,calc(100vw-2rem))] rounded-2xl bg-[#101010] px-3 py-2 text-center text-xs text-white shadow-lg group-hover:block">
                {isTemporaryChat ? 'Desactivar chat temporal' : 'Activar chat temporal'}
              </div>
            </div>
          ) : null}
        </SignedIn>

        <SignedOut>
          <div className="flex items-center gap-2">
            <SignInButton mode="modal">
              <button className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-white/90">
                Iniciar sesión
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="rounded-full border border-white/60 px-4 py-2 text-sm font-semibold text-white transition-colors hover:border-white hover:bg-white/5">
                Registrarse gratuitamente
              </button>
            </SignUpButton>
          </div>
        </SignedOut>
      </div>
    </header>
  );
}
