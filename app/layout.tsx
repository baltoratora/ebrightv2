import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "baltoratora",
  description:
    "Daily STEM fun fact, a freshly published research paper, and an AI wallpaper generator.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Extend under the iOS notch/home-indicator; keep pinch-zoom enabled (a11y).
  viewportFit: "cover",
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
