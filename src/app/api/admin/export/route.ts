// 导出反馈为 CSV（Excel 可直接打开）
import { currentUser, isAdmin } from "@/lib/auth";
import { listFeedback } from "@/lib/db";

export const runtime = "nodejs";

const cell = (v: string) => `"${v.replace(/"/g, '""')}"`;

export async function GET() {
  const user = await currentUser();
  if (!user || !isAdmin(user)) return new Response("无权限", { status: 403 });
  const rows = listFeedback();
  const header = ["时间", "用户", "评价", "原因", "补充说明", "问题", "回答"];
  const lines = rows.map((r) =>
    [
      new Date(r.updatedAt).toLocaleString("zh-CN"),
      r.user,
      r.rating === "like" ? "有用" : "没用",
      r.reasons.join("、"),
      r.comment,
      r.question,
      r.answer,
    ]
      .map(cell)
      .join(","),
  );
  // 开头的 BOM 让 Excel 正确识别中文
  const csv = "﻿" + [header.map(cell).join(","), ...lines].join("\r\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="feedback-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
