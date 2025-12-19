'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AudioLines,
  BadgeCheck,
  Bot,
  Brain,
  Check,
  FileText,
  Folder,
  Image as ImageIcon,
  Infinity,
  KeyRound,
  Lock,
  MessageCircle,
  Plug,
  Receipt,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  X,
} from 'lucide-react';

type BillingSegment = 'personal' | 'empresa';

type FeatureItem = {
  icon: React.ReactNode;
  text: string;
};

type Plan = {
  key: 'gratis' | 'go' | 'plus' | 'pro' | 'empresa';
  title: string;
  price: string;
  priceUnit: string;
  tagline: string;
  cta: string;
  highlighted?: boolean;
  badge?: string;
  features: FeatureItem[];
  footnote?: string;
};

function SegmentToggle({ value, onChange }: { value: BillingSegment; onChange: (v: BillingSegment) => void }) {
  return (
    <div className="inline-flex rounded-full bg-[#2a2a2a] border border-white/10 p-1">
      <button
        type="button"
        onClick={() => onChange('personal')}
        className={`px-4 py-2 text-sm rounded-full transition-colors ${
          value === 'personal' ? 'bg-[#3a3a3a] text-white' : 'text-[#afafaf] hover:text-white'
        }`}
      >
        Personal
      </button>
      <button
        type="button"
        onClick={() => onChange('empresa')}
        className={`px-4 py-2 text-sm rounded-full transition-colors ${
          value === 'empresa' ? 'bg-[#3a3a3a] text-white' : 'text-[#afafaf] hover:text-white'
        }`}
      >
        Empresa
      </button>
    </div>
  );
}

