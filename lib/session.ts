import { getAuth } from "@/lib/auth/server";

export async function currentUser() {
  const auth = getAuth();
  if (!auth) return null;
  const { data: session } = await auth.getSession();
  const user = session?.user;
  if (!user?.id) return null;
  return user;
}
