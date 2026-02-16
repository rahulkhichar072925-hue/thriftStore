import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const normalize = (value) => (typeof value === "string" ? value.trim() : "");

const cancellableStatuses = new Set(["ORDER_PLACED", "PROCESSING"]);

export async function DELETE(request, { params }) {
  try {
    const orderId = normalize(params?.id);
    const { searchParams } = new URL(request.url);
    const userId = normalize(searchParams.get("userId"));

    if (!orderId || !userId) {
      return NextResponse.json(
        { success: false, message: "orderId and userId are required." },
        { status: 400 }
      );
    }

    const order = await prisma.order.findFirst({
      where: { id: orderId, userId },
      select: { id: true, status: true },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, message: "Order not found." },
        { status: 404 }
      );
    }

    if (!cancellableStatuses.has(order.status)) {
      return NextResponse.json(
        {
          success: false,
          message: "This order can no longer be cancelled.",
        },
        { status: 400 }
      );
    }

    await prisma.order.delete({ where: { id: orderId } });

    return NextResponse.json({
      success: true,
      message: "Order cancelled successfully.",
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to cancel order." },
      { status: 500 }
    );
  }
}
