import { db } from "@/lib/prisma";
import { syncUser } from "@/lib/user";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await syncUser();
  if (!user) {
    return new Response("No autorizado", { status: 401 });
  }

  const { id } = await params;

  const conversation = await db.conversation.findUnique({
    where: { id },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        include: {
          uploads: true,
          author: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      },
      members: true,
    },
  });

  if (!conversation) {
    return new Response("Conversación no encontrada", { status: 404 });
  }

  const isOwner = conversation.userId === user.id;
  const isMember = conversation.members.some((m) => m.userId === user.id);

  if (!isOwner && !isMember) {
    return new Response("Conversación no encontrada", { status: 404 });
  }

  const payload = {
    messages: conversation.messages.map((message) => ({
      id: message.id,
      role: message.role as "user" | "assistant" | "system",
      content: message.content,
      uploads: message.uploads || [],
      author: message.author
        ? {
            id: message.author.id,
            name: message.author.name,
            image: message.author.image,
          }
        : null,
    })),
  };

  return new Response(JSON.stringify(payload), {
    headers: { "Content-Type": "application/json" },
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await syncUser();
  if (!user) {
    return new Response("No autorizado", { status: 401 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response("Body inválido", { status: 400 });
  }

  const title =
    typeof (body as { title?: unknown })?.title === "string"
      ? (body as { title: string }).title.trim()
      : "";

  if (!title) {
    return new Response("Título requerido", { status: 400 });
  }

  const conversation = await db.conversation.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      members: { select: { userId: true } },
    },
  });

  if (!conversation) {
    return new Response("Conversación no encontrada", { status: 404 });
  }

  const isOwner = conversation.userId === user.id;
  const isMember = conversation.members.some((m) => m.userId === user.id);

  if (!isOwner && !isMember) {
    return new Response("Conversación no encontrada", { status: 404 });
  }

  if (!isOwner) {
    return new Response("No autorizado", { status: 403 });
  }

  const updated = await db.conversation.update({
    where: { id },
    data: { title },
    select: { id: true, title: true },
  });

  return new Response(JSON.stringify(updated), {
    headers: { "Content-Type": "application/json" },
  });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await syncUser();
  if (!user) {
    return new Response("No autorizado", { status: 401 });
  }

  const { id } = await params;

  const conversation = await db.conversation.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      members: { select: { userId: true } },
    },
  });

  if (!conversation) {
    return new Response("Conversación no encontrada", { status: 404 });
  }

  const isOwner = conversation.userId === user.id;
  const isMember = conversation.members.some((m) => m.userId === user.id);

  if (!isOwner && !isMember) {
    return new Response("Conversación no encontrada", { status: 404 });
  }

  if (!isOwner) {
    return new Response("No autorizado", { status: 403 });
  }

  await db.conversation.delete({ where: { id } });

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
}
