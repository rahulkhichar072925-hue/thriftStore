import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const normalize = (value) => (typeof value === "string" ? value.trim() : "");

export async function GET(_request, { params }) {
  try {
    const username = normalize(params?.username);
    if (!username) {
      return NextResponse.json(
        { success: false, message: "Store username is required." },
        { status: 400 }
      );
    }

    const store = await prisma.store.findUnique({
      where: { username },
    });

    if (!store) {
      return NextResponse.json(
        { success: false, message: "Store not found." },
        { status: 404 }
      );
    }

    const products = await prisma.product.findMany({
      where: { storeId: store.id },
      include: { rating: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: {
        store,
        products,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch store data." },
      { status: 500 }
    );
  }
}

