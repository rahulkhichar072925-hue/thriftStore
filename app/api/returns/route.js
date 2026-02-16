import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { hasPrismaModel, prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/server/rateLimit";

const normalize = (value) => (typeof value === "string" ? value.trim() : "");

const getDeliveredAt = (order) => {
  const timeline = Array.isArray(order?.statusTimeline) ? order.statusTimeline : [];
  const delivered = timeline.find(
    (entry) => String(entry?.status || "").toUpperCase() === "DELIVERED"
  );
  const deliveredAt = delivered?.at ? new Date(delivered.at) : null;
  if (deliveredAt && !Number.isNaN(deliveredAt.getTime())) return deliveredAt;
  const updatedAt = order?.updatedAt ? new Date(order.updatedAt) : null;
  if (updatedAt && !Number.isNaN(updatedAt.getTime())) return updatedAt;
  return null;
};

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: sign in required." },
        { status: 401 }
      );
    }

    if (!hasPrismaModel("return")) {
      return NextResponse.json(
        {
          success: false,
          message: "Prisma client is missing the Return model. Run `npx prisma generate` and restart the dev server.",
        },
        { status: 500 }
      );
    }

    const returns = await prisma.return.findMany({
      where: { userId },
      include: {
        product: true,
        order: true,
        store: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: returns });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch returns." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: sign in required." },
        { status: 401 }
      );
    }

    if (!hasPrismaModel("return")) {
      return NextResponse.json(
        {
          success: false,
          message: "Prisma client is missing the Return model. Run `npx prisma generate` and restart the dev server.",
        },
        { status: 500 }
      );
    }

    const rateLimitResponse = enforceRateLimit({
      request,
      key: "returns:create",
      limit: 3,
      windowMs: 10 * 60_000,
      identifier: userId,
    });
    if (rateLimitResponse) return rateLimitResponse;

    const body = await request.json();
    const orderId = normalize(body?.orderId);
    const productId = normalize(body?.productId);
    const reason = normalize(body?.reason);
    const description = normalize(body?.description);

    if (!orderId || !productId || !reason || !description) {
      return NextResponse.json(
        { success: false, message: "orderId, productId, reason and description are required." },
        { status: 400 }
      );
    }

    const order = await prisma.order.findFirst({
      where: { id: orderId, userId },
      include: { orderItems: true },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, message: "Order not found." },
        { status: 404 }
      );
    }

    if (String(order.status || "").toUpperCase() !== "DELIVERED") {
      return NextResponse.json(
        { success: false, message: "Return is allowed only after delivery." },
        { status: 400 }
      );
    }

    const deliveredAt = getDeliveredAt(order);
    if (!deliveredAt) {
      return NextResponse.json(
        { success: false, message: "Delivery date is unavailable." },
        { status: 400 }
      );
    }

    const diffDays = (Date.now() - deliveredAt.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays > 7) {
      return NextResponse.json(
        { success: false, message: "Return window expired (7 days)." },
        { status: 400 }
      );
    }

    const orderItem = (order.orderItems || []).find((item) => item.productId === productId);
    if (!orderItem) {
      return NextResponse.json(
        { success: false, message: "This product is not part of this order." },
        { status: 400 }
      );
    }

    const existing = await prisma.return.findFirst({
      where: { userId, orderId, productId },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, message: "Return already requested for this product." },
        { status: 409 }
      );
    }

    const returnRequest = await prisma.return.create({
      data: {
        userId,
        orderId,
        productId,
        storeId: order.storeId,
        reason,
        description,
        statusTimeline: [{ status: "REQUESTED", at: new Date().toISOString() }],
      },
      include: {
        product: true,
        order: true,
        store: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Return request submitted successfully.",
      data: returnRequest,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to submit return request." },
      { status: 500 }
    );
  }
}
