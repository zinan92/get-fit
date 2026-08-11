import type { Metadata } from "next";
import { Noto_Sans_SC } from "next/font/google";
import "./globals.css";

const notoSans = Noto_Sans_SC({
  variable: "--font-noto-sans-sc",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "轻练 · 今日计划",
  description: "健身教练客户每日训练与饮食计划 mockup",
  openGraph: {
    title: "轻练",
    description: "今天练什么，吃什么",
    images: [{ url: "/og.png", width: 1536, height: 908, alt: "轻练今日计划界面" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "轻练",
    description: "今天练什么，吃什么",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body className={notoSans.variable}>{children}</body>
    </html>
  );
}
