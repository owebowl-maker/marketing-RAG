"use client";

import {
  BankOutlined,
  DeleteOutlined,
  EditOutlined,
  EnvironmentOutlined,
  FileProtectOutlined,
  LogoutOutlined,
  PictureOutlined,
  PlusOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
  SettingOutlined,
  TrophyOutlined,
} from "@ant-design/icons";
import { Actions, Bubble, Conversations, Prompts, Sender, Sources, ThoughtChain, Welcome } from "@ant-design/x";
import type { BubbleItemType, ConversationItemType, PromptsItemType } from "@ant-design/x";
import { Alert, App, Avatar, Button, Input, Space, Typography } from "antd";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useChat } from "@/hooks/useChat";
import type { ChatMessage } from "@/lib/types";
import AnswerContent from "./AnswerContent";
import FeedbackBar from "./FeedbackBar";
import { GlossaryProvider, useGlossary } from "./glossary/GlossaryContext";
import { BRAND_BLUE } from "./ThemeProvider";

const { Text } = Typography;

// 首页入口卡片：点击后直接发送预设问题
const ENTRY_CARDS: (PromptsItemType & { question: string })[] = [
  { key: "intro", icon: <BankOutlined style={{ color: BRAND_BLUE }} />, label: "公司介绍", description: "一句话 / 一段话的标准介绍", question: "公司介绍的标准表述是什么？" },
  { key: "biz", icon: <FileProtectOutlined style={{ color: "#16a34a" }} />, label: "业务范围", description: "业务模式与核心能力的口径", question: "我们的业务范围怎么介绍？" },
  { key: "base", icon: <EnvironmentOutlined style={{ color: "#ea580c" }} />, label: "基地介绍", description: "各研发、生产基地的标准介绍", question: "各个基地分别怎么介绍？" },
  { key: "honor", icon: <TrophyOutlined style={{ color: "#ca8a04" }} />, label: "成绩荣誉", description: "可对外使用的奖项与资质", question: "有哪些可以对外使用的荣誉和资质？" },
  { key: "compliance", icon: <SafetyCertificateOutlined style={{ color: "#9333ea" }} />, label: "合规表述", description: "对外宣传的禁用词与注意事项", question: "对外宣传有哪些合规注意事项？" },
  { key: "material", icon: <PictureOutlined style={{ color: "#0891b2" }} />, label: "物料下载", description: "Logo、图片、PPT 模板等", question: "去哪里下载公司的标准物料？" },
];

function groupOf(ts: number) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  if (ts >= startOfToday.getTime()) return "今天";
  if (ts >= startOfToday.getTime() - 6 * 86400000) return "近 7 天";
  return "更早";
}

