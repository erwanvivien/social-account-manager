import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendVerificationCode } from "@/lib/email";
import { signToken } from "@/lib/jwt";
import crypto from "node:crypto";

function generateCode(): string {
  return crypto.randomInt(100000, 999999).toString();
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { email, code } = body;

  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Step 1: If no code provided, send a verification code
  if (!code) {
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return NextResponse.json(
        {
          error:
            "No account found with this email. Please purchase a license first.",
        },
        { status: 404 },
      );
    }

    const verificationCode = generateCode();
    const verificationExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    await prisma.user.update({
      where: { email: normalizedEmail },
      data: { verificationCode, verificationExpiry },
    });

    await sendVerificationCode(normalizedEmail, verificationCode);

    return NextResponse.json({ sent: true });
  }

  // Step 2: Code provided, verify it
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user || !user.verificationCode || !user.verificationExpiry) {
    return NextResponse.json(
      { error: "No pending verification." },
      { status: 400 },
    );
  }

  if (new Date() > user.verificationExpiry) {
    return NextResponse.json(
      { error: "Code expired. Please request a new one." },
      { status: 400 },
    );
  }

  if (user.verificationCode !== code) {
    return NextResponse.json({ error: "Invalid code." }, { status: 400 });
  }

  // Clear the code and return a JWT
  await prisma.user.update({
    where: { email: normalizedEmail },
    data: { verificationCode: null, verificationExpiry: null },
  });

  const token = signToken(normalizedEmail);

  return NextResponse.json({ token, email: normalizedEmail });
}
