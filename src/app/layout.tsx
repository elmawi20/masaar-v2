import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Masaar Clinic System",
  description: "نظام عيادة مسار لإدارة العلاج الطبيعي والتغذية العلاجية",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
