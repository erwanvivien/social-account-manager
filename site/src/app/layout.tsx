import type { Metadata } from "next";
import { Inter, DM_Sans, Outfit } from "next/font/google";
import { ContextProvider } from "./context";
import "./globals.css";

const inter = Inter({
  variable: "--font-heading",
  subsets: ["latin"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

const outfit = Outfit({
  variable: "--font-accent",
  subsets: ["latin"],
  display: "swap",
});

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Social Account Manager — Switch accounts instantly",
  description:
    "Stay logged into multiple social media accounts at once. Isolated sessions, instant switching, zero hassle.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [macUrl, linuxUrl, windowsUrl] = await Promise.all([
    fetchLatestVersion("mac"),
    fetchLatestVersion("linux"),
    fetchLatestVersion("windows"),
  ]);

  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${dmSans.variable} ${outfit.variable}`}
      >
        <ContextProvider
          macUrl={macUrl}
          linuxUrl={linuxUrl}
          windowsUrl={windowsUrl}
        >
          {children}
        </ContextProvider>
      </body>
    </html>
  );
}

const downloadFileUrl = (filename: string) =>
  `https://github.com/erwanvivien/social-account-manager/releases/latest/download/${filename}` as const;

const latestUrls = {
  mac: downloadFileUrl("latest-mac.yml"),
  linux: downloadFileUrl("latest-linux.yml"),
  windows: downloadFileUrl("latest.yml"),
};

const platformRegex = {
  mac: /url: (.+universal.dmg)$/gm,
  linux: /url: (.+\.AppImage)$/gm,
  windows: /url: (.+\.exe)$/gm,
};

const cache = new Map<
  keyof typeof latestUrls,
  { lastCheck: number; url: string }
>();

const fetchLatestVersion = async (
  platform: keyof typeof latestUrls,
): Promise<string> => {
  const cached = cache.get(platform);
  if (
    cached !== undefined &&
    cached.lastCheck + revalidate * 1000 > Date.now()
  ) {
    return cached.url;
  }

  const res = await fetch(latestUrls[platform]);
  const text = await res.text();

  const regex = platformRegex[platform];
  const [, path] = regex.exec(text) ?? [];
  if (path === undefined) {
    throw new Error("Could not find path");
  }

  const url = downloadFileUrl(path);
  cache.set(platform, { lastCheck: Date.now(), url });

  return url;
};
