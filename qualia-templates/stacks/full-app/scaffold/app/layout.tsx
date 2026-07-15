import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Full App",
  description: "Replace with your product's one-sentence pitch.",
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
