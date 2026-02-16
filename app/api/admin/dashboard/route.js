import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/server/adminAuth";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const [productsCount, storesCount, orders, revenueAgg] = await Promise.all([
      prisma.product.count(),
      prisma.store.count({ where: { status: "approved", isActive: true } }),
      prisma.order.findMany({
        select: {
          id: true,
          total: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.order.aggregate({
        _sum: { total: true },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        products: productsCount,
        revenue: Number(revenueAgg?._sum?.total || 0),
        orders: orders.length,
        stores: storesCount,
        allOrders: orders,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to load admin dashboard." },
      { status: 500 }
    );
  }
}
