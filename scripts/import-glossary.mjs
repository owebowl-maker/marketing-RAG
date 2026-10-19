// 把 Excel / 在线表格导出的 CSV（UTF-8）转换成 data/glossary.json
// 用法：npm run glossary:import -- 路径/词条表.csv
// 表头必须和 data/glossary-template.csv 一致（中文列名）。
import fs from "node:fs";
import path from "node:path";

const COLUMNS = {
  词条ID: "id",
  词条名: "term",
  "别名（用|分隔）": "aliases",
  分类: "category",
  "标准表述-短版": "short",
  "标准表述-长版": "long",
  英文表述: "english",
  适用场景: "scope",
  "禁用/易错表述": "forbidden",
  数据口径与截止时间: "dataAsOf",
  物料链接: "materialUrl",
  来源链接: "sourceUrl",
  版本号: "version",
  审核人: "reviewer",
  审核日期: "reviewedAt",
  状态: "status",
  负责人: "owner",
  更新时间: "updatedAt",
};
const REQUIRED = ["id", "term", "category", "short", "status"];

/** 支持引号、引号内逗号和换行的 CSV 解析 */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((v) => v.trim() !== ""));
}

const input = process.argv[2];
if (!input) {
  console.error("用法：npm run glossary:import -- 路径/词条表.csv");
  process.exit(1);
}

const text = fs.readFileSync(input, "utf8").replace(/^﻿/, "");
const [header, ...rows] = parseCsv(text);
const keys = header.map((h) => COLUMNS[h.trim()]);
const unknown = header.filter((h, i) => !keys[i]);
if (unknown.length) console.warn(`⚠️ 忽略无法识别的列：${unknown.join("、")}`);

const errors = [];
const seen = new Set();
const entries = rows.map((r, idx) => {
  const e = {};
  keys.forEach((k, i) => {
    if (k) e[k] = (r[i] ?? "").trim();
  });
  e.aliases = (e.aliases ?? "").split("|").map((s) => s.trim()).filter(Boolean);
  const line = idx + 2;
  for (const f of REQUIRED) if (!e[f]) errors.push(`第 ${line} 行缺少「${Object.keys(COLUMNS).find((k) => COLUMNS[k] === f)}」`);
  if (e.id && seen.has(e.id)) errors.push(`第 ${line} 行词条ID重复：${e.id}`);
  seen.add(e.id);
  for (const k of Object.keys(e)) if (e[k] === "") delete e[k];
  return e;
});

if (errors.length) {
  console.error("❌ 导入失败，请修正后重试：\n" + errors.join("\n"));
  process.exit(1);
}

const out = path.join(process.cwd(), "data", "glossary.json");
fs.writeFileSync(out, JSON.stringify(entries, null, 2) + "\n");
const published = entries.filter((e) => e.status === "已发布").length;
console.log(`✅ 已导入 ${entries.length} 条词条（其中已发布 ${published} 条）→ ${out}`);
console.log("   服务会自动读取新文件，无需重启。");
