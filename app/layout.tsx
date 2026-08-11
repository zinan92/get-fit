import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "轻练 · 今日计划",
  description: "健身教练客户每日训练与饮食计划 mockup",
  openGraph: {
    title: "轻练",
    description: "今天练什么，吃什么",
    images: [{ url: "/og.webp", width: 1536, height: 908, alt: "轻练今日计划界面" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "轻练",
    description: "今天练什么，吃什么",
    images: ["/og.webp"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
