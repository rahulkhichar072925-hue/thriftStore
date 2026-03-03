import { hasPrismaModel, prisma } from "@/lib/prisma";
import { badRequest, ok, serverError } from "@/lib/server/apiResponse";
import { extractAiFilters, runHybridSearch } from "@/lib/server/aiSearch";

const normalize = (value) => (typeof value === "string" ? value.trim() : "");

const fetchProducts = async () => {
  if (!prisma) return [];
  return prisma.product.findMany({
    include: {
      store: true,
      rating: true,
    },
    orderBy: { createdAt: "desc" },
  });
};

const applyExplicitSort = (items, sort) => {
  const list = [...items];
  if (sort === "latest") {
    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return list;
  }
  if (sort === "price_asc") {
    list.sort((a, b) => Number(a?.price || 0) - Number(b?.price || 0));
    return list;
  }
  if (sort === "price_desc") {
    list.sort((a, b) => Number(b?.price || 0) - Number(a?.price || 0));
    return list;
  }
  if (sort === "rating_desc") {
    const avg = (item) => {
      const ratings = Array.isArray(item?.rating) ? item.rating : [];
      if (!ratings.length) return 0;
      return (
        ratings.reduce((acc, entry) => acc + (Number(entry?.rating) || 0), 0) /
        ratings.length
      );
    };
    list.sort((a, b) => avg(b) - avg(a));
    return list;
  }
  return list;
};

const logSearch = async ({ query, rewrittenQuery, filters, resultCount }) => {
  if (!hasPrismaModel("searchAnalyticsLog")) return;
  try {
    await prisma.searchAnalyticsLog.create({
      data: {
        query,
        rewrittenQuery,
        filters,
        resultCount,
        isZeroResult: resultCount === 0,
      },
    });
  } catch {
    // Analytics should never block user search.
  }
};

export async function POST(request) {
  try {
    const body = await request.json();
    const query = normalize(body?.query);

    if (!query) {
      return badRequest("Search query is required.");
    }

    const products = await fetchProducts();
    if (!products.length) {
      return ok({
        query,
        rewrittenQuery: query,
        filters: extractAiFilters(query, []),
        results: [],
        fallbackUsed: false,
      });
    }

    const parsedFilters = extractAiFilters(query, products);
    const hybrid = runHybridSearch(products, query, parsedFilters);
    const sortedResults = applyExplicitSort(hybrid.results, hybrid.filters.sort);
    const results = sortedResults.slice(0, 50);

    await logSearch({
      query,
      rewrittenQuery: hybrid.rewrittenQuery,
      filters: hybrid.filters,
      resultCount: results.length,
    });

    return ok({
      query,
      rewrittenQuery: hybrid.rewrittenQuery,
      filters: hybrid.filters,
      results,
      fallbackUsed: false,
    });
  } catch (error) {
    // Fallback mode: return empty AI result object so UI can fall back to normal search.
    return serverError(error, "AI search failed. Please try normal search.");
  }
}
