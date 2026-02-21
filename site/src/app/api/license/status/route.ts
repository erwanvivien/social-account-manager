import { NextRequest, NextResponse } from "next/server";
import { prismaClient } from "@/lib/prisma";
import { verifyToken } from "@/lib/jwt";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json(
      { valid: false, error: "Missing token" },
      { status: 401 },
    );
  }

  const token = authHeader.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    return NextResponse.json(
      { valid: false, error: "Invalid or expired token" },
      { status: 401 },
    );
  }

  const user = await prismaClient().user.findUnique({
    where: { email: payload.email },
  });

  if (!user || !user.plan) {
    return NextResponse.json({
      valid: false,
      email: payload.email,
      error: "No active license",
    });
  }

  if (user.plan === "lifetime") {
    return NextResponse.json({
      valid: true,
      email: user.email,
      plan: user.plan,
    });
  }

  // Subscription: check if paidUntil is in the future
  const isActive = user.paidUntil ? user.paidUntil > new Date() : false;
  console.log({ paidUntil: user.paidUntil });

  return NextResponse.json({
    valid: isActive,
    email: user.email,
    plan: user.plan,
    paidUntil: user.paidUntil?.toISOString() ?? null,
  });
}
