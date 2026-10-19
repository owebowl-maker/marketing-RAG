// 后端适配器接口。前端永远只和 /api/chat 打交道；
// 换后端（Mock / 公司 RAG 平台 / Dify）只需在 .env 里改 CHAT_BACKEND。
import type { SourceRef } from "../types";

export interface BackendChatInput {
  query: string;
  /** 本会话之前的问答（不含本次问题） */
  history: { role: "user" | "assistant"; content: string }[];
  /** 后端自己的会话 ID（如 Dify 的 conversation_id），首轮为空 */
  externalConversationId?: string;
  user: string;
  signal: AbortSignal;
}

export type BackendEvent =
  | { type: "route"; label: string }
  | { type: "delta"; text: string }
  | { type: "sources"; items: SourceRef[] }
  | { type: "suggestions"; items: string[] }
  /** 后端返回的会话 / 消息 ID，存下来供多轮对话和反馈转发使用 */
  | { type: "meta"; externalConversationId?: string; externalMessageId?: string };

export interface ChatBackend {
  name: string;
  chat(input: BackendChatInput): AsyncIterable<BackendEvent>;
  /** 可选：把点赞点踩同步给后端（Dify 支持） */
  feedback?(input: { externalMessageId: string; rating: "like" | "dislike" | null; user: string }): Promise<void>;
}
