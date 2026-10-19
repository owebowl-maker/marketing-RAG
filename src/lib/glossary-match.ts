// 词条匹配：把回答正文里出现的词条名 / 别名包成 <gloss-term data-id="..."> 标签，
// 再由 XMarkdown 的 components 渲染成悬停卡片。前后端都可以用（纯函数，无依赖）。
import type { MarkedExtension, Tokens } from "marked";
import type { GlossaryEntry } from "./types";

export const GLOSSARY_TAG = "gloss-term";

export interface GlossaryMatcher {
  /** 全局匹配用，找下一个可能的命中位置 */
  search: RegExp;
  /** 锚定在开头的匹配 */
  anchored: RegExp;
  /** 小写后的词 -> 词条 id */
  lookup: Map<string, string>;
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const isWordChar = (c: string) => /[A-Za-z0-9]/.test(c);

function termPattern(word: string): string {
  // 英文词前后不能紧挨字母数字，避免 "ours" 命中 "yours"；中文直接匹配
  const head = isWordChar(word[0]) ? "(?<![A-Za-z0-9])" : "";
  const tail = isWordChar(word[word.length - 1]) ? "(?![A-Za-z0-9])" : "";
  return head + escapeRegExp(word) + tail;
}

export function buildMatcher(entries: GlossaryEntry[]): GlossaryMatcher | null {
  const lookup = new Map<string, string>();
  for (const e of entries) {
    for (const w of [e.term, ...e.aliases]) {
      const word = w.trim();
      // 单字词太容易误命中，跳过
      if (word.length < 2) continue;
      const key = word.toLowerCase();
      if (!lookup.has(key)) lookup.set(key, e.id);
    }
  }
  if (lookup.size === 0) return null;
  // 长词优先：「示例集团官网」要先于「示例集团」被匹配
  const words = [...lookup.keys()].sort((a, b) => b.length - a.length);
  const body = words.map(termPattern).join("|");
  return {
    search: new RegExp(body, "i"),
    anchored: new RegExp(`^(?:${body})`, "i"),
    lookup,
  };
}

/** 生成给 XMarkdown `config` 用的 marked 扩展 */
export function glossaryExtension(matcher: GlossaryMatcher): MarkedExtension {
  return {
    extensions: [
      {
        name: "glossary",
        level: "inline",
        start(src: string) {
          const m = matcher.search.exec(src);
          return m ? m.index : undefined;
        },
        tokenizer(src: string) {
          // 链接文字里不再嵌套词条
          if (this.lexer.state.inLink) return undefined;
          const m = matcher.anchored.exec(src);
          if (!m) return undefined;
          const id = matcher.lookup.get(m[0].toLowerCase());
          if (!id) return undefined;
          return { type: "glossary", raw: m[0], text: m[0], id };
        },
        renderer(token: Tokens.Generic) {
          return `<${GLOSSARY_TAG} data-id="${token.id}">${escapeHtml(token.text)}</${GLOSSARY_TAG}>`;
        },
      },
    ],
  };
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** 找出一段文字里命中的词条 id（去重，按出现顺序）。后端 Mock 用它判断意图。 */
export function findTerms(text: string, matcher: GlossaryMatcher | null): string[] {
  if (!matcher) return [];
  const re = new RegExp(matcher.search.source, "gi");
  const ids: string[] = [];
  for (const m of text.matchAll(re)) {
    const id = matcher.lookup.get(m[0].toLowerCase());
    if (id && !ids.includes(id)) ids.push(id);
  }
  return ids;
}
