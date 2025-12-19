'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { SignedOut } from '@clerk/nextjs';
import { SignedIn } from '@clerk/nextjs';

export default function NotificationBanner() {
  const [visible, setVisible] = useState(true);

  if (!visible) {
    return null;
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-3 sm:px-4 mb-4 md:mb-0 md:absolute md:bottom-6 md:left-1/2 md:-translate-x-1/2 md:px-4 pointer-events-none">
      <SignedIn>
        <div className="rounded-2xl sm:rounded-3xl bg-[#2f2f2f] px-4 sm:px-5 py-3 sm:py-4 text-white shadow-lg pointer-events-auto relative">
          <button
            className="absolute top-3 right-3 sm:top-4 sm:right-4 text-white/70 cursor-pointer hover:text-white"
            onClick={() => setVisible(false)}
          >
            <X size={18} className="text-[#afafaf] sm:w-5 sm:h-5" />
          </button>

          <div className="md:hidden">
            <div className="pr-6 space-y-2">
              <p className="font-semibold text-sm">ChatGPT se ha quedado sin espacio para las memorias guardadas.</p>
              <p className="text-[#cfcfcf] text-xs leading-snug">
                No se añadirán nuevas memorias hasta que haya espacio.
              </p>
              <span className="underline text-xs cursor-pointer block">Más información</span>
            </div>
            <button className="mt-3 rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-white/90">
              Gestionar
            </button>
          </div>

          <div className="hidden md:flex items-start gap-3 pr-10">
            <div className="flex-1 space-y-1 text-sm leading-snug">
              <p className="font-semibold">ChatGPT se ha quedado sin espacio para las memorias guardadas.</p>
              <p className="text-[#cfcfcf]">
                No se añadirán nuevas memorias hasta que haya espacio.{' '}
              </p>
              <span className="underline cursor-pointer">Más información</span>
            </div>
            <button className="rounded-full my-auto bg-white px-5 py-2 text-sm font-semibold text-black transition-colors hover:bg-white/90 whitespace-nowrap flex-shrink-0">
              Gestionar
            </button>
          </div>
        </div>
      </SignedIn>

      <SignedOut>
        <div className="rounded-2xl sm:rounded-3xl bg-[#2f2f2f] px-4 sm:px-5 py-3 sm:py-4 text-white shadow-lg pointer-events-auto relative">
          <button
            className="absolute top-3 right-3 sm:top-4 sm:right-4 text-white/70 cursor-pointer hover:text-white"
            onClick={() => setVisible(false)}
          >
            <X size={18} className="text-[#afafaf] sm:w-5 sm:h-5" />
          </button>

          <div className="text-sm md:text-base  md:max-w-[94%] leading-snug space-y-1 text-[#f5f5f5]">
            <p>
              Al enviar un mensaje a ChatGPT, un asistente de IA, aceptas nuestras{' '}
              <a className="underline" href="#">
                condiciones
              </a>{' '}
              y confirmas que has leído nuestra{' '}
              <a className="underline" href="#">
                política de privacidad
              </a>
              .
            </p>
            <p className="text-[#cfcfcf]">
              No compartas información confidencial. Los chats pueden ser revisados y usados para formar a nuestros modelos.{' '}
              <a className="underline" href="#">
                Obtener más información
              </a>
            </p>
          </div>
        </div>
      </SignedOut>
    </div>
  );
}
