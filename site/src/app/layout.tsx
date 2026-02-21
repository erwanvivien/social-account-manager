import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Social Account Manager — Switch accounts instantly",
  description:
    "Stay logged into multiple social media accounts at once. Isolated sessions, instant switching, zero hassle.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <body
        className={`${geistSans.variable} font-sans antialiased bg-[#0a0a0a] text-[#e4e4e7]`}
      >
        {children}
      </body>
    </html>
  );
}
