import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/server/adminAuth";

const normalize = (value) => (typeof value === "string" ? value.trim() : "");

export async function GET(request) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  try {
    if (!prisma.emailLog || typeof prisma.emailLog.findMany !== "function") {
      return NextResponse.json({
        success: true,
        data: [],
        message: "Email logs are not initialized yet.",
      });
    }

    const { searchParams } = new URL(request.url);
    const eventType = normalize(searchParams.get("eventType")).toUpperCase();
    const status = normalize(searchParams.get("status")).toUpperCase();
    const where = {};
    if (eventType) where.eventType = eventType;
    if (status) where.status = status;

    const logs = await prisma.emailLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ success: true, data: logs });
  } catch (error) {
    if (String(error?.code || "") === "P2021") {
      return NextResponse.json({
        success: true,
        data: [],
        message: "Email logs table is not ready yet.",
      });
    }
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch email logs." },
      { status: 500 }
    );
  }
}
