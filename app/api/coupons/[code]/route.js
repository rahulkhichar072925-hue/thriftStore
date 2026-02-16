import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/server/adminAuth";

const normalize = (value) => (typeof value === "string" ? value.trim().toUpperCase() : "");

export async function DELETE(_request, { params }) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const code = normalize(params?.code);
    if (!code) {
      return NextResponse.json(
        { success: false, message: "Coupon code is required." },
        { status: 400 }
      );
    }

    await prisma.coupon.delete({ where: { code } });

    return NextResponse.json({
      success: true,
      message: "Coupon deleted.",
    });
  } catch (error) {
    if (error?.code === "P2025") {
      return NextResponse.json(
        { success: false, message: "Coupon not found." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: false, message: error.message || "Failed to delete coupon." },
      { status: 500 }
    );
  }
}
