import { prisma } from "@/lib/prisma";
import { badRequest, notFound, ok, serverError } from "@/lib/server/apiResponse";

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

export async function GET(_request, { params }) {
  try {
    const id = normalize(params?.id);
    if (!id) {
      return badRequest("Product id is required.");
    }

    const product = await prisma.product.findUnique({
      where: { id },
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

    if (!product) {
      return notFound("Product not found.");
    }

    return ok(product);
  } catch (error) {
    return serverError(error, "Failed to fetch product.");
  }
}

export async function DELETE(_request, { params }) {
  try {
    const id = normalize(params?.id);
    if (!id) {
      return badRequest("Product id is required.");
    }

    await prisma.product.delete({
      where: { id },
    });

    return ok(null, "Product removed successfully.");
  } catch (error) {
    return serverError(error, "Failed to remove product.");
  }
}

export async function PATCH(request, { params }) {
  try {
    const id = normalize(params?.id);
    if (!id) {
      return badRequest("Product id is required.");
    }

    const body = await request.json();
    const name = normalize(body?.name);
    const brand = normalize(body?.brand);
    const description = normalize(body?.description);
    const category = normalize(body?.category);
    const audiences = Array.isArray(body?.audiences)
      ? body.audiences.map((item) => normalize(item)).filter(Boolean)
      : [];
    const sizes = Array.isArray(body?.sizes)
      ? body.sizes.map((item) => normalize(item)).filter(Boolean)
      : [];
    const colors = Array.isArray(body?.colors)
      ? body.colors.map((item) => normalize(item)).filter(Boolean)
      : [];
    const imageInput = Array.isArray(body?.images) ? body.images : [];
    const images = imageInput.map((item) => normalize(item)).filter(Boolean);
    const mrp = Number(body?.mrp);
    const price = Number(body?.price);
    const hasStockQty =
      body?.stockQty !== undefined && body?.stockQty !== null && body?.stockQty !== "";
    const stockQty = hasStockQty ? Number(body?.stockQty) : null;

    if (!name || !brand || !description || !category) {
      return badRequest("Name, brand, description and category are required.");
    }

    if (!images.length) {
      return badRequest("At least one image is required.");
    }

    if (!audiences.length) {
      return badRequest("At least one audience is required.");
    }
    if (!sizes.length) {
      return badRequest("At least one size is required.");
    }

    if (Number.isNaN(mrp) || Number.isNaN(price) || mrp <= 0 || price <= 0) {
      return badRequest("MRP and Price must be greater than 0.");
    }

    if (price > mrp) {
      return badRequest("Price cannot be greater than MRP.");
    }

    if (hasStockQty && (!Number.isInteger(stockQty) || stockQty < 0)) {
      return badRequest("Stock quantity must be 0 or greater.");
    }
    const data = {
      name,
      brand,
      description,
      audiences,
      sizes,
      colors,
      category,
      images,
      mrp,
      price,
    };
    if (hasStockQty) {
      data.stockQty = stockQty;
      data.inStock = stockQty > 0;
    }

    let updated;
    try {
      updated = await prisma.product.update({
        where: { id },
        data,
        include: {
          store: true,
          rating: true,
        },
      });
    } catch (error) {
      if (!hasStockQty || !isStockQtySchemaError(error)) throw error;
      const fallbackData = { ...data };
      delete fallbackData.stockQty;
      delete fallbackData.inStock;
      updated = await prisma.product.update({
        where: { id },
        data: fallbackData,
        include: {
          store: true,
          rating: true,
        },
      });
    }

    return ok(updated, "Product updated successfully.");
  } catch (error) {
    return serverError(error, "Failed to update product.");
  }
}
