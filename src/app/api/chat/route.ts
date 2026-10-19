// 对话接口：保存消息 → 调用后端适配器 → 以 SSE 把统一格式的事件推给浏览器
import { currentUser } from "@/lib/auth";
import { getBackend } from "@/lib/backends";
import {
  createConversation,
  finishMessage,
  getConversation,
  insertMessage,
  newId,
  recentHistory,
  touchConversation,
  updateConversation,
} from "@/lib/db";
import type { ChatEvent, SourceRef } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return new Response("未登录", { status: 401 });

  const body = (await req.json()) as { query?: string; conversationId?: string };
  const query = body.query?.trim();
  if (!query) return new Response("问题不能为空", { status: 400 });

  let conv = body.conversationId ? getConversation(body.conversationId, user) : null;
  if (body.conversationId && !conv) return new Response("会话不存在", { status: 404 });
  const history = conv ? recentHistory(conv.id) : [];
  if (!conv) {
    const title = query.length > 20 ? `${query.slice(0, 20)}…` : query;
    const id = createConversation(user, title);
    conv = { id, title, externalId: undefined };
  }

  const userMessageId = newId();
  const assistantMessageId = newId();
  insertMessage({ id: userMessageId, conversationId: conv.id, role: "user", content: query });
  insertMessage({ id: assistantMessageId, conversationId: conv.id, role: "assistant", content: "", status: "streaming" });
  touchConversation(conv.id);

  const encoder = new TextEncoder();
  const backend = getBackend();
  const conversation = conv;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (ev: ChatEvent) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(ev)}\n\n`));
        } catch {
          // 浏览器已断开（例如点了「停止」），忽略
        }
      };
      let content = "";
      let route: string | undefined;
      let sources: SourceRef[] | undefined;
      let suggestions: string[] | undefined;
      let externalId: string | undefined;
      let status = "done";

      send({ type: "start", conversationId: conversation.id, userMessageId, assistantMessageId, title: conversation.title });
      try {
        for await (const ev of backend.chat({
          query,
          history,
          externalConversationId: conversation.externalId,
          user,
          signal: req.signal,
        })) {
          switch (ev.type) {
            case "meta":
              if (ev.externalConversationId && ev.externalConversationId !== conversation.externalId) {
                conversation.externalId = ev.externalConversationId;
                updateConversation(conversation.id, user, { externalId: ev.externalConversationId });
              }
              if (ev.externalMessageId) externalId = ev.externalMessageId;
              break;
            case "delta":
              content += ev.text;
              send(ev);
              break;
            case "route":
              route = ev.label;
              send(ev);
              break;
            case "sources":
              sources = ev.items;
              send(ev);
              break;
            case "suggestions":
              suggestions = ev.items;
              send(ev);
              break;
          }
        }
        send({ type: "done" });
      } catch (err) {
        if (req.signal.aborted) {
          status = "abort";
        } else {
          status = "error";
          const message = err instanceof Error ? err.message : String(err);
          if (!content) content = `出错了：${message}`;
          send({ type: "error", message });
        }
      } finally {
        finishMessage(assistantMessageId, { content, route, sources, suggestions, externalId, status });
        touchConversation(conversation.id);
        try {
          controller.close();
        } catch {
          // 浏览器已断开
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
