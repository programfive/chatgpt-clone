import { currentUser } from '@clerk/nextjs/server';
import { db } from './prisma';

export async function getCurrentUser() {
  const clerkUser = await currentUser();

  if (!clerkUser) {
    return null;
  }

  const user = await db.user.findUnique({
    where: { clerkId: clerkUser.id },
  });

  return user;
}

export async function syncUser() {
  const clerkUser = await currentUser();

  if (!clerkUser) {
    return null;
  }

  const email = clerkUser.emailAddresses[0]?.emailAddress;

  if (!email) {
    return null;
  }

  // Upsert: create if doesn't exist, update if exists
  const user = await db.user.upsert({
    where: { clerkId: clerkUser.id },
    update: {
      email: email,
      name: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || null,
      image: clerkUser.imageUrl || null,
    },
    create: {
      clerkId: clerkUser.id,
      email: email,
      name: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || null,
      image: clerkUser.imageUrl || null,
    },
  });

  return user;
}