function PlanCard({ plan, isCurrent }: { plan: Plan; isCurrent?: boolean }) {
  const cardBase =
    'relative rounded-2xl border shadow-[0_10px_30px_rgba(0,0,0,0.45)] overflow-hidden';

  const cardClass = plan.highlighted
    ? `${cardBase} border-white/10 bg-gradient-to-b from-[#24254a] to-[#1a1a1a]`
    : `${cardBase} border-white/10 bg-[#1f1f1f]`;

  const titleClass = plan.highlighted ? 'text-white' : 'text-white';

  const ctaClass = plan.key === 'gratis'
    ? 'w-full rounded-full py-2.5 text-sm font-semibold bg-[#2a2a2a] text-[#afafaf] border border-white/10'
    : plan.highlighted
      ? 'w-full rounded-full py-2.5 text-sm font-semibold bg-[#5b5ce6] hover:bg-[#4f50d6] text-white transition-colors'
      : plan.key === 'plus'
        ? 'w-full rounded-full py-2.5 text-sm font-semibold bg-white text-black hover:bg-gray-200 transition-colors'
        : 'w-full rounded-full py-2.5 text-sm font-semibold bg-white text-black hover:bg-gray-200 transition-colors';

  return (
    <div className={cardClass}>
      <div className="p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className={`text-xl font-semibold ${titleClass}`}>{plan.title}</div>
            <div className="mt-3 flex items-baseline gap-2">
              <div className="text-5xl font-semibold text-white">{plan.price}</div>
              <div className="text-[10px] uppercase tracking-wide text-white/70 leading-tight">
                <div>{plan.priceUnit}</div>
              </div>
            </div>
          </div>

          {plan.badge ? (
            <span className="mt-1 rounded-full bg-white/10 px-2 py-1 text-[10px] font-semibold text-white/80">
              {plan.badge}
            </span>
          ) : null}
        </div>

        <div className="mt-4 text-sm font-semibold text-white/80">{plan.tagline}</div>
        <div className="mt-4">
          <button type="button" className={ctaClass} disabled={isCurrent || plan.key === 'gratis'}>
            {isCurrent ? 'Tu plan actual' : plan.cta}
          </button>
        </div>

        <div className="mt-5">
          <div className="space-y-3">
            {plan.features.map((f) => (
              <div key={f.text} className="flex items-start gap-3 text-sm text-white/85">
                <span className="mt-[1px] text-white/80">{f.icon}</span>
                <span className="leading-snug">{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        {plan.footnote ? (
          <div className="mt-6 text-xs text-white/60">{plan.footnote}</div>
        ) : null}
      </div>
    </div>
  );
}

export default function PricingPage() {
  const router = useRouter();
  const [segment, setSegment] = useState<BillingSegment>('personal');

  const plans = useMemo<Plan[]>(() => {
    if (segment === 'empresa') {
      return [
        {
          key: 'gratis',
          title: 'Gratis',
          price: '$0',
          priceUnit: 'USD / mes',
          tagline: 'Descubrir lo que puede hacer la IA',
          cta: 'Tu plan actual',
          features: [
            { icon: <Star size={16} />, text: 'Obtener explicaciones sencillas' },
            { icon: <MessageCircle size={16} />, text: 'Mantener chats breves para preguntas comunes' },
            { icon: <ImageIcon size={16} />, text: 'Probar la generación de imágenes' },
            { icon: <Brain size={16} />, text: 'Guardar memoria y contexto limitados' },
          ],
        },
        {
          key: 'empresa',
          title: 'Empresa',
          price: '$25',
          priceUnit: 'USD / mes',
          tagline: 'Avanzar en tu trabajo con IA para equipos',
          cta: 'Obtener Business',
          highlighted: true,
          badge: 'RECOMENDADO',
          features: [
            { icon: <FileText size={16} />, text: 'Realizar análisis profesionales' },
            { icon: <Infinity size={16} />, text: 'Obtener mensajes ilimitados con GPT-5' },
            { icon: <ImageIcon size={16} />, text: 'Producir imágenes, videos, presentaciones y más' },
            { icon: <ShieldCheck size={16} />, text: 'Asegurar tu espacio con SSO, MFA y más' },
            { icon: <Lock size={16} />, text: 'Proteger la privacidad; los datos nunca se usan para la formación' },
            { icon: <Folder size={16} />, text: 'Compartir proyectos y GPT personalizados' },
            { icon: <Plug size={16} />, text: 'Integrar con SharePoint y otras herramientas' },
            { icon: <Receipt size={16} />, text: 'Simplificar la facturación y la gestión de usuarios' },
            { icon: <AudioLines size={16} />, text: 'Capturar notas de reuniones con transcripción' },
            { icon: <Users size={16} />, text: 'Administrar equipos y permisos' },
            { icon: <KeyRound size={16} />, text: 'Controles avanzados de seguridad y acceso' },
            { icon: <Bot size={16} />, text: 'Implementar agentes para programar e investigar' },
          ],
          footnote: 'Para más de 2 usuarios, facturación anual',
        },
      ];
    }

    return [
      {
        key: 'gratis',
        title: 'Gratis',
        price: '$0',
        priceUnit: 'USD / mes',
        tagline: 'Descubrir lo que puede hacer la IA',
        cta: 'Tu plan actual',
        features: [
          { icon: <Star size={16} />, text: 'Obtener explicaciones sencillas' },
          { icon: <MessageCircle size={16} />, text: 'Mantener chats breves para preguntas comunes' },
          { icon: <ImageIcon size={16} />, text: 'Probar la generación de imágenes' },
          { icon: <Brain size={16} />, text: 'Guardar memoria y contexto limitados' },
        ],
      },
      {
        key: 'go',
        title: 'Go',
        price: '$5',
        priceUnit: 'USD / mes',
        tagline: 'Hacer más con una IA más avanzada',
        cta: 'Mejora tu plan a Go',
        highlighted: true,
        badge: 'NUEVO',
        features: [
          { icon: <Sparkles size={16} />, text: 'Profundizar en preguntas más complejas' },
          { icon: <MessageCircle size={16} />, text: 'Chatear más tiempo y cargar más contenido' },
          { icon: <ImageIcon size={16} />, text: 'Crear imágenes (calidad mejorada)' },
          { icon: <Brain size={16} />, text: 'Guardar más contexto para respuestas más inteligentes' },
          { icon: <Check size={16} />, text: 'Recibir ayuda con planificación y tareas' },
          { icon: <BadgeCheck size={16} />, text: 'Explorar proyectos, tareas y GPT personalizados' },
        ],
      },
      {
        key: 'plus',
        title: 'Plus',
        price: '$20',
        priceUnit: 'USD / mes',
        tagline: 'Desbloquear la experiencia completa',
        cta: 'Obtener Plus',
        features: [
          { icon: <Sparkles size={16} />, text: 'Resolver problemas complejos' },
          { icon: <MessageCircle size={16} />, text: 'Mantener chats prolongados en varias sesiones' },
          { icon: <ImageIcon size={16} />, text: 'Generar más imágenes, más rápido' },
          { icon: <Brain size={16} />, text: 'Recordar objetivos y conversaciones anteriores' },
          { icon: <Bot size={16} />, text: 'Planificar viajes y tareas con el modo agente' },
          { icon: <Folder size={16} />, text: 'Organizar proyectos y personalizar GPT' },
        ],
      },
      {
        key: 'pro',
        title: 'Pro',
        price: '$200',
        priceUnit: 'USD / mes',
        tagline: 'Maximizar tu productividad',
        cta: 'Obtener Pro',
        features: [
          { icon: <Sparkles size={16} />, text: 'Dominar tareas y temas avanzados' },
          { icon: <Infinity size={16} />, text: 'Afrontar grandes proyectos con mensajes ilimitados' },
          { icon: <ImageIcon size={16} />, text: 'Crear imágenes de alta calidad a cualquier escala' },
          { icon: <Brain size={16} />, text: 'Mantener todo el contexto con memoria máxima' },
          { icon: <Bot size={16} />, text: 'Realizar investigaciones y planificar tareas con agentes' },
          { icon: <BadgeCheck size={16} />, text: 'Escalar proyectos y automatizar flujos de trabajo' },
        ],
      },
    ];
  }, [segment]);

  return (
    <div className="min-h-screen bg-[#212121] text-white">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="flex items-start justify-between">
          <div className="w-10" />
          <div className="flex flex-col items-center gap-3">
            <div className="text-2xl sm:text-3xl font-semibold text-white/90">Cambia a un plan superior</div>
            <SegmentToggle value={segment} onChange={setSegment} />
          </div>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-full p-2 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        <div className={segment === 'empresa' ? 'mx-auto mt-10 max-w-4xl' : 'mt-10'}>
          <div
            className={
              segment === 'empresa'
                ? 'grid grid-cols-1 gap-5 sm:grid-cols-2'
                : 'grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4'
            }
          >
            {plans.map((plan) => (
              <PlanCard
                key={`${segment}-${plan.key}`}
                plan={plan}
                isCurrent={plan.key === 'gratis'}
              />
            ))}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-white/50">
          <Sparkles size={14} />
          <span>Los precios y características son de ejemplo (UI). Integra tu pasarela de pago cuando quieras.</span>
        </div>
      </div>
    </div>
  );
}
