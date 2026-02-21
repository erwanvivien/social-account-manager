import { NextRequest, NextResponse } from "next/server";
import { prismaClient } from "@/lib/prisma";
import { verifyToken } from "@/lib/jwt";

// GET: list devices for the authenticated user
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Missing token" }, { status: 401 });
  }

  const payload = verifyToken(authHeader.slice(7));
  if (!payload) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const user = await prismaClient().user.findUnique({
    where: { email: payload.email },
    include: { devices: { orderBy: { lastSeen: "desc" } } },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    devices: user.devices.map((d) => ({
      id: d.id,
      name: d.name,
      lastSeen: d.lastSeen.toISOString(),
      createdAt: d.createdAt.toISOString(),
    })),
    maxDevices: user.maxDevices,
  });
}

// DELETE: remove a device by ID
export async function DELETE(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Missing token" }, { status: 401 });
  }

  const payload = verifyToken(authHeader.slice(7));
  if (!payload) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const { deviceId } = await req.json();
  if (!deviceId) {
    return NextResponse.json(
      { error: "deviceId is required" },
      { status: 400 },
    );
  }

  const device = await prismaClient().device.findUnique({
    where: { id: deviceId },
    include: { user: true },
  });

  if (!device || device.user.email !== payload.email) {
    return NextResponse.json({ error: "Device not found" }, { status: 404 });
  }

  await prismaClient().device.delete({ where: { id: deviceId } });

  return NextResponse.json({ ok: true });
}
