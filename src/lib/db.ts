// 本地数据库：SQLite 单文件（data/app.db），存会话、消息、反馈。
// 10~20 人内测足够；交接给 IT 时可整体换成 MySQL / Postgres，只需改这个文件。
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { ChatMessage, ConversationSummary, Rating, SourceRef } from "./types";

const DB_FILE = path.join(process.cwd(), "data", "app.db");

const globalForDb = globalThis as unknown as { __mragDb?: DatabaseSync };

function db(): DatabaseSync {
  if (globalForDb.__mragDb) return globalForDb.__mragDb;
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
  const d = new DatabaseSync(DB_FILE);
  d.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      user TEXT NOT NULL,
      title TEXT NOT NULL,
      external_id TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      route TEXT,
      sources TEXT,
      suggestions TEXT,
      external_id TEXT,
      status TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id, created_at);
    CREATE TABLE IF NOT EXISTS feedback (
      message_id TEXT PRIMARY KEY REFERENCES messages(id) ON DELETE CASCADE,
      user TEXT NOT NULL,
      rating TEXT NOT NULL,
      reasons TEXT,
      comment TEXT,
      updated_at INTEGER NOT NULL
    );
  `);
  globalForDb.__mragDb = d;
  return d;
}

export const newId = () => crypto.randomUUID();

// ---------- 会话 ----------

export function listConversations(user: string): ConversationSummary[] {
  return db()
    .prepare("SELECT id, title, updated_at FROM conversations WHERE user = ? ORDER BY updated_at DESC LIMIT 200")
    .all(user)
    .map((r) => ({ id: String(r.id), title: String(r.title), updatedAt: Number(r.updated_at) }));
}

export function getConversation(id: string, user: string) {
  const r = db().prepare("SELECT id, title, external_id FROM conversations WHERE id = ? AND user = ?").get(id, user);
  return r ? { id: String(r.id), title: String(r.title), externalId: (r.external_id as string | null) ?? undefined } : null;
}

export function createConversation(user: string, title: string): string {
  const id = newId();
  const now = Date.now();
  db().prepare("INSERT INTO conversations (id, user, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)").run(id, user, title, now, now);
  return id;
}

export function updateConversation(id: string, user: string, fields: { title?: string; externalId?: string }) {
  const d = db();
  if (fields.title !== undefined) d.prepare("UPDATE conversations SET title = ? WHERE id = ? AND user = ?").run(fields.title, id, user);
  if (fields.externalId !== undefined)
    d.prepare("UPDATE conversations SET external_id = ? WHERE id = ? AND user = ?").run(fields.externalId, id, user);
}

export function touchConversation(id: string) {
  db().prepare("UPDATE conversations SET updated_at = ? WHERE id = ?").run(Date.now(), id);
}

export function deleteConversation(id: string, user: string) {
  const d = db();
  d.prepare("DELETE FROM feedback WHERE message_id IN (SELECT id FROM messages WHERE conversation_id = ?)").run(id);
  d.prepare("DELETE FROM messages WHERE conversation_id = ?").run(id);
  d.prepare("DELETE FROM conversations WHERE id = ? AND user = ?").run(id, user);
}

// ---------- 消息 ----------

export function insertMessage(m: { id: string; conversationId: string; role: "user" | "assistant"; content: string; status?: string }) {
  db()
    .prepare("INSERT INTO messages (id, conversation_id, role, content, status, created_at) VALUES (?, ?, ?, ?, ?, ?)")
    .run(m.id, m.conversationId, m.role, m.content, m.status ?? "done", Date.now());
}

export function finishMessage(
  id: string,
  m: { content: string; route?: string; sources?: SourceRef[]; suggestions?: string[]; externalId?: string; status: string },
) {
  db()
    .prepare("UPDATE messages SET content = ?, route = ?, sources = ?, suggestions = ?, external_id = ?, status = ? WHERE id = ?")
    .run(
      m.content,
      m.route ?? null,
      m.sources ? JSON.stringify(m.sources) : null,
      m.suggestions ? JSON.stringify(m.suggestions) : null,
      m.externalId ?? null,
      m.status,
      id,
    );
}

export function listMessages(conversationId: string): ChatMessage[] {
  return db()
    .prepare(
      `SELECT m.*, f.rating FROM messages m LEFT JOIN feedback f ON f.message_id = m.id
       WHERE m.conversation_id = ? ORDER BY m.created_at ASC, m.rowid ASC`,
    )
    .all(conversationId)
    .map((r) => ({
      id: String(r.id),
      role: r.role as ChatMessage["role"],
      content: String(r.content),
      route: (r.route as string | null) ?? undefined,
      sources: r.sources ? JSON.parse(String(r.sources)) : undefined,
      suggestions: r.suggestions ? JSON.parse(String(r.suggestions)) : undefined,
      status: (r.status as ChatMessage["status"]) ?? "done",
      rating: (r.rating as Rating) ?? null,
    }));
}

/** 给后端适配器用的历史（只取最近几轮，控制长度） */
export function recentHistory(conversationId: string, limit = 10) {
  return listMessages(conversationId)
    .filter((m) => m.status === "done")
    .slice(-limit)
    .map((m) => ({ role: m.role, content: m.content }));
}

export function getMessageOwner(messageId: string) {
  const r = db()
    .prepare(
      "SELECT c.user, m.external_id FROM messages m JOIN conversations c ON c.id = m.conversation_id WHERE m.id = ?",
    )
    .get(messageId);
  return r ? { user: String(r.user), externalId: (r.external_id as string | null) ?? undefined } : null;
}

// ---------- 反馈 ----------

export function saveFeedback(messageId: string, user: string, rating: Rating, reasons: string[], comment: string) {
  const d = db();
  if (rating === null) {
    d.prepare("DELETE FROM feedback WHERE message_id = ?").run(messageId);
    return;
  }
  d.prepare(
    `INSERT INTO feedback (message_id, user, rating, reasons, comment, updated_at) VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(message_id) DO UPDATE SET rating = excluded.rating, reasons = excluded.reasons,
       comment = excluded.comment, updated_at = excluded.updated_at`,
  ).run(messageId, user, rating, JSON.stringify(reasons), comment, Date.now());
}

export interface FeedbackRow {
  messageId: string;
  user: string;
  rating: string;
  reasons: string[];
  comment: string;
  updatedAt: number;
  question: string;
  answer: string;
}

/** 管理页：所有反馈，附带对应的问题和回答 */
export function listFeedback(): FeedbackRow[] {
  return db()
    .prepare(
      `SELECT f.*, a.content AS answer,
         (SELECT q.content FROM messages q WHERE q.conversation_id = a.conversation_id AND q.role = 'user'
            AND q.created_at <= a.created_at ORDER BY q.created_at DESC, q.rowid DESC LIMIT 1) AS question
       FROM feedback f JOIN messages a ON a.id = f.message_id ORDER BY f.updated_at DESC`,
    )
    .all()
    .map((r) => ({
      messageId: String(r.message_id),
      user: String(r.user),
      rating: String(r.rating),
      reasons: r.reasons ? JSON.parse(String(r.reasons)) : [],
      comment: String(r.comment ?? ""),
      updatedAt: Number(r.updated_at),
      question: String(r.question ?? ""),
      answer: String(r.answer),
    }));
}

/** 管理页：最近的问答记录 */
export function listRecentQuestions(limit = 200) {
  return db()
    .prepare(
      `SELECT q.content AS question, q.created_at, c.user, a.route, a.status
       FROM messages q JOIN conversations c ON c.id = q.conversation_id
       LEFT JOIN messages a ON a.id = (SELECT id FROM messages WHERE conversation_id = q.conversation_id
         AND role = 'assistant' AND created_at >= q.created_at ORDER BY created_at ASC, rowid ASC LIMIT 1)
       WHERE q.role = 'user' ORDER BY q.created_at DESC LIMIT ?`,
    )
    .all(limit)
    .map((r) => ({
      question: String(r.question),
      createdAt: Number(r.created_at),
      user: String(r.user),
      route: (r.route as string | null) ?? "",
      status: (r.status as string | null) ?? "",
    }));
}
