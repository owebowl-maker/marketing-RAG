"use client";

// 词条悬停卡片。卡片内容全部来自词条表，原样展示，不经过大模型。
import { CopyOutlined, LinkOutlined, WarningOutlined } from "@ant-design/icons";
import type { ComponentProps } from "@ant-design/x-markdown";
import { App, Button, Divider, Popover, Space, Tag, Typography } from "antd";
import type { GlossaryEntry } from "@/lib/types";
import { useGlossary } from "./GlossaryContext";

const { Text, Paragraph } = Typography;

function CopyButton({ text, label }: { text: string; label: string }) {
  const { message } = App.useApp();
  return (
    <Button
      size="small"
      icon={<CopyOutlined />}
      onClick={() => navigator.clipboard.writeText(text).then(() => message.success(`已复制${label}`))}
    >
      {label}
    </Button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 12, fontSize: 13, lineHeight: "22px" }}>
      <Text type="secondary" style={{ width: 72, flexShrink: 0 }}>
        {label}
      </Text>
      <span style={{ flex: 1, minWidth: 0 }}>{children}</span>
    </div>
  );
}

export function GlossaryCard({ entry }: { entry: GlossaryEntry }) {
  return (
    <div style={{ width: 420, maxWidth: "80vw" }}>
      <Space align="center" style={{ marginBottom: 8 }}>
        <Text strong style={{ fontSize: 16 }}>
          {entry.term}
        </Text>
        <Tag color="blue" variant="filled" style={{ marginInlineEnd: 0 }}>
          {entry.category}
        </Tag>
        <Tag color="green" variant="filled">
          已审核
        </Tag>
      </Space>

      <Paragraph style={{ background: "#f5f8ff", padding: "8px 12px", borderRadius: 6, marginBottom: 8 }}>
        {entry.short}
      </Paragraph>
      {entry.long && (
        <Paragraph type="secondary" ellipsis={{ rows: 3, expandable: true, symbol: "展开长版" }} style={{ fontSize: 13 }}>
          {entry.long}
        </Paragraph>
      )}
      {entry.english && (
        <Paragraph type="secondary" italic style={{ fontSize: 13 }}>
          {entry.english}
        </Paragraph>
      )}
      {entry.forbidden && (
        <Paragraph type="warning" style={{ fontSize: 13 }}>
          <WarningOutlined /> 避免使用：{entry.forbidden}
        </Paragraph>
      )}

      <Divider style={{ margin: "8px 0" }} />
      {entry.aliases.length > 0 && <Field label="别名">{entry.aliases.join("、")}</Field>}
      {entry.scope && <Field label="适用场景">{entry.scope}</Field>}
      {entry.dataAsOf && <Field label="数据口径">{entry.dataAsOf}</Field>}
      {(entry.version || entry.reviewedAt) && (
        <Field label="版本">
          {[entry.version, entry.reviewedAt && `审核于 ${entry.reviewedAt}`, entry.reviewer].filter(Boolean).join(" · ")}
        </Field>
      )}
      {entry.sourceUrl && (
        <Field label="来源">
          <a href={entry.sourceUrl} target="_blank" rel="noreferrer">
            <LinkOutlined /> 查看原文
          </a>
        </Field>
      )}
      {entry.materialUrl && (
        <Field label="物料">
          <a href={entry.materialUrl} target="_blank" rel="noreferrer">
            <LinkOutlined /> 下载物料
          </a>
        </Field>
      )}

      <Space style={{ marginTop: 10 }}>
        <CopyButton text={entry.short} label="短版" />
        {entry.long && <CopyButton text={entry.long} label="长版" />}
        {entry.english && <CopyButton text={entry.english} label="英文版" />}
      </Space>
    </div>
  );
}

/** XMarkdown 遇到 <gloss-term data-id="..."> 时渲染这个组件 */
export default function GlossaryTerm(props: ComponentProps) {
  const { byId } = useGlossary();
  const attribs = (props.domNode as { attribs?: Record<string, string> }).attribs ?? {};
  const id = (props as Record<string, unknown>)["data-id"] as string | undefined ?? attribs["data-id"];
  const entry = id ? byId.get(id) : undefined;
  if (!entry) return <>{props.children}</>;
  return (
    <Popover content={<GlossaryCard entry={entry} />} mouseEnterDelay={0.2} placement="top">
      <span className="gloss-term">{props.children}</span>
    </Popover>
  );
}
