import { currentUser } from "@/lib/auth";
import { getBackend } from "@/lib/backends";
import { getMessageOwner, saveFeedback } from "@/lib/db";
import type { Rating } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return new Response("未登录", { status: 401 });
  const body = (await req.json()) as { messageId: string; rating: Rating; reasons?: string[]; comment?: string };
  const owner = getMessageOwner(body.messageId);
  if (!owner || owner.user !== user) return new Response("消息不存在", { status: 404 });

  saveFeedback(body.messageId, user, body.rating, body.reasons ?? [], body.comment ?? "");

  // 同步给后端（例如 Dify），失败不影响本地记录
  const backend = getBackend();
  if (backend.feedback && owner.externalId) {
    backend.feedback({ externalMessageId: owner.externalId, rating: body.rating, user }).catch(() => {});
  }
  return Response.json({ ok: true });
}
