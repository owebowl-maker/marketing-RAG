import { currentUser } from "@/lib/auth";
import { deleteConversation, getConversation, listMessages, updateConversation } from "@/lib/db";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const user = await currentUser();
  if (!user) return new Response("未登录", { status: 401 });
  const { id } = await params;
  if (!getConversation(id, user)) return new Response("会话不存在", { status: 404 });
  return Response.json(listMessages(id));
}

export async function PATCH(req: Request, { params }: Ctx) {
  const user = await currentUser();
  if (!user) return new Response("未登录", { status: 401 });
  const { id } = await params;
  const { title } = (await req.json()) as { title?: string };
  if (!title?.trim()) return new Response("标题不能为空", { status: 400 });
  updateConversation(id, user, { title: title.trim().slice(0, 50) });
  return Response.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const user = await currentUser();
  if (!user) return new Response("未登录", { status: 401 });
  const { id } = await params;
  deleteConversation(id, user);
  return Response.json({ ok: true });
}
