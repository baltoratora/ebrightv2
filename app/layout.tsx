import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "baltoratora",
  description:
    "Daily STEM fun fact, a freshly published research paper, and an AI wallpaper generator.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
