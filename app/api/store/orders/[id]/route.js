import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildNextOrderTimeline } from "@/lib/server/orderTimeline";
import { findStoreForUser, requireStoreSession } from "@/lib/server/storeAuth";
import { enforceRateLimit } from "@/lib/server/rateLimit";
import { sendOrderStatusEmail } from "@/lib/server/email";
import {
  ALLOWED_ORDER_STATUSES,
  buildOrderTransitionErrorMessage,
  isValidOrderTransition,
} from "@/lib/server/orderStatus";

const normalize = (value) => (typeof value === "string" ? value.trim() : "");

export async function PATCH(request, { params }) {
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
    const requestedUserId = normalize(body?.userId);

    if (!ALLOWED_ORDER_STATUSES.includes(status)) {
      return NextResponse.json(
        { success: false, message: "Invalid order status." },
        { status: 400 }
      );
    }

    const session = await requireStoreSession(requestedUserId);
    if (session.error) return session.error;
    const rateLimitResponse = enforceRateLimit({
      request,
      key: "store:order-status:update",
      limit: 40,
      windowMs: 60_000,
      identifier: session.userId,
    });
    if (rateLimitResponse) return rateLimitResponse;

    const store = await findStoreForUser(session.userId);
    if (!store) {
      return NextResponse.json(
        { success: false, message: "Store not found." },
        { status: 404 }
      );
    }

    const existingOrder = await prisma.order.findUnique({
      where: { id: orderId },
      select: { status: true, statusTimeline: true, storeId: true },
    });
    if (!existingOrder) {
      return NextResponse.json(
        { success: false, message: "Order not found." },
        { status: 404 }
      );
    }
    if (existingOrder.storeId !== store.id) {
      return NextResponse.json(
        { success: false, message: "Forbidden: order does not belong to your store." },
        { status: 403 }
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
        orderItems: {
          include: { product: true },
        },
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
