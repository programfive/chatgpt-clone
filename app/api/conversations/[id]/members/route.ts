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
      user: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
        orderBy: {
          joinedAt: "asc",
        },
      },
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

  const seen = new Set<string>();

  const payload: Array<{
    id: string;
    name: string | null;
    image: string | null;
    role: "Administrador" | "Miembro";
  }> = [];

  if (conversation.user) {
    payload.push({
      id: conversation.user.id,
      name: conversation.user.name ?? null,
      image: conversation.user.image ?? null,
      role: "Administrador",
    });
    seen.add(conversation.user.id);
  }

  for (const member of conversation.members) {
    if (!member.user) continue;
    if (seen.has(member.user.id)) continue;
    payload.push({
      id: member.user.id,
      name: member.user.name ?? null,
      image: member.user.image ?? null,
      role: "Miembro",
    });
    seen.add(member.user.id);
  }

  return new Response(JSON.stringify({ meId: user.id, members: payload }), {
    headers: { "Content-Type": "application/json" },
  });
}
