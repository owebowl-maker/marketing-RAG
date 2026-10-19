"use client";

// 简易管理页：看反馈、看大家在问什么。数据来自本地 SQLite。
import { ArrowLeftOutlined, DownloadOutlined } from "@ant-design/icons";
import { Button, Card, Space, Statistic, Table, Tabs, Tag, Typography } from "antd";
import type { FeedbackRow } from "@/lib/db";

interface QuestionRow {
  question: string;
  createdAt: number;
  user: string;
  route: string;
  status: string;
}

const fmt = (ts: number) => new Date(ts).toLocaleString("zh-CN", { hour12: false });

export default function AdminView({
  feedback,
  questions,
  glossaryCount,
  glossaryIsSample,
  backend,
}: {
  feedback: FeedbackRow[];
  questions: QuestionRow[];
  glossaryCount: number;
  glossaryIsSample: boolean;
  backend: string;
}) {
  const dislikes = feedback.filter((f) => f.rating === "dislike").length;
  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
      <Space style={{ display: "flex", marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} href="/">
          返回对话
        </Button>
        <Typography.Title level={4} style={{ margin: 0 }}>
          管理后台
        </Typography.Title>
      </Space>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 16 }}>
        <Card size="small" variant="borderless"><Statistic title="最近提问数" value={questions.length} /></Card>
        <Card size="small" variant="borderless"><Statistic title="反馈数" value={feedback.length} /></Card>
        <Card size="small" variant="borderless"><Statistic title="「没用」反馈" value={dislikes} valueStyle={{ color: dislikes ? "#dc2626" : undefined }} /></Card>
        <Card size="small" variant="borderless">
          <Statistic title={glossaryIsSample ? "已发布词条（示例）" : "已发布词条"} value={glossaryCount} />
        </Card>
        <Card size="small" variant="borderless"><Statistic title="当前后端" value={backend} /></Card>
      </div>

      <Card variant="borderless">
        <Tabs
          items={[
            {
              key: "feedback",
              label: "用户反馈",
              children: (
                <>
                  <Button icon={<DownloadOutlined />} href="/api/admin/export" style={{ marginBottom: 12 }}>
                    导出 CSV
                  </Button>
                  <Table<FeedbackRow>
                    rowKey="messageId"
                    size="small"
                    dataSource={feedback}
                    pagination={{ pageSize: 20 }}
                    columns={[
                      { title: "时间", dataIndex: "updatedAt", width: 170, render: fmt },
                      { title: "用户", dataIndex: "user", width: 90 },
                      {
                        title: "评价",
                        dataIndex: "rating",
                        width: 80,
                        render: (r: string) => (r === "like" ? <Tag color="green">有用</Tag> : <Tag color="red">没用</Tag>),
                      },
                      { title: "原因", dataIndex: "reasons", width: 160, render: (r: string[]) => r.join("、") },
                      { title: "补充说明", dataIndex: "comment", width: 200 },
                      { title: "问题", dataIndex: "question", ellipsis: true },
                      {
                        title: "回答",
                        dataIndex: "answer",
                        ellipsis: true,
                        render: (a: string) => <Typography.Text title={a}>{a.slice(0, 80)}</Typography.Text>,
                      },
                    ]}
                  />
                </>
              ),
            },
            {
              key: "questions",
              label: "最近提问",
              children: (
                <Table<QuestionRow>
                  rowKey={(r) => `${r.createdAt}-${r.user}-${r.question}`}
                  size="small"
                  dataSource={questions}
                  pagination={{ pageSize: 20 }}
                  columns={[
                    { title: "时间", dataIndex: "createdAt", width: 170, render: fmt },
                    { title: "用户", dataIndex: "user", width: 90 },
                    { title: "问题", dataIndex: "question" },
                    { title: "意图", dataIndex: "route", width: 130 },
                    {
                      title: "状态",
                      dataIndex: "status",
                      width: 90,
                      render: (s: string) => (s === "error" ? <Tag color="red">出错</Tag> : s === "abort" ? <Tag>已停止</Tag> : <Tag color="blue">完成</Tag>),
                    },
                  ]}
                />
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
