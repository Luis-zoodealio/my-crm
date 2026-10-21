import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Zoodealio CRM",
  description: "Cash-offer pipeline",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
