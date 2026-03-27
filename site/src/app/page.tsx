"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState, useEffect } from "react";
import Image from "next/image";
import { useContext } from "./context";
import styles from "./page.module.css";
import {
  siInstagram,
  siX,
  siFacebook,
  siTiktok,
  siYoutube,
  siReddit,
  siThreads,
} from "simple-icons";

// LinkedIn SVG (not in simple-icons due to legal reasons)
const linkedinIcon = {
  title: "LinkedIn",
  svg: '<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>',
};

const PLANS = [
  {
    name: "Monthly",
    price: "$5/mo",
    priceId: process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID,
  },
  {
    name: "Yearly",
    price: "$39/yr",
    highlight: true,
    badge: "Save 35%",
    priceId: process.env.NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID,
  },
  {
    name: "Lifetime",
    price: "$79",
    sub: "one-time",
    priceId: process.env.NEXT_PUBLIC_STRIPE_LIFETIME_PRICE_ID,
  },
];

const FEATURES = [
  {
    icon: "\u{1f512}",
    title: "Isolated sessions",
    desc: "Each account runs in its own sandboxed browser session with separate cookies and storage.",
  },
  {
    icon: "\u26a1",
    title: "Instant switching",
    desc: "Click any account in the sidebar or use Cmd+1-9. No reloads, no waiting, instant access.",
  },
  {
    icon: "\u{1f4be}",
    title: "Persistent logins",
    desc: "Sessions are saved to disk. Close the app anytime and reopen \u2014 you\u2019re still logged in everywhere.",
  },
  {
    icon: "\u{1f3a8}",
    title: "Color-coded accounts",
    desc: "Assign a unique color to each account for quick visual identification in your sidebar.",
  },
  {
    icon: "\u2328\ufe0f",
    title: "Keyboard shortcuts",
    desc: "Use Cmd+N to add new accounts, Cmd+1-9 to switch between them, and Cmd+R to reload pages.",
  },
  {
    icon: "\u{1f4e5}",
    title: "Menu bar tray",
    desc: "Quick-access your accounts from the menu bar. Switch instantly without opening the window.",
  },
];

const PLATFORMS = [
  { name: "Instagram", icon: siInstagram },
  { name: "X", icon: siX },
  { name: "Facebook", icon: siFacebook },
  { name: "TikTok", icon: siTiktok },
  { name: "LinkedIn", icon: linkedinIcon },
  { name: "YouTube", icon: siYoutube },
  { name: "Reddit", icon: siReddit },
  { name: "Threads", icon: siThreads },
];

async function handleCheckout(priceId: string | undefined) {
  if (!priceId) return;
  const res = await fetch("/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ priceId }),
  });
  const { url } = await res.json();
  if (url) window.location.href = url;
}

function PlatformRotator({
  platforms,
}: {
  platforms: Array<{ name: string; icon: { svg: string; title: string } }>;
}) {
  const [currentSet, setCurrentSet] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const platformsPerSet = 4;
  const totalSets = Math.ceil(platforms.length / platformsPerSet);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentSet((prev) => (prev + 1) % totalSets);
        setIsTransitioning(false);
      }, 400); // Match the fade-out duration
    }, 3000); // Rotate every 3 seconds

    return () => clearInterval(interval);
  }, [totalSets]);

  const currentPlatforms = platforms.slice(
    currentSet * platformsPerSet,
    (currentSet + 1) * platformsPerSet
  );

  return (
    <div
      className={`${styles.platformsList} ${
        isTransitioning ? styles.platformsListFadeOut : ""
      }`}
    >
      {currentPlatforms.map((p, index) => (
        <div
          key={`${currentSet}-${p.name}`}
          className={styles.platformItem}
          style={{ animationDelay: `${index * 0.1}s` }}
        >
          <div
            className={styles.platformIcon}
            dangerouslySetInnerHTML={{ __html: p.icon.svg }}
            title={p.name}
          />
          <span className={styles.platformName}>{p.name}</span>
        </div>
      ))}
    </div>
  );
}

