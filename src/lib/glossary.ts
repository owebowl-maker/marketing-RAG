// 服务端读取词条表。正式数据放 data/glossary.json（不提交到 Git），
// 没有时回退到 data/glossary.sample.json（示例数据）。
import fs from "node:fs";
import path from "node:path";
import { buildMatcher, type GlossaryMatcher } from "./glossary-match";
import type { GlossaryEntry } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const PUBLISHED = "已发布";

let cache: { mtime: number; file: string; entries: GlossaryEntry[]; matcher: GlossaryMatcher | null } | null = null;

function resolveFile() {
  const real = path.join(DATA_DIR, "glossary.json");
  return fs.existsSync(real) ? real : path.join(DATA_DIR, "glossary.sample.json");
}

/** 读取已发布的词条。文件被修改后自动重新加载，不用重启服务。 */
export function loadGlossary(): { entries: GlossaryEntry[]; matcher: GlossaryMatcher | null; isSample: boolean } {
  const file = resolveFile();
  const mtime = fs.statSync(file).mtimeMs;
  if (!cache || cache.file !== file || cache.mtime !== mtime) {
    const all = JSON.parse(fs.readFileSync(file, "utf8")) as GlossaryEntry[];
    const entries = all.filter((e) => e.status === PUBLISHED);
    cache = { mtime, file, entries, matcher: buildMatcher(entries) };
  }
  return { entries: cache.entries, matcher: cache.matcher, isSample: file.endsWith("sample.json") };
}
