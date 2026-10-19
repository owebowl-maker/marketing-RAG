"use client";

import { Button, Card, Form, Input, Typography } from "antd";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: { name: string; code: string }) => {
    setLoading(true);
    setError("");
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    setLoading(false);
    if (res.ok) {
      router.replace("/");
      router.refresh();
    } else {
      setError(await res.text());
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <Card style={{ width: 380 }} variant="borderless">
        <Typography.Title level={3} style={{ color: "#2563eb", marginTop: 0 }}>
          Marketing 知识库助手
        </Typography.Title>
        <Typography.Paragraph type="secondary">内测阶段，请输入姓名和团队口令</Typography.Paragraph>
        <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
          <Form.Item name="name" label="姓名" rules={[{ required: true, message: "请填写姓名" }]}>
            <Input placeholder="用于记录反馈，例如 张三" autoComplete="name" />
          </Form.Item>
          <Form.Item name="code" label="团队口令">
            <Input.Password placeholder="向 Marketing 同事索取" />
          </Form.Item>
          {error && <Typography.Paragraph type="danger">{error}</Typography.Paragraph>}
          <Button type="primary" htmlType="submit" block loading={loading}>
            进入
          </Button>
        </Form>
      </Card>
    </div>
  );
}