function SuccessBanner() {
  const params = useSearchParams();
  const success = params.get("success");
  const canceled = params.get("canceled");

  if (success) {
    return (
      <div className={styles.banner}>
        <div className={`${styles.bannerContent} ${styles.bannerSuccess}`}>
          <div className={styles.bannerIcon}>&#10003;</div>
          <div>
            <h3
              className={`${styles.bannerTitle} ${styles.bannerTitleSuccess}`}
            >
              Payment successful!
            </h3>
            <p className={styles.bannerText}>
              Your license is ready. Open the app, sign in with the email you
              used at checkout, and set your password.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (canceled) {
    return (
      <div className={styles.banner}>
        <div className={`${styles.bannerContent} ${styles.bannerError}`}>
          <div className={styles.bannerIcon}>&#x2715;</div>
          <div>
            <h3 className={`${styles.bannerTitle} ${styles.bannerTitleError}`}>
              Payment canceled
            </h3>
            <p className={styles.bannerText}>
              No worries — you can try again whenever you&apos;re ready.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default function Home() {
  const platform = getPlatform();
  const { linuxUrl, macUrl, windowsUrl } = useContext();

  const urls: Record<typeof platform, string> = {
    linux: linuxUrl,
    mac: macUrl,
    windows: windowsUrl,
    [noPlatformSymbol]:
      "https://github.com/erwanvivien/social-account-manager/releases/latest/",
  };

  return (
    <>
      <Suspense>
        <SuccessBanner />
      </Suspense>

      {/* Nav */}
      <nav className={styles.nav}>
        <div className={styles.navContainer}>
          <a href="#" className={styles.navLogo}>
            <span className={styles.navBrand}>Social Account Manager</span>
          </a>
          <a href="#buy" className={styles.navCta}>
            Buy Now
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className={styles.hero}>
        <h1 className={styles.heroTitle}>
          Multiple accounts.
          <br />
          <span className={styles.heroGradient}>One app. Zero friction.</span>
        </h1>
        <p className={styles.heroDescription}>
          Stay logged into all your social media accounts at once. Switch
          instantly. No more logging in and out.
        </p>
        <div className={styles.heroButtons}>
          <a href="#buy" className={styles.buttonPrimary}>
            Purchase License
          </a>
          <a href={urls[platform]} className={styles.buttonSecondary}>
            {platform === noPlatformSymbol
              ? "View All Options"
              : `Download for ${
                  platform === "mac"
                    ? "Mac"
                    : platform === "windows"
                    ? "Windows"
                    : "Linux"
                }`}
          </a>
          <a href="#features" className={styles.buttonTertiary}>
            Learn More
          </a>
        </div>
        <div className={styles.heroImageContainer}>
          <Image
            src="/cover.png"
            alt="Social Account Manager interface preview"
            width={2624 / 3}
            height={1824 / 3}
            className={styles.heroImage}
            priority
          />
        </div>
      </section>

      {/* Platforms */}
      <section className={styles.platforms}>
        <p className={styles.platformsLabel}>Works with all major platforms</p>
        <PlatformRotator platforms={PLATFORMS} />
      </section>

      {/* Features */}
      <section id="features" className={styles.features}>
        <h2 className={styles.featuresTitle}>
          Built for multi-account workflows
        </h2>
        <div className={styles.featuresGrid}>
          {FEATURES.map((f) => (
            <div key={f.title} className={styles.featureCard}>
              <div className={styles.featureIcon}>{f.icon}</div>
              <h3 className={styles.featureTitle}>{f.title}</h3>
              <p className={styles.featureDesc}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="buy" className={styles.pricing}>
        <h2 className={styles.pricingTitle}>
          Ready to simplify your workflow?
        </h2>
        <p className={styles.pricingSubtitle}>
          Choose the plan that works for you.
        </p>
        <div className={styles.pricingGrid}>
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={
                plan.highlight
                  ? `${styles.planCard} ${styles.planCardHighlight}`
                  : styles.planCard
              }
            >
              {plan.badge && (
                <span className={styles.planBadge}>{plan.badge}</span>
              )}
              <h3 className={styles.planName}>{plan.name}</h3>
              <div className={styles.planPrice}>{plan.price}</div>
              {plan.sub && <p className={styles.planSub}>{plan.sub}</p>}
              {!plan.sub && <div className={styles.planSpacing} />}
              <div style={{ height: 8 }} />
              <button
                onClick={() => handleCheckout(plan.priceId)}
                className={
                  plan.highlight
                    ? `${styles.planButton} ${styles.planButtonPrimary}`
                    : `${styles.planButton} ${styles.planButtonSecondary}`
                }
              >
                Get {plan.name}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <p>
          &copy; 2026 Erwan Vivien &middot;{" "}
          <a href="https://x.com/ErwanVi" className={styles.footerLink}>
            Contact
          </a>
        </p>
      </footer>
    </>
  );
}

const noPlatformSymbol = Symbol("no-platform-found");
export type Platform = "windows" | "mac" | "linux" | typeof noPlatformSymbol;

export function getPlatform(): Platform {
  const nav = navigator as Navigator & {
    userAgentData?: { platform?: string };
  };

  const platform =
    nav.userAgentData?.platform ?? navigator.platform ?? navigator.userAgent;

  const p = platform.toLowerCase();

  if (p.includes("win")) return "windows";
  if (p.includes("mac")) return "mac";
  if (p.includes("linux") || p.includes("x11")) return "linux";

  return noPlatformSymbol;
}
