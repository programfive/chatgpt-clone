import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';

import ChatContent from '@/app/components/ChatContent';
import { syncUser } from '@/lib/user';
import { db } from '@/lib/prisma';

type Params = {
  params: Promise<{
    id: string;
  }>;
};

export async function generateMetadata(props: Params): Promise<Metadata> {
  const params = await props.params;

  try {
    const conversation = await db.conversation.findUnique({
      where: { id: params.id },
      select: { title: true },
    });

    const title = conversation?.title?.trim();
    return {
      title: title ? title : 'ChatGPT',
    };
  } catch {
    return { title: 'ChatGPT' };
  }
}

export default async function ConversationPage(props: Params) {
  const params = await props.params;
  const user = await syncUser();
  if (!user) {
    redirect('/sign-in?redirect_url=/');
  }

  const conversation = await db.conversation.findUnique({
    where: { id: params.id },
    include: {
      members: true,
    },
  });

  if (!conversation) {
    notFound();
  }

  const isOwner = conversation.userId === user.id;
  const isMember = conversation.members.some((m) => m.userId === user.id);

  if (!isOwner && !isMember) {
    notFound();
  }

  return <ChatContent initialConversationId={params.id} />;
}
