import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/server/adminAuth";
import { buildNextOrderTimeline } from "@/lib/server/orderTimeline";
import { logAdminAction } from "@/lib/server/adminAudit";
import { enforceRateLimit } from "@/lib/server/rateLimit";
import { sendOrderStatusEmail } from "@/lib/server/email";
import {
  ALLOWED_ORDER_STATUSES,
  buildOrderTransitionErrorMessage,
  isValidOrderTransition,
} from "@/lib/server/orderStatus";

const normalize = (value) => (typeof value === "string" ? value.trim() : "");

export async function PATCH(request, { params }) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;
  const rateLimitResponse = enforceRateLimit({
    request,
    key: "admin:order-status:update",
    limit: 60,
    windowMs: 60_000,
    identifier: admin.userId,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const orderId = normalize(params?.id);
    if (!orderId) {
      return NextResponse.json(
        { success: false, message: "Order id is required." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const status = normalize(body?.status);
    if (!ALLOWED_ORDER_STATUSES.includes(status)) {
      return NextResponse.json(
        { success: false, message: "Invalid order status." },
        { status: 400 }
      );
    }

    const existingOrder = await prisma.order.findUnique({
      where: { id: orderId },
      select: { status: true, statusTimeline: true },
    });
    if (!existingOrder) {
      return NextResponse.json(
        { success: false, message: "Order not found." },
        { status: 404 }
      );
    }

    if (!isValidOrderTransition(existingOrder.status, status)) {
      return NextResponse.json(
        {
          success: false,
          message: buildOrderTransitionErrorMessage(existingOrder.status, status),
        },
        { status: 400 }
      );
    }

    const timeline = buildNextOrderTimeline(
      existingOrder.statusTimeline,
      existingOrder.status,
      status
    );

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { status, statusTimeline: timeline },
      include: {
        user: true,
        address: true,
        store: true,
        orderItems: { include: { product: true } },
      },
    });

    await logAdminAction({
      adminUserId: admin.userId,
      action: "ORDER_STATUS_UPDATED",
      targetType: "ORDER",
      targetId: orderId,
      details: {
        previousStatus: existingOrder.status,
        nextStatus: status,
      },
    });

    sendOrderStatusEmail({
      to: updatedOrder?.user?.email,
      orderId: updatedOrder?.id,
      status: updatedOrder?.status,
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: "Order status updated.",
      data: updatedOrder,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update order status." },
      { status: 500 }
    );
  }
}
