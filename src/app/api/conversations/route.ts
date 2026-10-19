import { currentUser } from "@/lib/auth";
import { listConversations } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const user = await currentUser();
  if (!user) return new Response("未登录", { status: 401 });
  return Response.json(listConversations(user));
}
