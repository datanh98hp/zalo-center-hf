import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Zalo Center",
  description: "Tập trung hội thoại và phân công khách hàng"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi"><body>{children}</body></html>;
}
