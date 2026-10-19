import { difyBackend } from "./dify";
import { mockBackend } from "./mock";
import { ragBackend } from "./rag";
import type { ChatBackend } from "./types";

const backends: Record<string, ChatBackend> = {
  mock: mockBackend,
  rag: ragBackend,
  dify: difyBackend,
};

/** 由 .env.local 里的 CHAT_BACKEND 决定：mock | rag | dify，默认 mock */
export function getBackend(): ChatBackend {
  const name = process.env.CHAT_BACKEND ?? "mock";
  const backend = backends[name];
  if (!backend) throw new Error(`未知的 CHAT_BACKEND：${name}（可选 mock / rag / dify）`);
  return backend;
}
