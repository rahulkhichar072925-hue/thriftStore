import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { enforceRateLimit } from "@/lib/server/rateLimit";

const normalize = (value) => (typeof value === "string" ? value.trim() : "");

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: sign in required." },
        { status: 401 }
      );
    }

    const complaints = await prisma.complaint.findMany({
      where: { userId },
      include: {
        product: true,
        order: true,
        store: true,
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

export async function POST(request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: sign in required." },
        { status: 401 }
      );
    }

    const rateLimitResponse = enforceRateLimit({
      request,
      key: "complaints:create",
      limit: 3,
      windowMs: 10 * 60_000,
      identifier: userId,
    });
    if (rateLimitResponse) return rateLimitResponse;

    const body = await request.json();
    const orderId = normalize(body?.orderId);
    const productId = normalize(body?.productId);
    const subject = normalize(body?.subject);
    const description = normalize(body?.description);

    if (!orderId || !productId || !subject || !description) {
      return NextResponse.json(
        {
          success: false,
          message: "orderId, productId, subject and description are required.",
        },
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

    const orderItem = (order.orderItems || []).find((item) => item.productId === productId);
    if (!orderItem) {
      return NextResponse.json(
        { success: false, message: "This product is not part of this order." },
        { status: 400 }
      );
    }

    const existingComplaint = await prisma.complaint.findFirst({
      where: { userId, orderId, productId },
      select: { id: true },
    });

    if (existingComplaint) {
      return NextResponse.json(
        { success: false, message: "You already submitted a complaint for this product in this order." },
        { status: 409 }
      );
    }

    const complaint = await prisma.complaint.create({
      data: {
        userId,
        orderId,
        productId,
        storeId: order.storeId,
        subject,
        description,
      },
      include: {
        product: true,
        order: true,
        store: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Complaint submitted successfully.",
      data: complaint,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to submit complaint." },
      { status: 500 }
    );
  }
}
