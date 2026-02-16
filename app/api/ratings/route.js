import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

const normalize = (value) => (typeof value === "string" ? value.trim() : "");

export async function GET(request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: sign in required." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const orderId = normalize(searchParams.get("orderId"));

    const ratings = await prisma.rating.findMany({
      where: {
        userId,
        ...(orderId ? { orderId } : {}),
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: ratings });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch ratings." },
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

    const body = await request.json();
    const productId = normalize(body?.productId);
    const orderId = normalize(body?.orderId);
    const review = normalize(body?.review);
    const rating = Number(body?.rating);

    if (!productId || !orderId || !review) {
      return NextResponse.json(
        { success: false, message: "productId, orderId and review are required." },
        { status: 400 }
      );
    }

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json(
        { success: false, message: "Rating must be an integer between 1 and 5." },
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

    const hasProductInOrder = (order.orderItems || []).some((item) => item.productId === productId);
    if (!hasProductInOrder) {
      return NextResponse.json(
        { success: false, message: "This product is not part of the selected order." },
        { status: 400 }
      );
    }

    const savedRating = await prisma.rating.upsert({
      where: {
        userId_productId_orderId: {
          userId,
          productId,
          orderId,
        },
      },
      update: {
        rating,
        review,
      },
      create: {
        userId,
        productId,
        orderId,
        rating,
        review,
      },
      include: {
        user: true,
        product: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Rating submitted successfully.",
      data: savedRating,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to submit rating." },
      { status: 500 }
    );
  }
}
