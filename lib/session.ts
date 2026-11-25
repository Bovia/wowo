import { getAuth } from "@/lib/auth/server";

export async function currentUser(request?: Request) {
  const auth = getAuth();
  if (!auth) return null;
  const { data: session } = await auth.getSession();
  const user = session?.user;
  if (!user?.id) return null;
  const expected = request?.headers.get("x-wowo-owner");
  if (expected && user.id !== expected) return null;
  return user;
}
