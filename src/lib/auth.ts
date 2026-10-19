// 内测阶段的简易登录：姓名 + 团队口令（.env.local 里的 ACCESS_CODE）。
// Cookie 用 HMAC 签名，防止被随意伪造。正式开放时由 IT 换成公司 SSO。
import crypto from "node:crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "mrag_session";

function secret() {
  return process.env.SESSION_SECRET || process.env.ACCESS_CODE || "marketing-rag-dev-secret";
}

function sign(value: string) {
  return crypto.createHmac("sha256", secret()).update(value).digest("base64url");
}

export function encodeSession(user: string) {
  const value = Buffer.from(user, "utf8").toString("base64url");
  return `${value}.${sign(value)}`;
}

function decodeSession(raw: string | undefined): string | null {
  if (!raw) return null;
  const [value, sig] = raw.split(".");
  if (!value || !sig) return null;
  const expected = sign(value);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  return Buffer.from(value, "base64url").toString("utf8");
}

export async function currentUser(): Promise<string | null> {
  const store = await cookies();
  return decodeSession(store.get(SESSION_COOKIE)?.value);
}

export function checkAccessCode(code: string) {
  const expected = process.env.ACCESS_CODE;
  // 未设置口令时（本机开发）不校验
  return !expected || code === expected;
}

export function isAdmin(user: string) {
  const admins = (process.env.ADMIN_USERS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  // 未设置管理员名单时，所有登录用户都能看管理页（内测阶段）
  return admins.length === 0 || admins.includes(user);
}
