import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Poets & Perspectives",
  description: "A gentle scrapbook for your inner world. Daily reflections, meaningful connection, and room to be human.",
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
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