function ChatInner({ user, isAdmin }: { user: string; isAdmin: boolean }) {
  const router = useRouter();
  const chat = useChat();
  const { modal } = App.useApp();
  const { isSample } = useGlossary();
  const [input, setInput] = useState("");
  const [keyword, setKeyword] = useState("");

  const conversationItems = useMemo<ConversationItemType[]>(
    () =>
      chat.conversations
        .filter((c) => !keyword || c.title.includes(keyword))
        .map((c) => ({ key: c.id, label: c.title, group: groupOf(c.updatedAt) })),
    [chat.conversations, keyword],
  );

  const activeTitle = chat.conversations.find((c) => c.id === chat.activeId)?.title ?? "新对话";

  const submit = (text: string) => {
    if (!text.trim()) return;
    chat.send(text);
    setInput("");
  };

  const rename = (id: string, current: string) => {
    let value = current;
    modal.confirm({
      title: "重命名对话",
      icon: null,
      content: <Input defaultValue={current} onChange={(e) => (value = e.target.value)} maxLength={50} />,
      okText: "保存",
      cancelText: "取消",
      onOk: () => chat.renameConversation(id, value),
    });
  };

  const remove = (id: string) =>
    modal.confirm({
      title: "删除这个对话？",
      content: "删除后无法恢复。",
      okText: "删除",
      okButtonProps: { danger: true },
      cancelText: "取消",
      onOk: () => chat.deleteConversation(id),
    });

  const logout = async () => {
    await fetch("/api/logout", { method: "POST" });
    router.replace("/login");
  };

  const renderAssistant = (m: ChatMessage, index: number) => {
    const streaming = m.status === "loading" || m.status === "streaming";
    const question = chat.messages[index - 1]?.role === "user" ? chat.messages[index - 1].content : "";
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
        {m.route && (
          <ThoughtChain
            items={[
              {
                key: "route",
                title: `Marketing 助手 · ${m.route}`,
                status: streaming ? "loading" : m.status === "error" ? "error" : "success",
              },
            ]}
          />
        )}
        {m.content ? (
          <AnswerContent content={m.content} streaming={streaming} />
        ) : (
          streaming && <Text type="secondary">正在检索已审核的资料…</Text>
        )}
        {m.sources && m.sources.length > 0 && (
          <Sources
            title={`信息来源（${m.sources.length}）`}
            items={m.sources.map((s, i) => ({
              key: i,
              title: s.location ? `${s.title} · ${s.location}` : s.title,
              url: s.url,
              description: s.snippet,
            }))}
          />
        )}
        {!streaming && m.status !== "error" && m.content && (
          <Text type="secondary" style={{ fontSize: 12 }}>
            标注「审核原文」及带虚线的词条可直接对外使用；其余内容为 AI 归纳，对外使用前请联系 Marketing 确认。
          </Text>
        )}
        {!streaming && m.suggestions && m.suggestions.length > 0 && (
          <Prompts
            title={<Text type="secondary" style={{ fontSize: 12 }}>继续探索：</Text>}
            items={m.suggestions.map((s, i) => ({ key: String(i), description: s }))}
            onItemClick={({ data }) => submit(String(data.description))}
            wrap
            styles={{ item: { padding: "4px 12px" } }}
          />
        )}
        {!streaming && m.content && (
          <Space size={8} wrap>
            <FeedbackBar rating={m.rating} onChange={(r, reasons, comment) => chat.setRating(m.id, r, reasons, comment)} />
            <Actions
              items={[
                { key: "copy", label: "复制", actionRender: <Actions.Copy text={m.content} /> },
                { key: "retry", label: "重新生成", icon: <ReloadOutlined />, onItemClick: () => question && submit(question) },
              ]}
            />
          </Space>
        )}
      </div>
    );
  };

  const bubbleItems: BubbleItemType[] = chat.messages.map((m, i) =>
    m.role === "user"
      ? { key: m.id, role: "user", content: m.content }
      : {
          key: m.id,
          role: "ai",
          content: m.content,
          contentRender: () => renderAssistant(m, i),
        },
  );

  return (
    <div style={{ display: "flex", height: "100vh", background: "#f5f7fa" }}>
      {/* ---------- 左侧会话栏 ---------- */}
      <aside
        style={{
          width: 264,
          flexShrink: 0,
          background: "#fff",
          borderRight: "1px solid #eef0f3",
          display: "flex",
          flexDirection: "column",
          padding: "16px 12px",
          gap: 12,
        }}
      >
        <Space align="center" style={{ padding: "0 4px" }}>
          <Avatar shape="square" style={{ background: BRAND_BLUE }}>
            M
          </Avatar>
          <div>
            <div style={{ fontWeight: 600, lineHeight: "18px" }}>Marketing 知识库助手</div>
            <Text type="secondary" style={{ fontSize: 11 }}>
              Marketing Knowledge Assistant
            </Text>
          </div>
        </Space>
        <Button icon={<PlusOutlined />} block onClick={chat.newConversation}>
          新建对话
        </Button>
        <Input
          allowClear
          prefix={<SearchOutlined style={{ color: "#9ca3af" }} />}
          placeholder="搜索对话…"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          variant="filled"
        />
        <div style={{ flex: 1, overflowY: "auto", margin: "0 -4px" }}>
          <Conversations
            items={conversationItems}
            activeKey={chat.activeId}
            onActiveChange={(key) => chat.openConversation(String(key))}
            groupable
            menu={(conv) => ({
              items: [
                { key: "rename", label: "重命名", icon: <EditOutlined /> },
                { key: "delete", label: "删除", icon: <DeleteOutlined />, danger: true },
              ],
              onClick: ({ key, domEvent }) => {
                domEvent.stopPropagation();
                if (key === "rename") rename(conv.key, String(conv.label));
                if (key === "delete") remove(conv.key);
              },
            })}
          />
          {conversationItems.length === 0 && (
            <Text type="secondary" style={{ display: "block", textAlign: "center", fontSize: 12, marginTop: 24 }}>
              {keyword ? "没有匹配的对话" : "— 还没有对话 —"}
            </Text>
          )}
        </div>
        <div style={{ borderTop: "1px solid #eef0f3", paddingTop: 12, display: "flex", alignItems: "center", gap: 8 }}>
          <Avatar size="small" style={{ background: "#dbeafe", color: BRAND_BLUE }}>
            {user.slice(0, 1)}
          </Avatar>
          <Text ellipsis style={{ flex: 1 }}>
            {user}
          </Text>
          {isAdmin && (
            <Button type="text" size="small" icon={<SettingOutlined />} href="/admin" title="管理后台" />
          )}
          <Button type="text" size="small" icon={<LogoutOutlined />} onClick={logout} title="退出" />
        </div>
      </aside>

      {/* ---------- 主区域 ---------- */}
      <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <header
          style={{
            height: 56,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            padding: "0 24px",
            background: "#fff",
            borderBottom: "1px solid #eef0f3",
            fontWeight: 500,
          }}
        >
          {chat.messages.length > 0 ? activeTitle : "首页"}
        </header>

        {isSample && (
          <Alert
            banner
            type="info"
            message="当前使用的是示例词条（data/glossary.sample.json）。把审核后的词条导入 data/glossary.json 后，这条提示会消失。"
          />
        )}

        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
          {chat.messages.length === 0 ? (
            <div style={{ flex: 1, overflowY: "auto", padding: "48px 24px" }}>
              <div style={{ maxWidth: 880, margin: "0 auto" }}>
                <Welcome
                  variant="borderless"
                  title={<span style={{ color: BRAND_BLUE, fontSize: 28 }}>Marketing 知识库助手</span>}
                  description="查询已审核通过的公司介绍、业务、基地、荣誉与合规表述。带虚线的词条为审核原文，悬停可查看并复制。"
                  styles={{ root: { justifyContent: "center", textAlign: "center", marginBottom: 32 } }}
                />
                <Prompts
                  title={<Text strong>选择一个主题开始</Text>}
                  items={ENTRY_CARDS}
                  wrap
                  onItemClick={({ data }) => submit(ENTRY_CARDS.find((c) => c.key === data.key)!.question)}
                  styles={{
                    list: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 },
                    item: { background: "#fff", border: "1px solid #eef0f3", padding: "16px 18px" },
                  }}
                />
              </div>
            </div>
          ) : (
            <Bubble.List
              style={{ flex: 1, minHeight: 0 }}
              styles={{ scroll: { padding: "24px max(24px, calc((100% - 880px) / 2))" } }}
              items={bubbleItems}
              role={{
                user: { placement: "end", variant: "filled" },
                ai: {
                  placement: "start",
                  variant: "borderless",
                  avatar: <Avatar style={{ background: BRAND_BLUE }}>M</Avatar>,
                  styles: { content: { width: "100%" } },
                },
              }}
            />
          )}
        </div>

        <div style={{ padding: "12px 24px 8px", background: "#f5f7fa" }}>
          <div style={{ maxWidth: 880, margin: "0 auto" }}>
            <Sender
              value={input}
              onChange={setInput}
              onSubmit={submit}
              onCancel={chat.stop}
              loading={chat.sending}
              placeholder="请输入问题（Enter 发送，Shift+Enter 换行）"
              autoSize={{ minRows: 2, maxRows: 6 }}
              style={{ background: "#fff" }}
            />
            <Text type="secondary" style={{ display: "block", textAlign: "center", fontSize: 12, marginTop: 6 }}>
              内容由 AI 辅助生成，仅「审核原文」可直接对外使用；如有疑问请联系 Marketing 部门。
            </Text>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function ChatApp(props: { user: string; isAdmin: boolean }) {
  return (
    <GlossaryProvider>
      <ChatInner {...props} />
    </GlossaryProvider>
  );
}
