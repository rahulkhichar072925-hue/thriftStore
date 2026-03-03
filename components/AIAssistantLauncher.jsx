"use client";

import { useMemo, useState } from "react";
import { Bot, Search, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import toast from "react-hot-toast";

const QUICK_PROMPTS = [
  "Show men hoodies under 1000",
  "Best rated women sneakers",
  "Latest kids winter wear",
  "Affordable denim for college",
];

const buildShopQuery = (query, filters = {}) => {
  const params = new URLSearchParams();
  if (query) params.set("search", query);
  if (Array.isArray(filters.brands) && filters.brands.length) params.set("brands", filters.brands.join(","));
  if (Array.isArray(filters.categories) && filters.categories.length) params.set("categories", filters.categories.join(","));
  if (Array.isArray(filters.audiences) && filters.audiences.length) params.set("audiences", filters.audiences.join(","));
  if (typeof filters.minPrice === "number") params.set("minPrice", String(filters.minPrice));
  if (typeof filters.maxPrice === "number") params.set("maxPrice", String(filters.maxPrice));
  if (typeof filters.minRating === "number" && filters.minRating > 0) params.set("minRating", String(filters.minRating));
  if (filters.inStockOnly) params.set("inStock", "true");
  if (filters.sort) params.set("sort", filters.sort);
  return params.toString() ? `/shop?${params.toString()}` : "/shop";
};

const saveAiEvent = (event) => {
  try {
    const key = "tsm_ai_search_events";
    const existing = JSON.parse(localStorage.getItem(key) || "[]");
    const next = [{ ...event, createdAt: new Date().toISOString() }, ...existing].slice(0, 100);
    localStorage.setItem(key, JSON.stringify(next));
  } catch {
    // Local analytics should never block search.
  }
};

const ResultCard = ({ product, onOpen }) => {
  const image = Array.isArray(product?.images) ? product.images[0] : "";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 hover:border-teal-300 hover:shadow-md transition">
      <div className="flex items-start gap-3">
        <div className="size-14 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt={product?.name || "Product"} className="size-full object-cover" />
          ) : null}
        </div>
        <div className="min-w-0">
          <p className="line-clamp-2 text-sm font-semibold text-slate-900">{product?.name || "Product"}</p>
          <p className="mt-0.5 text-xs text-slate-500">{product?.category || "Category"}</p>
          <p className="mt-1.5 text-sm font-semibold text-emerald-700">
            Rs {Number(product?.price || 0).toLocaleString()}
          </p>
          <Link
            href={`/product/${product?.id}`}
            onClick={() => onOpen(product)}
            className="mt-2 inline-flex rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
          >
            View Product
          </Link>
        </div>
      </div>
    </div>
  );
};

export default function AIAssistantLauncher() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const isVisible = useMemo(() => {
    if (!pathname) return true;
    return !pathname.startsWith("/admin") && !pathname.startsWith("/store");
  }, [pathname]);

  if (!isVisible) return null;

  const runAiSearch = async (text) => {
    const normalized = String(text || "").trim();
    if (!normalized) {
      toast.error("Type a search prompt first.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/ai/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: normalized }),
      });
      const payload = await response.json();

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || "AI search failed.");
      }

      setResult(payload?.data || null);
      saveAiEvent({
        type: "query",
        query: normalized,
        resultCount: Number(payload?.data?.results?.length || 0),
        zeroResult: !payload?.data?.results?.length,
      });
    } catch {
      saveAiEvent({ type: "fallback", query: normalized });
      toast.error("AI search unavailable, switching to normal search.");
      router.push(`/shop?search=${encodeURIComponent(normalized)}`);
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenProduct = (product) => {
    saveAiEvent({ type: "click", query: result?.query || query, productId: product?.id });
    setOpen(false);
  };

  const applyOnShop = () => {
    const nextPath = buildShopQuery(result?.rewrittenQuery || query, result?.filters || {});
    router.push(nextPath);
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="fixed bottom-20 right-4 z-40 inline-flex items-center gap-2.5 rounded-full border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-white shadow-xl sm:bottom-5 sm:right-6"
      >
        <span className="inline-flex size-6 items-center justify-center rounded-full bg-gradient-to-tr from-teal-400 via-cyan-500 to-blue-600">
          <Sparkles size={13} />
        </span>
        <span className="text-sm font-medium">Ask Thrift AI</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-3 backdrop-blur-sm sm:p-6">
          <div className="w-full max-w-3xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_24px_80px_rgba(2,6,23,0.28)]">
            <div className="relative overflow-hidden border-b border-slate-200 bg-slate-950 text-white">
              <div className="absolute -left-16 -top-16 size-44 rounded-full bg-teal-400/20 blur-2xl" />
              <div className="absolute -right-12 -bottom-16 size-44 rounded-full bg-cyan-400/20 blur-2xl" />
              <div className="relative flex items-start justify-between gap-4 px-5 py-5 sm:px-6">
                <div className="flex items-start gap-3">
                  <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-teal-400 via-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/25">
                    <Bot size={18} />
                  </span>
                  <div>
                    <p className="text-lg font-semibold leading-tight">Thrift AI Assistant</p>
                    <p className="mt-1 text-xs text-slate-300">Smart search with intent understanding and re-ranking.</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full border border-teal-300/30 bg-teal-400/15 px-2.5 py-1 text-[11px] font-medium text-teal-100">Hybrid Search</span>
                      <span className="rounded-full border border-cyan-300/30 bg-cyan-400/15 px-2.5 py-1 text-[11px] font-medium text-cyan-100">Typo Tolerant</span>
                      <span className="rounded-full border border-blue-300/30 bg-blue-400/15 px-2.5 py-1 text-[11px] font-medium text-blue-100">Filter Aware</span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="inline-flex size-9 items-center justify-center rounded-xl border border-white/15 bg-white/10 transition hover:bg-white/20"
                >
                  <X size={17} />
                </button>
              </div>
            </div>

            <div className="p-5 sm:p-6">
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  runAiSearch(query);
                }}
                className="flex gap-2.5"
              >
                <div className="relative flex-1">
                  <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Find black oversized hoodie under 1000"
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 py-3 pl-10 pr-3 text-sm text-slate-800 outline-none focus:border-teal-500 focus:bg-white"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  <Sparkles size={14} />
                  {loading ? "Searching" : "Search"}
                </button>
              </form>

              <div className="mt-4 flex flex-wrap gap-2">
                {QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => {
                      setQuery(prompt);
                      runAiSearch(prompt);
                    }}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              {result && (
                <div className="mt-5 space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-3.5">
                    <p className="text-[11px] uppercase tracking-[0.08em] text-slate-500">AI query rewrite</p>
                    <p className="mt-1.5 text-sm font-medium text-slate-800">{result?.rewrittenQuery || query}</p>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-700">
                      <span className="font-semibold">{result?.results?.length || 0}</span> matches found
                    </p>
                    <button
                      type="button"
                      onClick={applyOnShop}
                      className="rounded-full bg-emerald-600 px-3.5 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-700"
                    >
                      Apply On Shop
                    </button>
                  </div>

                  {result?.results?.length ? (
                    <div className="max-h-[46vh] space-y-2.5 overflow-y-auto pr-1">
                      {result.results.slice(0, 8).map((item) => (
                        <ResultCard key={item.id} product={item} onOpen={handleOpenProduct} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">No results found. Try a broader prompt.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
