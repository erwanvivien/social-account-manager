import { signToken } from "@/lib/jwt";
import { prismaClient } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
// import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const { email, deviceName } = await req.json();

  if (!(typeof email === "string")) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const normalizedEmail = email.toLowerCase().trim();

  const user = await prismaClient().user.findUnique({
    include: { devices: true },
    where: { email: normalizedEmail },
  });

  if (!user) {
    return NextResponse.json(
      { error: "Invalid email or password." },
      { status: 401 },
    );
  }

  // if (!user.passwordHash) {
  //   return NextResponse.json(
  //     { needsPassword: true, error: "Please set a password first." },
  //     { status: 403 },
  //   );
  // }

  // const valid = await bcrypt.compare(password, user.passwordHash);
  // if (!valid) {
  //   return NextResponse.json(
  //     { error: "Invalid email or password." },
  //     { status: 401 },
  //   );
  // }

  // Register the device
  if (deviceName) {
    const existing = user.devices.find((d) => d.name === deviceName);

    if (existing) {
      await prismaClient().device.update({
        where: { id: existing.id },
        data: { lastSeen: new Date() },
      });
    } else {
      if (user.devices.length >= user.maxDevices) {
        return NextResponse.json(
          {
            error: `Device limit reached (${user.maxDevices}). Remove a device first.`,
            devices: user.devices.map((d) => ({
              id: d.id,
              name: d.name,
              lastSeen: d.lastSeen.toISOString(),
            })),
            deviceLimitReached: true,
          },
          { status: 403 },
        );
      }

      await prismaClient().device.create({
        data: { userId: user.id, name: deviceName },
      });
    }
  }

  const token = signToken(normalizedEmail);

  return NextResponse.json({ token, email: normalizedEmail });
}
