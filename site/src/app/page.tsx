"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

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
    desc: "Each account runs in its own sandboxed browser session. Cookies, storage, and cache are completely separate.",
  },
  {
    icon: "\u26a1",
    title: "Instant switching",
    desc: "Click an account in the sidebar or press Cmd+1-9. No page reloads, no waiting. Sessions stay alive in the background.",
  },
  {
    icon: "\u{1f4be}",
    title: "Persistent logins",
    desc: "Sessions are stored on disk. Close the app, reopen it \u2014 you\u2019re still logged in everywhere.",
  },
  {
    icon: "\u{1f3a8}",
    title: "Color-coded accounts",
    desc: "Tag each account with a color for quick visual identification in the sidebar.",
  },
  {
    icon: "\u2328\ufe0f",
    title: "Keyboard shortcuts",
    desc: "Cmd+N to add accounts, Cmd+1-9 to switch, Cmd+R to reload. Everything is fast.",
  },
  {
    icon: "\u{1f4e5}",
    title: "Menu bar tray",
    desc: "Quick-access from your menu bar. Switch accounts or show the window without hunting for it.",
  },
];

const PLATFORMS = [
  "Instagram",
  "Twitter / X",
  "Facebook",
  "TikTok",
  "LinkedIn",
  "YouTube",
  "Reddit",
  "Threads",
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

function SuccessBanner() {
  const params = useSearchParams();
  const success = params.get("success");
  const canceled = params.get("canceled");

  if (success) {
    return (
      <div className="fixed top-20 left-0 right-0 z-40 flex justify-center px-4 mt-4 animate-[slideDown_0.4s_ease-out]">
        <div className="bg-[#141414] border border-[#22c55e]/40 rounded-xl px-6 py-4 max-w-lg w-full shadow-lg shadow-[#22c55e]/5 flex items-start gap-4">
          <div className="text-3xl mt-0.5">&#10003;</div>
          <div>
            <h3 className="text-[#22c55e] font-semibold text-base mb-1">
              Payment successful!
            </h3>
            <p className="text-[#71717a] text-sm leading-relaxed">
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
      <div className="fixed top-16 left-0 right-0 z-40 flex justify-center px-4 animate-[slideDown_0.4s_ease-out]">
        <div className="bg-[#141414] border border-[#f97316]/40 rounded-xl px-6 py-4 max-w-lg w-full shadow-lg shadow-[#f97316]/5 flex items-start gap-4">
          <div className="text-3xl mt-0.5">&#x2715;</div>
          <div>
            <h3 className="text-[#f97316] font-semibold text-base mb-1">
              Payment canceled
            </h3>
            <p className="text-[#71717a] text-sm leading-relaxed">
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
  return (
    <>
      <Suspense>
        <SuccessBanner />
      </Suspense>

      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-[#222]">
        <div className="max-w-[960px] mx-auto px-6 py-3.5 flex items-center justify-between">
          <a
            href="#"
            className="flex items-center gap-2.5 font-semibold text-[15px] text-[#e4e4e7] no-underline"
          >
            Social Account Manager
          </a>
          <a
            href="#buy"
            className="bg-[#6366f1] text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-[#818cf8] transition-colors no-underline"
          >
            Buy Now
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-[960px] mx-auto pt-36 pb-20 px-6 text-center">
        <h1 className="text-[clamp(32px,5vw,52px)] font-bold tracking-tight leading-[1.15] mb-4">
          Multiple accounts.
          <br />
          <span className="bg-gradient-to-br from-[#6366f1] to-[#ec4899] bg-clip-text text-transparent">
            One app. Zero friction.
          </span>
        </h1>
        <p className="text-lg text-[#71717a] max-w-[520px] mx-auto mb-9">
          Stay logged into all your social media accounts at once. Switch
          instantly. No more logging in and out.
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <a
            href="#buy"
            className="bg-[#6366f1] text-white px-7 py-3 rounded-xl text-base font-medium hover:bg-[#818cf8] hover:-translate-y-0.5 transition-all no-underline"
          >
            Purchase License
          </a>
          <a
            href="#features"
            className="bg-[#141414] text-[#e4e4e7] px-7 py-3 rounded-xl border border-[#222] text-base font-medium hover:bg-[#222] transition-colors no-underline"
          >
            Learn More
          </a>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-[960px] mx-auto py-20 px-6">
        <h2 className="text-center text-[28px] font-semibold tracking-tight mb-12">
          Built for multi-account workflows
        </h2>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-5">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="bg-[#141414] border border-[#222] rounded-xl p-6"
            >
              <div className="text-[28px] mb-3">{f.icon}</div>
              <h3 className="text-base font-semibold mb-1.5">{f.title}</h3>
              <p className="text-sm text-[#71717a] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Platforms */}
      <section className="max-w-[960px] mx-auto pt-10 pb-20 px-6 text-center">
        <p className="text-[#71717a] text-sm mb-5">
          Works with all major platforms
        </p>
        <div className="flex gap-6 justify-center flex-wrap text-[15px] font-medium">
          {PLATFORMS.map((p) => (
            <span key={p}>{p}</span>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section
        id="buy"
        className="max-w-[960px] mx-auto py-16 px-6 text-center"
      >
        <h2 className="text-[28px] font-semibold tracking-tight mb-3">
          Ready to simplify your workflow?
        </h2>
        <p className="text-[#71717a] mb-10">
          Choose the plan that works for you.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-3xl mx-auto">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`relative bg-[#141414] border rounded-xl p-6 flex flex-col items-center ${
                plan.highlight ? "border-[#6366f1]" : "border-[#222]"
              }`}
            >
              {plan.badge && (
                <span className="absolute -top-3 bg-[#6366f1] text-white text-xs font-medium px-3 py-1 rounded-full">
                  {plan.badge}
                </span>
              )}
              <h3 className="text-lg font-semibold mb-2">{plan.name}</h3>
              <div className="text-3xl font-bold mb-1">{plan.price}</div>
              {plan.sub && (
                <p className="text-sm text-[#71717a] mb-4">{plan.sub}</p>
              )}
              {!plan.sub && <div className="mb-4" />}
              <button
                onClick={() => handleCheckout(plan.priceId)}
                className={`w-full py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  plan.highlight
                    ? "bg-[#6366f1] text-white hover:bg-[#818cf8]"
                    : "bg-[#222] text-[#e4e4e7] hover:bg-[#333]"
                }`}
              >
                Get {plan.name}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#222] py-6 text-center text-[13px] text-[#71717a]">
        <p>
          &copy; 2026 Erwan Vivien &middot;{" "}
          <a
            href="https://x.com/ErwanVi"
            className="text-[#71717a] hover:text-[#e4e4e7] no-underline"
          >
            Contact
          </a>
        </p>
      </footer>
    </>
  );
}
