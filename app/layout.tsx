import type { Metadata } from "next";
import "./globals.css";

/**
 * Root Layout Component
 *
 * This wraps ALL pages in your application
 *
 * Think of it like:
 * - The <html> and <body> tags
 * - Global styles and fonts
 * - Navigation that appears on every page
 *
 * Every page.tsx file renders inside the {children} placeholder
 */
export const metadata: Metadata = {
  title: "TermMap | Lab terminology review",
  description: "A browser-based demo for reviewing synthetic lab CSV data and terminology mappings.",
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
