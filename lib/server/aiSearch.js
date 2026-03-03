const STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "for",
  "with",
  "to",
  "of",
  "in",
  "on",
  "and",
  "or",
  "show",
  "me",
  "find",
  "need",
  "want",
  "please",
  "item",
  "items",
  "product",
  "products",
]);

const SYNONYM_MAP = {
  hoodie: ["sweatshirt", "hooded", "jacket"],
  sweatshirt: ["hoodie"],
  tshirt: ["t-shirt", "tee", "shirt"],
  tee: ["tshirt", "t-shirt"],
  shoes: ["sneakers", "trainers", "kicks"],
  sneakers: ["shoes", "kicks"],
  jeans: ["denim", "pants"],
  trousers: ["pants"],
  kurti: ["kurta"],
  kurta: ["kurti"],
  party: ["festive", "occasion"],
  affordable: ["cheap", "budget", "lowprice"],
  cheap: ["affordable", "budget"],
};

const AUDIENCE_HINTS = {
  men: ["men", "male", "boys", "gents", "man"],
  women: ["women", "female", "girls", "ladies", "woman"],
  kids: ["kids", "kid", "child", "children", "baby"],
};

const SORT_HINTS = {
  latest: ["latest", "new", "newest", "recent"],
  price_asc: ["cheap", "affordable", "budget", "low price", "lowest"],
  price_desc: ["premium", "expensive", "high price"],
  rating_desc: ["best", "top rated", "highest rated", "good quality"],
};

const clamp = (num, min, max) => Math.max(min, Math.min(max, num));

export const normalizeText = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const tokenize = (value) =>
  normalizeText(value)
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => !STOP_WORDS.has(part));

const levenshtein = (a, b) => {
  if (!a) return b.length;
  if (!b) return a.length;
  const matrix = Array.from({ length: a.length + 1 }, () =>
    Array(b.length + 1).fill(0)
  );
  for (let i = 0; i <= a.length; i += 1) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j += 1) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[a.length][b.length];
};

const fuzzyTokenMatch = (queryToken, candidateToken) => {
  if (!queryToken || !candidateToken) return false;
  if (candidateToken.includes(queryToken) || queryToken.includes(candidateToken)) {
    return true;
  }
  if (queryToken.length < 4 || candidateToken.length < 4) return false;
  const distance = levenshtein(queryToken, candidateToken);
  return distance <= 1 || (queryToken.length > 6 && distance <= 2);
};

const expandTokens = (tokens) => {
  const expanded = new Set(tokens);
  for (const token of tokens) {
    const variants = SYNONYM_MAP[token] || [];
    for (const variant of variants) expanded.add(variant);
  }
  return Array.from(expanded);
};

const vectorizeTokens = (tokens) => {
  const vector = new Map();
  for (const token of tokens) {
    vector.set(token, (vector.get(token) || 0) + 1);
  }
  return vector;
};

const cosineSimilarity = (v1, v2) => {
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (const value of v1.values()) normA += value * value;
  for (const value of v2.values()) normB += value * value;
  for (const [key, value] of v1.entries()) {
    if (v2.has(key)) dot += value * v2.get(key);
  }

  if (!normA || !normB) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
};

const parsePriceFilters = (query) => {
  const text = normalizeText(query);
  const betweenMatch = text.match(
    /(?:between|from)\s+(\d{2,6})\s+(?:and|to)\s+(\d{2,6})/
  );
  if (betweenMatch) {
    const min = Number(betweenMatch[1]);
    const max = Number(betweenMatch[2]);
    if (Number.isFinite(min) && Number.isFinite(max) && min <= max) {
      return { minPrice: min, maxPrice: max };
    }
  }

  const underMatch = text.match(/(?:under|below|less than|max)\s+(\d{2,6})/);
  if (underMatch) {
    const max = Number(underMatch[1]);
    if (Number.isFinite(max)) return { minPrice: null, maxPrice: max };
  }

  const aboveMatch = text.match(/(?:above|over|more than|min)\s+(\d{2,6})/);
  if (aboveMatch) {
    const min = Number(aboveMatch[1]);
    if (Number.isFinite(min)) return { minPrice: min, maxPrice: null };
  }

  return { minPrice: null, maxPrice: null };
};

export const extractAiFilters = (query, products = []) => {
  const normalized = normalizeText(query);
  const tokens = tokenize(normalized);
  const expanded = expandTokens(tokens);

  const audiences = Object.entries(AUDIENCE_HINTS)
    .filter(([, hints]) => hints.some((hint) => normalized.includes(hint)))
    .map(([key]) => key);

  const inStockOnly =
    normalized.includes("in stock") ||
    normalized.includes("available now") ||
    normalized.includes("ready to ship");

  const { minPrice, maxPrice } = parsePriceFilters(normalized);

  const minRatingMatch = normalized.match(/(\d(?:\.\d)?)\s*star/);
  const minRating = minRatingMatch ? Number(minRatingMatch[1]) : 0;

  const sort =
    Object.entries(SORT_HINTS).find(([, hints]) =>
      hints.some((hint) => normalized.includes(hint))
    )?.[0] || "";

  const allBrands = Array.from(
    new Set(
      products
        .map((item) => String(item?.brand || "").trim().toLowerCase())
        .filter(Boolean)
    )
  );
  const allCategories = Array.from(
    new Set(
      products
        .map((item) => String(item?.category || "").trim().toLowerCase())
        .filter(Boolean)
    )
  );

  const brands = allBrands.filter((brand) =>
    expanded.some((token) => fuzzyTokenMatch(token, brand))
  );

  const categories = allCategories.filter((category) => {
    const categoryTokens = tokenize(category);
    return expanded.some((token) =>
      categoryTokens.some((catToken) => fuzzyTokenMatch(token, catToken))
    );
  });

  return {
    brands,
    categories,
    audiences,
    minPrice,
    maxPrice,
    minRating: Number.isFinite(minRating) ? minRating : 0,
    inStockOnly,
    sort,
  };
};

