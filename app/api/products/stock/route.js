import { prisma } from "@/lib/prisma";
import { badRequest, ok, serverError } from "@/lib/server/apiResponse";

const normalize = (value) => (typeof value === "string" ? value.trim() : "");

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const idsParam = normalize(searchParams.get("ids"));
    if (!idsParam) return badRequest("ids is required.");

    const ids = [...new Set(idsParam.split(",").map((id) => normalize(id)).filter(Boolean))];
    if (!ids.length) return badRequest("Provide at least one product id.");
    if (ids.length > 100) return badRequest("Too many ids. Max 100 allowed.");

    const products = await prisma.product.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, inStock: true, stockQty: true },
    });

    return ok(products);
  } catch (error) {
    return serverError(error, "Failed to fetch stock snapshot.");
  }
}

