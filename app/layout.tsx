import type { Metadata } from "next";
import "./globals.css";
import "./redesign.css";
import "./product-detail.css";
import "./community.css";
import "./cute/core.css";
import "./cute/hero.css";
import "./cute/shop.css";
import "./cute/flow.css";

export const metadata: Metadata = {
  title: "PAWPAL — ทุกความสุขของเพื่อนตัวเล็ก",
  description: "อาหาร อาหารเสริม และผลิตภัณฑ์ดูแลสุนัข แมว และสัตว์เอ็กโซติก",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body className="antialiased">{children}</body>
    </html>
  );
}
