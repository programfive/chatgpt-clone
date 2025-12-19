import { db } from "@/lib/prisma";
import { syncUser } from "@/lib/user";

export async function GET() {
  const user = await syncUser();

  if (!user) {
    return new Response("No autorizado", { status: 401 });
  }

  const conversations = await db.conversation.findMany({
    where: {
      OR: [
        { userId: user.id },
        { members: { some: { userId: user.id } } },
      ],
    },
    orderBy: { updatedAt: "desc" },
    include: {
      messages: {
        where: {
          role: {
            in: ["user", "assistant"],
          },
        },
        take: 1,
        orderBy: { createdAt: "desc" },
        select: {
          content: true,
        },
      },
      sharedLink: {
        select: {
          token: true,
          isActive: true,
        },
      },
    },
  });

  const payload = conversations.map((conversation) => ({
    id: conversation.id,
    title: conversation.title,
    updatedAt: conversation.updatedAt.toISOString(),
    snippet: conversation.messages[0]?.content ?? null,
    isShared: conversation.userId !== user.id,
    isOwner: conversation.userId === user.id,
    sharedLinkToken: conversation.sharedLink?.isActive ? conversation.sharedLink.token : null,
  }));

  return new Response(JSON.stringify(payload), {
    headers: { "Content-Type": "application/json" },
  });
}
