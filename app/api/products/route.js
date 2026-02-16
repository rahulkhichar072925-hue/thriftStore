import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { badRequest, ok, serverError } from "@/lib/server/apiResponse";

const normalize = (value) => (typeof value === "string" ? value.trim() : "");
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
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

const fetchProductsWithRetry = async (where) => {
  try {
    return await prisma.product.findMany({
      where,
      include: {
        store: true,
        rating: {
          include: {
            user: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    if (error?.code === "P1001") {
      await wait(1800);
      return prisma.product.findMany({
        where,
        include: {
          store: true,
          rating: {
            include: {
              user: true,
            },
            orderBy: { createdAt: "desc" },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    }
    throw error;
  }
};

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = normalize(searchParams.get("userId"));

    const products = await fetchProductsWithRetry(
      userId ? { store: { userId } } : undefined
    );

    return ok(products);
  } catch (error) {
    return serverError(error, "Failed to fetch products.");
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    const userId = normalize(body.userId);
    const name = normalize(body.name);
    const brand = normalize(body.brand);
    const description = normalize(body.description);
    const category = normalize(body.category);
    const sizes = Array.isArray(body.sizes)
      ? body.sizes.map((item) => normalize(item)).filter(Boolean)
      : [];
    const colors = Array.isArray(body.colors)
      ? body.colors.map((item) => normalize(item)).filter(Boolean)
      : [];
    const audiences = Array.isArray(body.audiences)
      ? body.audiences.map((item) => normalize(item)).filter(Boolean)
      : [];
    const images = Array.isArray(body.images) ? body.images.filter(Boolean) : [];
    const mrp = Number(body.mrp);
    const price = Number(body.price);
    const hasStockQty =
      body?.stockQty !== undefined && body?.stockQty !== null && body?.stockQty !== "";
    const stockQty = hasStockQty ? Number(body.stockQty) : 1;

    if (!userId || !name || !brand || !description || !category || !images.length) {
      return badRequest("Missing required fields.");
    }

    if (!audiences.length) {
      return badRequest("At least one audience is required.");
    }
    if (!sizes.length) {
      return badRequest("At least one size is required.");
    }

    if (Number.isNaN(mrp) || Number.isNaN(price) || mrp <= 0 || price <= 0) {
      return badRequest("Price values must be greater than 0.");
    }

    if (price > mrp) {
      return badRequest("Offer price cannot be higher than actual price.");
    }

    if (hasStockQty && (!Number.isInteger(stockQty) || stockQty < 1)) {
      return badRequest("Stock quantity must be at least 1.");
    }

    const store =
      (await prisma.store.findFirst({
        where: { userId, status: "approved" },
        orderBy: { updatedAt: "desc" },
      })) ||
      (await prisma.store.findFirst({
        where: { userId },
        orderBy: { updatedAt: "desc" },
      }));

    if (!store) {
      return NextResponse.json(
        {
          success: false,
          message: "No store found for this seller. Create your store first.",
        },
        { status: 403 }
      );
    }

    const data = {
      name,
      brand,
      description,
      mrp,
      price,
      images,
      audiences,
      sizes,
      colors,
      category,
      inStock: stockQty > 0,
      storeId: store.id,
    };
    if (hasStockQty) {
      data.stockQty = stockQty;
    }

    let product;
    try {
      product = await prisma.product.create({
        data,
        include: {
          store: true,
          rating: {
            include: {
              user: true,
            },
            orderBy: { createdAt: "desc" },
          },
        },
      });
    } catch (error) {
      if (!hasStockQty || !isStockQtySchemaError(error)) throw error;
      const fallbackData = { ...data };
      delete fallbackData.stockQty;
      product = await prisma.product.create({
        data: fallbackData,
        include: {
          store: true,
          rating: {
            include: {
              user: true,
            },
            orderBy: { createdAt: "desc" },
          },
        },
      });
    }

    return ok(product, "Product added successfully.");
  } catch (error) {
    return serverError(error, "Failed to add product.");
  }
}
