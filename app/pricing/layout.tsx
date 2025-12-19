import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Planes y precios',
  description: 'Explora los planes disponibles.',
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
