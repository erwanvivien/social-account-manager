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
              Your license is ready. Open the app and sign in with the email
              you used at checkout.
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
  const [showMobileTooltip, setShowMobileTooltip] = useState(false);

  const urls: Record<typeof platform, string> = {
    linux: linuxUrl,
    mac: macUrl,
    windows: windowsUrl,
    mobile: "#",
    [noPlatformSymbol]:
      "https://github.com/erwanvivien/social-account-manager/releases/latest/",
  };

  // Handle mobile download button click
  const handleMobileDownloadClick = (e: React.MouseEvent) => {
    if (platform === "mobile") {
      e.preventDefault();
      setShowMobileTooltip(true);
      // Auto-hide tooltip after 4 seconds
      setTimeout(() => setShowMobileTooltip(false), 4000);
    }
  };

  return (
    <div className={styles.container}>
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
          <div className={styles.downloadButtonWrapper}>
            <a
              href={urls[platform]}
              className={styles.buttonSecondary}
              onClick={handleMobileDownloadClick}
            >
              {downloadPlatformTexts[platform]}
            </a>
            {showMobileTooltip && (
              <div className={styles.mobileTooltip}>
                Only available on desktop
              </div>
            )}
          </div>
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
    </div>
  );
}

const noPlatformSymbol = Symbol("no-platform-found");
export type Platform =
  | "windows"
  | "mac"
  | "linux"
  | "mobile"
  | typeof noPlatformSymbol;

const downloadPlatformTexts: Record<Platform, string> = {
  windows: "Download for Windows",
  mac: "Download for Mac",
  linux: "Download for Linux",
  mobile: "Available on desktop",
  [noPlatformSymbol]: "Download on GitHub",
};

export function getPlatform(): Platform {
  const nav = navigator as Navigator & {
    userAgentData?: { platform?: string };
  };

  const platform =
    nav.userAgentData?.platform ?? navigator.platform ?? navigator.userAgent;

  const p = platform.toLowerCase();

  if (mobileAndTabletCheck()) return "mobile";
  if (p.includes("win")) return "windows";
  if (p.includes("mac")) return "mac";
  if (p.includes("linux") || p.includes("x11")) return "linux";

  return noPlatformSymbol;
}

function mobileAndTabletCheck(): boolean {
  const a =
    navigator.userAgent ||
    navigator.vendor ||
    (window as { opera?: string }).opera ||
    "";

  if (
    /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(
      a
    ) ||
    /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(
      a.substr(0, 4)
    )
  ) {
    return true;
  }

  return false;
}
