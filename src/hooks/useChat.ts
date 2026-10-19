"use client";

// 对话状态：会话列表、当前会话的消息、发送 / 停止 / 重新生成。
// 只和自己的 /api/* 通信，不关心后端是 Mock、RAG 平台还是 Dify。
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatEvent, ChatMessage, ConversationSummary, Rating } from "@/lib/types";

async function* readEvents(res: Response): AsyncIterable<ChatEvent> {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buffer.indexOf("\n\n")) >= 0) {
      const line = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 2);
      if (line.startsWith("data:")) yield JSON.parse(line.slice(5)) as ChatEvent;
    }
  }
}

export function useChat() {
  const router = useRouter();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeId, setActiveId] = useState<string | undefined>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const activeIdRef = useRef<string | undefined>(undefined);
  activeIdRef.current = activeId;

  const refreshConversations = useCallback(async () => {
    const res = await fetch("/api/conversations");
    if (res.status === 401) {
      router.replace("/login");
      return;
    }
    if (res.ok) setConversations(await res.json());
  }, [router]);

  useEffect(() => {
    refreshConversations();
  }, [refreshConversations]);

  const openConversation = useCallback(async (id: string) => {
    abortRef.current?.abort();
    setActiveId(id);
    setMessages([]);
    const res = await fetch(`/api/conversations/${id}`);
    if (res.ok && activeIdRef.current === id) setMessages(await res.json());
  }, []);

  const newConversation = useCallback(() => {
    abortRef.current?.abort();
    setActiveId(undefined);
    setMessages([]);
  }, []);

  const patchMessage = (id: string, patch: (m: ChatMessage) => Partial<ChatMessage>) =>
    setMessages((list) => list.map((m) => (m.id === id ? { ...m, ...patch(m) } : m)));

  const send = useCallback(
    async (query: string) => {
      const text = query.trim();
      if (!text || sending) return;
      setSending(true);

      // 先放两条临时消息，拿到服务端 ID 后替换
      const tmpUser = `tmp-u-${Date.now()}`;
      let assistantId = `tmp-a-${Date.now()}`;
      setMessages((list) => [
        ...list,
        { id: tmpUser, role: "user", content: text, status: "done" },
        { id: assistantId, role: "assistant", content: "", status: "loading" },
      ]);

      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: text, conversationId: activeIdRef.current }),
          signal: controller.signal,
        });
        if (!res.ok || !res.body) throw new Error((await res.text()) || `请求失败 ${res.status}`);

        for await (const ev of readEvents(res)) {
          switch (ev.type) {
            case "start": {
              const oldAssistant = assistantId;
              assistantId = ev.assistantMessageId;
              setMessages((list) =>
                list.map((m) =>
                  m.id === tmpUser ? { ...m, id: ev.userMessageId } : m.id === oldAssistant ? { ...m, id: ev.assistantMessageId } : m,
                ),
              );
              if (!activeIdRef.current) {
                setActiveId(ev.conversationId);
                activeIdRef.current = ev.conversationId;
                refreshConversations();
              }
              break;
            }
            case "route":
              patchMessage(assistantId, () => ({ route: ev.label }));
              break;
            case "delta":
              patchMessage(assistantId, (m) => ({ content: m.content + ev.text, status: "streaming" }));
              break;
            case "sources":
              patchMessage(assistantId, () => ({ sources: ev.items }));
              break;
            case "suggestions":
              patchMessage(assistantId, () => ({ suggestions: ev.items }));
              break;
            case "done":
              patchMessage(assistantId, () => ({ status: "done" }));
              break;
            case "error":
              patchMessage(assistantId, (m) => ({ status: "error", content: m.content || `出错了：${ev.message}` }));
              break;
          }
        }
      } catch (err) {
        const aborted = controller.signal.aborted;
        patchMessage(assistantId, (m) => ({
          status: aborted ? "abort" : "error",
          content: m.content || (aborted ? "（已停止）" : `出错了：${err instanceof Error ? err.message : err}`),
        }));
      } finally {
        setMessages((list) => list.map((m) => (m.id === assistantId && m.status === "streaming" ? { ...m, status: "done" } : m)));
        setSending(false);
        abortRef.current = null;
        refreshConversations();
      }
    },
    [sending, refreshConversations],
  );

  const stop = useCallback(() => abortRef.current?.abort(), []);

  const setRating = useCallback(async (messageId: string, rating: Rating, reasons: string[] = [], comment = "") => {
    patchMessage(messageId, () => ({ rating }));
    await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageId, rating, reasons, comment }),
    });
  }, []);

  const renameConversation = useCallback(
    async (id: string, title: string) => {
      await fetch(`/api/conversations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      refreshConversations();
    },
    [refreshConversations],
  );

  const deleteConversation = useCallback(
    async (id: string) => {
      await fetch(`/api/conversations/${id}`, { method: "DELETE" });
      if (activeIdRef.current === id) newConversation();
      refreshConversations();
    },
    [newConversation, refreshConversations],
  );

  return {
    conversations,
    activeId,
    messages,
    sending,
    send,
    stop,
    setRating,
    openConversation,
    newConversation,
    renameConversation,
    deleteConversation,
  };
}
