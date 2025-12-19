import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { db } from '@/lib/prisma';
import { syncUser } from '@/lib/user';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await syncUser();
  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const { id } = await params;
    const conversation = await db.conversation.findFirst({
      where: {
        id,
        userId: user.id,
      },
      include: {
        sharedLink: true,
      },
    });

    if (!conversation) {
      return new NextResponse('Conversation not found', { status: 404 });
    }

    return NextResponse.json({
      token: conversation.sharedLink?.token ?? null,
      isActive: conversation.sharedLink?.isActive ?? false,
    });
  } catch (error) {
    console.error('[SHARE_GET]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await syncUser();
  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const { id } = await params;
    // Check ownership
    const existing = await db.conversation.findFirst({
      where: { id, userId: user.id },
      include: { sharedLink: true },
    });

    if (!existing) {
      return new NextResponse('Not found', { status: 404 });
    }

    if (existing.sharedLink) {
      return NextResponse.json({
        token: existing.sharedLink.token,
        isActive: existing.sharedLink.isActive,
      });
    }

    const sharedLink = await db.sharedLink.create({
      data: {
        conversationId: existing.id,
        token: randomUUID(),
      },
    });

    const starterName = user.name || user.email;
    await db.message.create({
      data: {
        conversationId: existing.id,
        authorId: user.id,
        role: 'system',
        content: `${starterName} ha iniciado el chat de grupo con un enlace de grupo.\n\nTus memorias personales de ChatGPT no se usan en los chats de grupo.`,
      },
    });

    return NextResponse.json({
      token: sharedLink.token,
      isActive: sharedLink.isActive,
    });
  } catch (error) {
    console.error('[SHARE_POST]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await syncUser();
  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const { id } = await params;
    const conversation = await db.conversation.findFirst({
      where: { id, userId: user.id },
      include: { sharedLink: true },
    });

    if (!conversation || !conversation.sharedLink) {
      return new NextResponse('Not found', { status: 404 });
    }

    const updatedLink = await db.sharedLink.update({
      where: { id: conversation.sharedLink.id },
      data: { token: randomUUID() },
    });

    return NextResponse.json({
      token: updatedLink.token,
      isActive: updatedLink.isActive,
    });
  } catch (error) {
    console.error('[SHARE_PATCH]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) {
    const user = await syncUser();
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
  
    try {
      const { id } = await params;
      // Check ownership
      const existing = await db.conversation.findFirst({
        where: { id, userId: user.id },
        include: { sharedLink: true },
      });
  
      if (!existing || !existing.sharedLink) {
        return new NextResponse('Not found', { status: 404 });
      }
  
      await db.sharedLink.delete({
        where: { id: existing.sharedLink.id },
      });
  
      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('[SHARE_DELETE]', error);
      return new NextResponse('Internal Error', { status: 500 });
    }
  }
