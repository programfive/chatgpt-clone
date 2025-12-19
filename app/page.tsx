import ChatContent from '@/app/components/ChatContent';
import { Suspense } from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ChatGPT',
};

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <ChatContent />
    </Suspense>
  );
}
