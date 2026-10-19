"use client";

// 有用 / 没用。点「没用」时弹窗收集原因；反馈后显示「感谢您的反馈 · 修改 · 撤销」。
import { DislikeOutlined, LikeOutlined } from "@ant-design/icons";
import { Button, Checkbox, Input, Modal, Space, Typography } from "antd";
import { useState } from "react";
import type { Rating } from "@/lib/types";

const REASONS = ["答非所问", "内容过时", "内容不完整", "表述不规范", "没有找到来源", "其他"];

export default function FeedbackBar({
  rating,
  onChange,
}: {
  rating?: Rating;
  onChange: (rating: Rating, reasons?: string[], comment?: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [reasons, setReasons] = useState<string[]>([]);
  const [comment, setComment] = useState("");

  const submitDislike = () => {
    onChange("dislike", reasons, comment);
    setOpen(false);
  };

  return (
    <Space size={4} wrap>
      <Button
        size="small"
        type={rating === "like" ? "primary" : "default"}
        ghost={rating === "like"}
        icon={<LikeOutlined />}
        onClick={() => onChange(rating === "like" ? null : "like")}
      >
        有用
      </Button>
      <Button
        size="small"
        danger={rating === "dislike"}
        icon={<DislikeOutlined />}
        onClick={() => (rating === "dislike" ? onChange(null) : setOpen(true))}
      >
        没用
      </Button>
      {rating && (
        <Typography.Text type="secondary" style={{ fontSize: 12, marginLeft: 4 }}>
          感谢您的反馈 ·{" "}
          <Typography.Link style={{ fontSize: 12 }} onClick={() => setOpen(true)}>
            修改
          </Typography.Link>{" "}
          ·{" "}
          <Typography.Link type="danger" style={{ fontSize: 12 }} onClick={() => onChange(null)}>
            撤销
          </Typography.Link>
        </Typography.Text>
      )}

      <Modal title="哪里没帮到你？" open={open} onOk={submitDislike} onCancel={() => setOpen(false)} okText="提交" cancelText="取消">
        <Checkbox.Group options={REASONS} value={reasons} onChange={(v) => setReasons(v as string[])} />
        <Input.TextArea
          style={{ marginTop: 12 }}
          rows={3}
          placeholder="可以补充说明，例如正确的表述应该是什么（选填）"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </Modal>
    </Space>
  );
}
