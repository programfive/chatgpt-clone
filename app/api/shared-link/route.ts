import { db } from "@/lib/prisma";
import { syncUser } from "@/lib/user";
import { randomUUID } from "crypto";

export async function POST(req: Request) {
  const user = await syncUser();
  if (!user) {
    return new Response("No autorizado", { status: 401 });
  }

  const { conversationId } = await req.json();

  if (!conversationId) {
    return new Response("ID de conversación requerido", { status: 400 });
  }

  const conversation = await db.conversation.findUnique({
    where: { id: conversationId },
    include: { sharedLink: true },
  });

  if (!conversation || conversation.userId !== user.id) {
    return new Response("Conversación no encontrada", { status: 404 });
  }

  if (conversation.sharedLink) {
    return new Response(JSON.stringify({
      token: conversation.sharedLink.token,
      isActive: conversation.sharedLink.isActive,
      conversationId,
    }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const sharedLink = await db.sharedLink.create({
    data: {
      conversationId,
      token: randomUUID(),
    },
  });

  const starterName = user.name || user.email;
  await db.message.create({
    data: {
      conversationId,
      authorId: user.id,
      role: "system",
      content: `${starterName} ha iniciado el chat de grupo con un enlace de grupo.\n\nTus memorias personales de ChatGPT no se usan en los chats de grupo.`,
    },
  });

  return new Response(JSON.stringify({
    token: sharedLink.token,
    isActive: sharedLink.isActive,
    conversationId,
  }), {
    headers: { "Content-Type": "application/json" },
  });
}

export async function PUT(req: Request) {
  const user = await syncUser();
  if (!user) {
    return new Response("No autorizado", { status: 401 });
  }

  const { conversationId, action } = await req.json();

  if (!conversationId) {
    return new Response("ID de conversación requerido", { status: 400 });
  }

  const conversation = await db.conversation.findUnique({
    where: { id: conversationId },
    include: { sharedLink: true },
  });

  if (!conversation || conversation.userId !== user.id) {
    return new Response("Conversación no encontrada", { status: 404 });
  }

  if (!conversation.sharedLink) {
    return new Response("No existe enlace compartido", { status: 404 });
  }

  if (action === 'reset') {
    const updatedLink = await db.sharedLink.update({
      where: { id: conversation.sharedLink.id },
      data: { token: randomUUID() },
    });

    return new Response(JSON.stringify({
      token: updatedLink.token,
      isActive: updatedLink.isActive,
    }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response("Acción no válida", { status: 400 });
}

export async function DELETE(req: Request) {
  const user = await syncUser();
  if (!user) {
    return new Response("No autorizado", { status: 401 });
  }

  const { conversationId } = await req.json();

  if (!conversationId) {
    return new Response("ID de conversación requerido", { status: 400 });
  }

  const conversation = await db.conversation.findUnique({
    where: { id: conversationId },
    include: { sharedLink: true },
  });

  if (!conversation || conversation.userId !== user.id) {
    return new Response("Conversación no encontrada", { status: 404 });
  }

  if (conversation.sharedLink) {
    await db.sharedLink.delete({
      where: { id: conversation.sharedLink.id },
    });
  }

  await db.conversationMember.deleteMany({
    where: {
      conversationId,
      NOT: {
        userId: conversation.userId,
      },
    },
  });

  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" },
  });
}

export async function GET(req: Request) {
  const user = await syncUser();
  if (!user) {
    return new Response("No autorizado", { status: 401 });
  }

  const url = new URL(req.url);
  const conversationId = url.searchParams.get('conversationId');

  if (!conversationId) {
    return new Response("ID de conversación requerido", { status: 400 });
  }

  const conversation = await db.conversation.findUnique({
    where: { id: conversationId },
    include: { sharedLink: true },
  });

  if (!conversation || conversation.userId !== user.id) {
    return new Response("Conversación no encontrada", { status: 404 });
  }

  if (!conversation.sharedLink) {
    return new Response(JSON.stringify(null), {
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({
    token: conversation.sharedLink.token,
    isActive: conversation.sharedLink.isActive,
  }), {
    headers: { "Content-Type": "application/json" },
  });
}
