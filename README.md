# Marketing RAG · Marketing 知识库助手

公司 Marketing 部门的知识库问答助手。其他部门的同事可以在这里查到**最新的、已经审核通过的**对外表述，包括公司介绍、业务、基地、荣誉和合规用语。

- 回答里带虚线的词条是**审核原文**，鼠标悬停即可看到卡片，并能一键复制
- 后端可以切换：`mock`（演示数据）/ `rag`（公司 RAG 平台，Plan A）/ `dify`（Plan B），前端不用改
- 内测阶段面向 10～20 人，数据存在本地 SQLite；正式开放时交接给总部 IT

> 需求和方案见上级目录的 `需求整理-Marketing知识库问答助手.md` 和 `调研报告-PlanA与PlanB.md`。
> 词条如何实现、如何维护、数据存在哪里，见 [`docs/词条实现与维护.md`](docs/词条实现与维护.md)。
> **在 Windows 电脑上部署**，见 [`docs/Windows部署指南.md`](docs/Windows部署指南.md)（可以直接交给 AI 助手执行）。

---

## 快速开始

需要 Node.js 22.13 或更高版本（推荐 24）。

```bash
npm install
cp .env.example .env.local     # 按需填写，默认使用 mock 后端（Windows：Copy-Item .env.example .env.local）
npm run dev                    # 开发模式：http://localhost:3000
```

打开页面后输入姓名即可进入。没有设置 `ACCESS_CODE` 时不需要口令。

### 给团队内测使用（放在自己的电脑上）

```bash
npm run build
npm start                      # 监听 0.0.0.0:3000，局域网内的同事可以访问
```

同事访问 `http://<你电脑的局域网 IP>:3000`。在 macOS 上可以用 `ipconfig getifaddr en0` 查看本机 IP。

注意以下几点：
- 一定要在 `.env.local` 里设置 `ACCESS_CODE`（团队口令）和 `SESSION_SECRET`；
- 你的电脑休眠或关机后，同事就访问不了了；
- 先跟 IT 确认公司网络允许这样做。

---

## 常用命令

| 命令 | 作用 |
|---|---|
| `npm run dev` | 开发模式（改代码会自动刷新） |
| `npm run build` / `npm start` | 构建并以正式模式启动 |
| `npm run typecheck` | TypeScript 类型检查 |
| `npm run lint` | 代码规范检查 |
| `npm run glossary:import -- 文件.csv` | 把词条表 CSV 导入为 `data/glossary.json` |

---

## 目录结构

```
src/
├─ app/
│  ├─ page.tsx                 首页（对话界面）
│  ├─ login/                   登录页（姓名 + 团队口令）
│  ├─ admin/                   管理后台（反馈、最近提问、导出 CSV）
│  └─ api/
│     ├─ chat/                 对话接口：存消息 → 调后端适配器 → 用 SSE 推给浏览器
│     ├─ conversations/        会话列表、读取、重命名、删除
│     ├─ feedback/             有用 / 没用
│     ├─ glossary/             词条表（只返回「已发布」的词条）
│     └─ admin/export/         导出反馈 CSV
├─ components/
│  ├─ ChatApp.tsx              主界面：左侧会话栏 + 对话区 + 输入框
│  ├─ AnswerContent.tsx        回答渲染（Markdown + 词条）
│  ├─ FeedbackBar.tsx          有用 / 没用 / 原因弹窗
│  └─ glossary/                词条悬停卡片
├─ hooks/useChat.ts            对话状态管理（只和自己的 /api 通信）
└─ lib/
   ├─ backends/                ★ 后端适配器：mock.ts / rag.ts / dify.ts
   ├─ glossary-match.ts        ★ 词条匹配算法（长词优先、英文词边界）
   ├─ glossary.ts              读取词条表
   ├─ db.ts                    SQLite：会话、消息、反馈
   └─ auth.ts                  简易登录
data/                          数据目录（除示例文件外，不提交到 Git）
scripts/import-glossary.mjs    CSV → glossary.json
```

## 技术栈

Next.js 16（App Router）· React 19 · Ant Design 6 · [Ant Design X 2](https://x.ant.design)（对话组件）· `@ant-design/x-markdown`（流式 Markdown）· SQLite（Node 内置的 `node:sqlite`）

## 切换后端

在 `.env.local` 里设置 `CHAT_BACKEND`：

| 值 | 说明 | 状态 |
|---|---|---|
| `mock` | 用词条表拼出演示回答，不调用任何大模型 | ✅ 可用 |
| `rag` | 直连公司 RAG 平台的智能体 API（Plan A） | ⏳ 等 API 文档，见 `src/lib/backends/rag.ts` 里的待办 |
| `dify` | 调用 Dify Chatflow 应用（Plan B） | 🧪 已按官方文档写好，还没联调 |

新增或修改后端时，只需要把对方返回的数据转换成 `src/lib/backends/types.ts` 里的 `BackendEvent`。

## 交接给 IT

- `Dockerfile` 已经准备好，`data/` 目录要挂载成持久化卷；
- `src/lib/db.ts` 换成公司的数据库（MySQL / Postgres）；
- `src/lib/auth.ts` 换成公司 SSO。
