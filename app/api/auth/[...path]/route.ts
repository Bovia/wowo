import { getAuth } from "@/lib/auth/server";

type Ctx = { params: Promise<{ path: string[] }> };

const off = () => Response.json({ error: "auth-unconfigured" }, { status: 503 });

export async function GET(request: Request, ctx: Ctx) {
  const auth = getAuth();
  return auth ? auth.handler().GET(request, ctx) : off();
}

export async function POST(request: Request, ctx: Ctx) {
  const auth = getAuth();
  return auth ? auth.handler().POST(request, ctx) : off();
}
