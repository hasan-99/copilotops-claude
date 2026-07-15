import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Internal Tool",
  // Internal portal — keep it out of search indexes.
  robots: { index: false, follow: false },
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
