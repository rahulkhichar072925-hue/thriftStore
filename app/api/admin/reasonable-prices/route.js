import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/server/adminAuth";

const normalize = (value) => (typeof value === "string" ? value.trim().toLowerCase() : "");

const hashString = (value) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) % 1000003;
  }
  return hash;
};

const getPriceBand = (category, name) => {
  const text = `${normalize(category)} ${normalize(name)}`;

  if (/shoe|sneaker|footwear|boot|sandal|slipper/.test(text)) {
    return { min: 799, max: 3999 };
  }
  if (/cloth|apparel|shirt|t-shirt|tee|jeans|jacket|hoodie|dress|kurta|top/.test(text)) {
    return { min: 399, max: 2499 };
  }
  if (/bag|wallet|belt|cap|watch|accessor/.test(text)) {
    return { min: 299, max: 1999 };
  }

  return { min: 299, max: 2999 };
};

const roundToNearestTen = (value) => Math.max(10, Math.round(value / 10) * 10);

export async function POST() {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const products = await prisma.product.findMany({
      select: { id: true, name: true, category: true },
    });

    if (!products.length) {
      return NextResponse.json({
        success: true,
        message: "No products found to reprice.",
        data: { updatedCount: 0 },
      });
    }

    const updates = products.map((product) => {
      const band = getPriceBand(product.category, product.name);
      const baseHash = hashString(`${product.id}:${product.name}`);
      const discountHash = hashString(`${product.category}:${product.id}`);

      const range = Math.max(1, band.max - band.min + 1);
      const generatedPrice = band.min + (baseHash % range);
      const price = roundToNearestTen(generatedPrice);

      const discountPercent = 15 + (discountHash % 26);
      const mrpRaw = price / (1 - discountPercent / 100);
      const mrp = Math.max(price + 50, roundToNearestTen(mrpRaw));

      return prisma.product.update({
        where: { id: product.id },
        data: {
          price,
          mrp,
        },
      });
    });

    await prisma.$transaction(updates);

    return NextResponse.json({
      success: true,
      message: `Updated prices for ${products.length} products.`,
      data: { updatedCount: products.length },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to update product prices.",
      },
      { status: 500 }
    );
  }
}
