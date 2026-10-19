import { checkAccessCode, encodeSession, SESSION_COOKIE } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { name, code } = (await req.json()) as { name?: string; code?: string };
  const user = name?.trim();
  if (!user) return new Response("请填写姓名", { status: 400 });
  if (!checkAccessCode(code ?? "")) return new Response("团队口令不正确", { status: 403 });

  const res = Response.json({ ok: true });
  res.headers.append(
    "Set-Cookie",
    `${SESSION_COOKIE}=${encodeSession(user.slice(0, 40))}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`,
  );
  return res;
}
