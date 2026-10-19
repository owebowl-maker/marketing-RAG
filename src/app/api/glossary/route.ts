import { currentUser } from "@/lib/auth";
import { loadGlossary } from "@/lib/glossary";

export const runtime = "nodejs";

export async function GET() {
  const user = await currentUser();
  if (!user) return new Response("未登录", { status: 401 });
  const { entries, isSample } = loadGlossary();
  return Response.json({ entries, isSample });
}
