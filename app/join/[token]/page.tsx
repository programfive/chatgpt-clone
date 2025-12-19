import { db } from "@/lib/prisma";
import { syncUser } from "@/lib/user";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Unirse al chat',
  description: 'Únete a un chat de grupo mediante un enlace compartido.',
};

interface JoinPageProps {
  params: Promise<{ token: string }>;
}

export default async function JoinPage({ params }: JoinPageProps) {
  const { token } = await params;
  
  const user = await syncUser();
  
  if (!user) {
    redirect(`/sign-in?redirect_url=/join/${token}`);
  }

  const sharedLink = await db.sharedLink.findUnique({
    where: { token },
    include: { conversation: true },
  });

  if (!sharedLink || !sharedLink.isActive) {
    return (
      <div className="min-h-screen bg-[#212121] flex items-center justify-center">
        <div className="bg-[#2a2a2a] rounded-2xl p-8 max-w-md mx-4 text-center">
          <h1 className="text-xl font-semibold text-white mb-4">
            Enlace no válido
          </h1>
          <p className="text-gray-400 mb-6">
            Este enlace de grupo no existe o ha sido desactivado.
          </p>
          <Link
            href="/"
            className="inline-block px-6 py-2 bg-white text-black rounded-full font-medium hover:bg-gray-200 transition-colors"
          >
            Ir al inicio
          </Link>
        </div>
      </div>
    );
  }

  if (sharedLink.conversation.userId === user.id) {
    redirect(`/chat/${sharedLink.conversationId}`);
  }

  const existingMember = await db.conversationMember.findUnique({
    where: {
      conversationId_userId: {
        conversationId: sharedLink.conversationId,
        userId: user.id,
      },
    },
  });

  if (existingMember) {
    redirect(`/chat/${sharedLink.conversationId}`);
  }

  await db.conversationMember.create({
    data: {
      conversationId: sharedLink.conversationId,
      userId: user.id,
    },
  });

  redirect(`/chat/${sharedLink.conversationId}`);
}
