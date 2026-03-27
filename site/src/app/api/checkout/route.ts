import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { assertDefined } from "@/lib";

const NEXT_PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;
assertDefined(NEXT_PUBLIC_BASE_URL, "NEXT_PUBLIC_BASE_URL must be defined");

export async function POST(req: NextRequest) {
  const { priceId } = await req.json();

  if (!priceId) {
    return NextResponse.json({ error: "priceId is required" }, { status: 400 });
  }

  const isLifetime =
    priceId === process.env.NEXT_PUBLIC_STRIPE_LIFETIME_PRICE_ID;

  const session = await stripe.checkout.sessions.create({
    mode: isLifetime ? "payment" : "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    ...(isLifetime ? { customer_creation: "always" } : {}),
    success_url: `${NEXT_PUBLIC_BASE_URL}/?success=true`,
    cancel_url: `${NEXT_PUBLIC_BASE_URL}/?canceled=true`,
  });

  return NextResponse.json({ url: session.url });
}
