import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/server/adminAuth";

export async function GET() {
  try {
    const admin = await requireAdmin();
    if (admin.error) return admin.error;

    const complaints = await prisma.complaint.findMany({
      include: {
        user: true,
        product: true,
        store: true,
        order: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: complaints });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch complaints." },
      { status: 500 }
    );
  }
}
