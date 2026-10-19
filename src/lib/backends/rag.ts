// Plan A：直连公司 RAG 平台的智能体 API。
//
// ⚠️ 待办：拿到平台 API 文档后实现。需要确认：
//   1. 请求地址、鉴权方式（Header 里放什么）
//   2. 如何传会话 ID / 历史消息（多轮）
//   3. 流式输出的格式（SSE？每个事件的字段）
//   4. 引用（文件名、链接、页码）在返回里的位置
//   5. 推荐追问：在平台上另配一个「只用提示词」的智能体（RAG_SUGGEST_AGENT_ID），
//      把「问题 + 回答」发给它，让它返回 3 个追问
//
// 实现时只需要把平台返回的数据转换成 BackendEvent（见 ./types.ts），前端无需改动。
import type { BackendChatInput, BackendEvent, ChatBackend } from "./types";

export const ragBackend: ChatBackend = {
  name: "rag",
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async *chat(input: BackendChatInput): AsyncIterable<BackendEvent> {
    if (!process.env.RAG_API_URL || !process.env.RAG_API_KEY) {
      throw new Error("未配置 RAG_API_URL / RAG_API_KEY，请在 .env.local 中填写");
    }
    throw new Error("公司 RAG 平台适配器尚未实现（等待 API 文档），请先使用 CHAT_BACKEND=mock");
  },
};
