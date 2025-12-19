import { syncUser } from '@/lib/user';
import { currentUser } from '@clerk/nextjs/server';

export default async function UserSync() {
  const clerkUser = await currentUser();

  if (clerkUser) {
    await syncUser();
  }

  return null;
}
