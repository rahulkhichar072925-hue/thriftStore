import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { findStoreForUser, requireStoreSession } from "@/lib/server/storeAuth";

const normalize = (value) => (typeof value === "string" ? value.trim() : "");
const LOW_STOCK_THRESHOLD = 5;

const getStockQty = (product) => {
  const qty = Number(product?.stockQty);
  if (Number.isFinite(qty)) return qty;
  return product?.inStock ? 1 : 0;
};

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = normalize(searchParams.get("userId"));
    const session = await requireStoreSession(userId);
    if (session.error) return session.error;

    const store = await findStoreForUser(session.userId);

    if (!store) {
      return NextResponse.json({
        success: true,
        data: {
          totalProducts: 0,
          totalEarnings: 0,
          totalOrders: 0,
          pendingComplaints: 0,
          lowStockProducts: 0,
          outOfStockProducts: 0,
          ratings: [],
        },
      });
    }

    const complaintCountPromise =
      prisma.complaint && typeof prisma.complaint.count === "function"
        ? prisma.complaint.count({
            where: {
              storeId: store.id,
              status: { in: ["OPEN", "IN_REVIEW"] },
            },
          })
        : Promise.resolve(0);

    const [products, orders, ratings, pendingComplaints] = await Promise.all([
      prisma.product.findMany({
        where: { storeId: store.id },
      }),
      prisma.order.findMany({
        where: { storeId: store.id },
      }),
      prisma.rating.findMany({
        where: { product: { storeId: store.id } },
        include: {
          user: true,
          product: true,
        },
        orderBy: { createdAt: "desc" },
        take: 25,
      }),
      complaintCountPromise,
    ]);

    const totalEarnings = orders
      .filter((order) => order.isPaid || order.status === "DELIVERED")
      .reduce((sum, order) => sum + Number(order.total || 0), 0);
    const outOfStockProducts = products.filter((product) => getStockQty(product) <= 0).length;
    const lowStockProducts = products.filter((product) => {
      const stockQty = getStockQty(product);
      return stockQty > 0 && stockQty <= LOW_STOCK_THRESHOLD;
    }).length;

    return NextResponse.json({
      success: true,
      data: {
        totalProducts: products.length,
        totalEarnings,
        totalOrders: orders.length,
        pendingComplaints,
        lowStockProducts,
        outOfStockProducts,
        ratings,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to load seller dashboard.",
      },
      { status: 500 }
    );
  }
}
