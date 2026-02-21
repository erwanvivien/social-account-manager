import { assertDefined } from "@/lib";
import { prismaClient } from "@/lib/prisma";
import { getId, stripe } from "@/lib/stripe";
import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    console.error("[webhook] Missing stripe-signature header");
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[webhook] Signature verification failed:", message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      assertDefined(
        session.customer_details,
        "session.customer_details is required",
      );
      const email = session.customer_details.email;
      if (email === null) break;

      const customerId = getId(session.customer);
      const isSubscription = session.mode === "subscription";
      let plan: string;
      let paidUntil: Date | null = null;

      if (isSubscription && session.subscription) {
        const subId = getId(session.subscription);
        assertDefined(subId, "session.subscription is required");

        const sub = await stripe.subscriptions.retrieve(subId);
        const item = sub.items.data[0];
        const interval = item?.price?.recurring?.interval;
        plan = interval === "year" ? "yearly" : "monthly";
        paidUntil = new Date((item?.current_period_end ?? 0) * 1000);
      } else {
        plan = "lifetime";
        paidUntil = null;
      }

      await prismaClient().user.upsert({
        where: { email },
        update: { stripeCustomerId: customerId, plan, paidUntil },
        create: { email, stripeCustomerId: customerId, plan, paidUntil },
      });

      break;
    }

    case "invoice.paid": {
      const invoice = event.data.object;
      const customerId = getId(invoice.customer);
      if (customerId === undefined) {
        break;
      }

      const paidUntil = new Date((invoice.period_end ?? 0) * 1000);

      await prismaClient().user.updateMany({
        where: { stripeCustomerId: customerId },
        data: { paidUntil },
      });

      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object;
      const customerId = getId(sub.customer);
      if (customerId === undefined) {
        break;
      }

      await prismaClient().user.updateMany({
        where: { stripeCustomerId: customerId },
        data: { plan: null, paidUntil: new Date(0) },
      });

      break;
    }
  }

  return NextResponse.json({ received: true });
}
