import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const normalize = (value) => (typeof value === "string" ? value.trim() : "");
const isStockQtySchemaError = (error) => {
  const message = String(error?.message || "").toLowerCase();
  return (
    message.includes("stockqty") &&
    (message.includes("unknown arg") ||
      message.includes("does not exist") ||
      message.includes("unknown field") ||
      message.includes("column"))
  );
};

export async function PATCH(request, { params }) {
  try {
    const productId = normalize(params?.id);
    if (!productId) {
      return NextResponse.json(
        { success: false, message: "Product id is required." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const hasInStock = typeof body.inStock === "boolean";
    const hasStockQty = Number.isInteger(body.stockQty) && body.stockQty >= 0;

    if (!hasInStock && !hasStockQty) {
      return NextResponse.json(
        { success: false, message: "Provide valid inStock or stockQty." },
        { status: 400 }
      );
    }

    let existing = null;
    let nextStockQty = 0;
    let stockQtyAvailable = true;
    try {
      existing = await prisma.product.findUnique({
        where: { id: productId },
        select: { stockQty: true },
      });
      if (!existing) {
        return NextResponse.json(
          { success: false, message: "Product not found." },
          { status: 404 }
        );
      }
      nextStockQty = existing.stockQty;
      if (hasStockQty) {
        nextStockQty = body.stockQty;
      } else if (body.inStock === false) {
        nextStockQty = 0;
      } else {
        nextStockQty = Math.max(1, existing.stockQty || 0);
      }
    } catch (error) {
      if (!isStockQtySchemaError(error)) throw error;
      stockQtyAvailable = false;
      const legacyExisting = await prisma.product.findUnique({
        where: { id: productId },
        select: { id: true, inStock: true },
      });
      if (!legacyExisting) {
        return NextResponse.json(
          { success: false, message: "Product not found." },
          { status: 404 }
        );
      }
    }

    let updated;
    if (!stockQtyAvailable) {
      updated = await prisma.product.update({
        where: { id: productId },
        data: {
          inStock: Boolean(hasInStock ? body.inStock : true),
        },
      });
    } else {
      updated = await prisma.product.update({
        where: { id: productId },
        data: {
          stockQty: nextStockQty,
          inStock: nextStockQty > 0,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Stock updated.",
      data: updated,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update stock." },
      { status: 500 }
    );
  }
}
