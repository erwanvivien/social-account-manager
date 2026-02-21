import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export const getId = (
  objectOrId: string | { id: string } | null | undefined,
): string | undefined => {
  if (typeof objectOrId === "string") {
    return objectOrId;
  }
  if (objectOrId === null || objectOrId === undefined) {
    return undefined;
  }

  return objectOrId.id;
};