const getAvgRating = (product) => {
  const ratings = Array.isArray(product?.rating) ? product.rating : [];
  if (!ratings.length) return 0;
  const sum = ratings.reduce((acc, curr) => acc + (Number(curr?.rating) || 0), 0);
  return sum / ratings.length;
};

const getProductTokens = (product) => {
  const text = [
    product?.name,
    product?.description,
    product?.category,
    product?.brand,
    ...(Array.isArray(product?.audiences) ? product.audiences : []),
    ...(Array.isArray(product?.sizes) ? product.sizes : []),
    ...(Array.isArray(product?.colors) ? product.colors : []),
  ]
    .filter(Boolean)
    .join(" ");
  return expandTokens(tokenize(text));
};

const filterByAiFilters = (products, filters) =>
  products.filter((product) => {
    const brand = String(product?.brand || "").toLowerCase();
    const category = String(product?.category || "").toLowerCase();
    const audiences = Array.isArray(product?.audiences)
      ? product.audiences.map((item) => String(item).toLowerCase())
      : [];
    const price = Number(product?.price || 0);
    const rating = getAvgRating(product);
    const stockQty = Number(product?.stockQty || 0);
    const inStock = Boolean(product?.inStock) && stockQty > 0;

    if (filters.brands.length && !filters.brands.includes(brand)) return false;
    if (filters.categories.length && !filters.categories.includes(category)) return false;
    if (
      filters.audiences.length &&
      !audiences.some((audience) => filters.audiences.includes(audience))
    ) {
      return false;
    }
    if (typeof filters.minPrice === "number" && price < filters.minPrice) return false;
    if (typeof filters.maxPrice === "number" && price > filters.maxPrice) return false;
    if (filters.minRating > 0 && rating < filters.minRating) return false;
    if (filters.inStockOnly && !inStock) return false;
    return true;
  });

export const rewriteQuery = (query) => {
  const tokens = tokenize(query);
  const expanded = expandTokens(tokens);
  const top = expanded.slice(0, 12);
  return top.join(" ");
};

const scoreProduct = (product, queryVector, queryTokens, rewrittenQuery) => {
  const productTokens = getProductTokens(product);
  const productVector = vectorizeTokens(productTokens);
  const semanticScore = cosineSimilarity(queryVector, productVector);

  const name = normalizeText(product?.name);
  const category = normalizeText(product?.category);
  const brand = normalizeText(product?.brand);
  const searchable = `${name} ${category} ${brand}`;

  let exactHits = 0;
  let fuzzyHits = 0;
  for (const token of queryTokens) {
    if (searchable.includes(token)) {
      exactHits += 1;
      continue;
    }
    if (productTokens.some((candidate) => fuzzyTokenMatch(token, candidate))) {
      fuzzyHits += 1;
    }
  }

  const keywordScore = clamp(
    (exactHits * 1.5 + fuzzyHits) / Math.max(queryTokens.length, 1),
    0,
    1
  );

  const rating = getAvgRating(product);
  const isInStock = Boolean(product?.inStock) && Number(product?.stockQty || 0) > 0;
  const freshnessDays = Math.max(
    0,
    (Date.now() - new Date(product?.createdAt || Date.now()).getTime()) /
      (1000 * 60 * 60 * 24)
  );
  const recencyScore = clamp(1 - freshnessDays / 90, 0, 1);
  const businessScore = clamp(
    (isInStock ? 0.45 : 0) + clamp(rating / 5, 0, 1) * 0.35 + recencyScore * 0.2,
    0,
    1
  );

  const rewrittenBoost =
    rewrittenQuery && searchable.includes(rewrittenQuery.split(" ")[0]) ? 0.04 : 0;

  const finalScore =
    keywordScore * 0.45 + semanticScore * 0.35 + businessScore * 0.2 + rewrittenBoost;

  return { finalScore, keywordScore, semanticScore, businessScore };
};

export const runHybridSearch = (products, query, filters = null) => {
  const rewrittenQuery = rewriteQuery(query);
  const tokens = expandTokens(tokenize(rewrittenQuery));
  const queryVector = vectorizeTokens(tokens);
  const aiFilters = filters || extractAiFilters(query, products);
  const filtered = filterByAiFilters(products, aiFilters);

  const ranked = filtered
    .map((product) => {
      const score = scoreProduct(product, queryVector, tokens, rewrittenQuery);
      return { product, score };
    })
    .sort((a, b) => b.score.finalScore - a.score.finalScore);

  return {
    rewrittenQuery,
    filters: aiFilters,
    results: ranked.map((item) => ({
      ...item.product,
      _ai: {
        score: Number(item.score.finalScore.toFixed(4)),
        keywordScore: Number(item.score.keywordScore.toFixed(4)),
        semanticScore: Number(item.score.semanticScore.toFixed(4)),
        businessScore: Number(item.score.businessScore.toFixed(4)),
      },
    })),
  };
};
