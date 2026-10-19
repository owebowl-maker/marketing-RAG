// Mock 后端：不调用任何大模型，用词条表拼出演示回答。
// 作用：在拿到公司 RAG 平台 API 之前，把整个界面和交互跑通。
import { findTerms } from "../glossary-match";
import { loadGlossary } from "../glossary";
import type { GlossaryEntry } from "../types";
import type { BackendChatInput, BackendEvent, ChatBackend } from "./types";

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(t);
      reject(new DOMException("aborted", "AbortError"));
    });
  });

function quote(text: string) {
  return text
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");
}

function buildAnswer(query: string, hits: GlossaryEntry[], entries: GlossaryEntry[]): string {
  if (hits.length > 0) {
    const parts = hits.map((e) => {
      const lines = [`### ${e.term}`, "", "**【审核原文 · 可直接对外使用】**", "", quote(e.short)];
      if (e.english) lines.push("", "英文版：", "", quote(e.english));
      const meta = [e.version && `版本 ${e.version}`, e.reviewedAt && `审核日期 ${e.reviewedAt}`, e.dataAsOf && `数据截至 ${e.dataAsOf}`]
        .filter(Boolean)
        .join(" · ");
      if (meta) lines.push("", `<small>${meta}</small>`);
      if (e.forbidden) lines.push("", `⚠️ 注意避免：${e.forbidden}`);
      return lines.join("\n");
    });
    return [
      `为你找到 ${hits.length} 条已审核的标准表述。将鼠标悬停在带虚线的词条上可以查看完整卡片并一键复制。`,
      "",
      ...parts,
      "",
      "---",
      "（当前为 **Mock 演示模式**，以上内容来自词条表；接入公司 RAG 平台后，这里会结合知识库原文作答。）",
    ].join("\n");
  }

  const examples = entries.slice(0, 3).map((e) => e.term).join("、");
  return [
    `你问的是：「${query}」。`,
    "",
    "当前为 **Mock 演示模式**，还没有接入公司 RAG 平台，所以暂时无法回答词条表以外的问题。",
    "",
    examples ? `你可以试试询问这些已收录的词条：${examples}。` : "词条表里还没有已发布的词条。",
    "",
    "> 正式版中，如果知识库里也找不到答案，系统会明确告诉你「未找到已审核的表述」，并引导你联系 Marketing 部门，而不会自行编造。",
  ].join("\n");
}

export const mockBackend: ChatBackend = {
  name: "mock",
  async *chat({ query, signal }: BackendChatInput): AsyncIterable<BackendEvent> {
    const { entries, matcher } = loadGlossary();
    const ids = findTerms(query, matcher);
    const hits = ids.map((id) => entries.find((e) => e.id === id)!).filter(Boolean);

    await sleep(300, signal);
    yield { type: "route", label: hits.length > 0 ? "标准表述查询" : "通用问答" };

    const answer = buildAnswer(query, hits, entries);
    // 模拟流式输出：每次吐出几个字
    for (let i = 0; i < answer.length; i += 6) {
      await sleep(25, signal);
      yield { type: "delta", text: answer.slice(i, i + 6) };
    }

    const sources = hits
      .filter((e) => e.sourceUrl)
      .map((e) => ({ title: `${e.term}（${e.category}）`, url: e.sourceUrl, location: e.version }));
    if (sources.length > 0) yield { type: "sources", items: sources };

    const others = entries.filter((e) => !ids.includes(e.id)).slice(0, 2);
    yield {
      type: "suggestions",
      items: [
        ...(hits[0] ? [`${hits[0].term}的英文表述是什么？`] : []),
        ...others.map((e) => `「${e.term}」的标准表述是什么？`),
      ].slice(0, 3),
    };
  },
};
