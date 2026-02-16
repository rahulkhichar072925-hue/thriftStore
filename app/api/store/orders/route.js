import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { findStoreForUser, requireStoreSession } from "@/lib/server/storeAuth";

const normalize = (value) => (typeof value === "string" ? value.trim() : "");

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = normalize(searchParams.get("userId"));
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize")) || 12));
    const status = normalize(searchParams.get("status")).toUpperCase();
    const search = normalize(searchParams.get("search"));
    const session = await requireStoreSession(userId);
    if (session.error) return session.error;

    const store = await findStoreForUser(session.userId);

    if (!store) {
      return NextResponse.json({ success: true, data: [] });
    }

    const where = {
      storeId: store.id,
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { id: { contains: search, mode: "insensitive" } },
              { user: { name: { contains: search, mode: "insensitive" } } },
              { user: { email: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    const total = await prisma.order.count({ where });
    const orders = await prisma.order.findMany({
      where,
      include: {
        user: true,
        address: true,
        orderItems: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return NextResponse.json({
      success: true,
      data: orders,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch store orders." },
      { status: 500 }
    );
  }
}
