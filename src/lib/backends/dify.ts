// Plan B：调用 Dify Chatflow 应用（Service API）。
// 文档：https://docs.dify.ai/en/api-reference/chat-messages/send-chat-message
// 需要在 Dify 应用里打开「下一步问题建议」和「引用和归属」两个开关。
//
// ⚠️ 尚未用真实的 Dify 应用联调，接入时请按实际返回微调。
import type { SourceRef } from "../types";
import type { BackendChatInput, BackendEvent, ChatBackend } from "./types";

function config() {
  const base = process.env.DIFY_API_URL?.replace(/\/$/, "");
  const key = process.env.DIFY_API_KEY;
  if (!base || !key) throw new Error("未配置 DIFY_API_URL / DIFY_API_KEY，请在 .env.local 中填写");
  return { base, headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" } };
}

/** 逐条读取 SSE 的 data: 行 */
async function* readSse(body: ReadableStream<Uint8Array>): AsyncIterable<Record<string, unknown>> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buffer.indexOf("\n\n")) >= 0) {
      const chunk = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      for (const line of chunk.split("\n")) {
        if (line.startsWith("data:")) {
          const data = line.slice(5).trim();
          if (data) yield JSON.parse(data);
        }
      }
    }
  }
}

export const difyBackend: ChatBackend = {
  name: "dify",
  async *chat({ query, externalConversationId, user, signal }: BackendChatInput): AsyncIterable<BackendEvent> {
    const { base, headers } = config();
    const res = await fetch(`${base}/chat-messages`, {
      method: "POST",
      headers,
      signal,
      body: JSON.stringify({
        inputs: {},
        query,
        response_mode: "streaming",
        conversation_id: externalConversationId ?? "",
        user,
      }),
    });
    if (!res.ok || !res.body) throw new Error(`Dify 返回错误 ${res.status}：${await res.text()}`);

    let messageId: string | undefined;
    for await (const ev of readSse(res.body)) {
      switch (ev.event) {
        case "message":
        case "agent_message":
          if (!messageId && ev.message_id) {
            messageId = String(ev.message_id);
            yield { type: "meta", externalConversationId: String(ev.conversation_id), externalMessageId: messageId };
          }
          yield { type: "delta", text: String(ev.answer ?? "") };
          break;
        case "node_started": {
          // 把「问题分类器」等节点名作为路由标签展示
          const data = ev.data as { node_type?: string; title?: string } | undefined;
          if (data?.node_type === "question-classifier" && data.title) yield { type: "route", label: data.title };
          break;
        }
        case "message_end": {
          const resources = ((ev.metadata as { retriever_resources?: Record<string, unknown>[] })?.retriever_resources ?? []);
          const items: SourceRef[] = resources.map((r) => ({
            title: String(r.document_name ?? r.dataset_name ?? "来源"),
            snippet: r.content ? String(r.content).slice(0, 120) : undefined,
          }));
          if (items.length) yield { type: "sources", items };
          break;
        }
        case "error":
          throw new Error(String(ev.message ?? "Dify 返回错误"));
      }
    }

    if (messageId) {
      const r = await fetch(`${base}/messages/${messageId}/suggested?user=${encodeURIComponent(user)}`, { headers, signal });
      if (r.ok) {
        const json = (await r.json()) as { data?: string[] };
        if (json.data?.length) yield { type: "suggestions", items: json.data.slice(0, 3) };
      }
    }
  },

  async feedback({ externalMessageId, rating, user }) {
    const { base, headers } = config();
    await fetch(`${base}/messages/${externalMessageId}/feedbacks`, {
      method: "POST",
      headers,
      body: JSON.stringify({ rating, user }),
    });
  },
};
