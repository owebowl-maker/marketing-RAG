// 前后端共用的数据类型

/** 词条（标准表述）。字段为草案，拿到真实数据后再细化。 */
export interface GlossaryEntry {
  id: string;
  /** 词条名，用于匹配和卡片标题 */
  term: string;
  /** 别名 / 简称 / 英文名，同样参与匹配 */
  aliases: string[];
  category: string;
  /** 标准表述（短版），审核原文，原样展示 */
  short: string;
  long?: string;
  english?: string;
  scope?: string;
  forbidden?: string;
  dataAsOf?: string;
  materialUrl?: string;
  sourceUrl?: string;
  version?: string;
  reviewer?: string;
  reviewedAt?: string;
  /** 只有「已发布」会出现在前台 */
  status: string;
  owner?: string;
  updatedAt?: string;
}

export interface SourceRef {
  title: string;
  url?: string;
  /** 例如「第 3 页」 */
  location?: string;
  snippet?: string;
}

/** /api/chat 推给浏览器的流式事件，前端只认这些 */
export type ChatEvent =
  | { type: "start"; conversationId: string; userMessageId: string; assistantMessageId: string; title: string }
  | { type: "route"; label: string }
  | { type: "delta"; text: string }
  | { type: "sources"; items: SourceRef[] }
  | { type: "suggestions"; items: string[] }
  | { type: "done" }
  | { type: "error"; message: string };

export type Rating = "like" | "dislike" | null;

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  route?: string;
  sources?: SourceRef[];
  suggestions?: string[];
  status?: "loading" | "streaming" | "done" | "error" | "abort";
  rating?: Rating;
}

export interface ConversationSummary {
  id: string;
  title: string;
  updatedAt: number;
}
