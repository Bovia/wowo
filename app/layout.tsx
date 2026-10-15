import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "窝窝",
  description: "一座会慢慢长大的马赛克小家",
};

export const viewport: Viewport = {
  themeColor: "#f6efe4",
  viewportFit: "cover",
  maximumScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
