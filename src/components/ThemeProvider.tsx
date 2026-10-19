"use client";

// 扁平化主题：白 / 浅灰底，单一蓝色主色，几乎不用阴影（参考需求文档第 6 节）
import { XProvider } from "@ant-design/x";
import zhCN_X from "@ant-design/x/locale/zh_CN";
import { App, theme } from "antd";
import zhCN from "antd/locale/zh_CN";

export const BRAND_BLUE = "#2563eb";

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <XProvider
      locale={{ ...zhCN, ...zhCN_X }}
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: BRAND_BLUE,
          colorInfo: BRAND_BLUE,
          borderRadius: 8,
          colorBgLayout: "#f5f7fa",
          colorBorderSecondary: "#eef0f3",
          boxShadow: "none",
          boxShadowSecondary: "0 4px 16px rgba(15, 23, 42, 0.08)",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        },
        components: {
          Button: { primaryShadow: "none", defaultShadow: "none" },
        },
      }}
    >
      <App>{children}</App>
    </XProvider>
  );
}
