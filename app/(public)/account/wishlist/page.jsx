'use client'

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import Image from "next/image";
import { ArrowLeft, Heart } from "lucide-react";

const STORAGE_KEY = "tsm_wishlist_product_ids";

export default function WishlistPage() {
  const router = useRouter();
  const products = useSelector((state) => state.product.list);
  const [ids, setIds] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) setIds(parsed);
    } catch {}
  }, []);

  const save = (next) => {
    setIds(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const wishlistProducts = useMemo(
    () => products.filter((item) => ids.includes(item.id)),
    [products, ids]
  );

  const featuredProducts = useMemo(
    () => products.filter((item) => !ids.includes(item.id)).slice(0, 12),
    [products, ids]
  );

  const toggleWishlist = (productId) => {
    const exists = ids.includes(productId);
    const next = exists ? ids.filter((id) => id !== productId) : [...ids, productId];
    save(next);
  };

  const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || "Rs";

  return (
    <div className="mx-6 min-h-[70vh]">
      <div className="max-w-5xl mx-auto py-10">
        <button type="button" onClick={() => router.back()} className="inline-flex items-center gap-2 text-slate-700">
          <ArrowLeft size={18} />
          Back
        </button>
        <h1 className="mt-4 text-3xl font-semibold text-slate-800">Wishlisted Products</h1>
        <p className="mt-2 text-slate-500">Save products you want to buy later.</p>

        <div className="mt-6">
          <h2 className="font-semibold text-slate-800 mb-3">My Wishlist ({wishlistProducts.length})</h2>
          {wishlistProducts.length === 0 ? (
            <p className="text-slate-500">No wishlist items yet. Add products below.</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {wishlistProducts.map((item) => (
                <div key={item.id} className="rounded-xl border border-slate-200 p-3">
                  <div className="h-40 bg-slate-100 rounded-lg flex items-center justify-center">
                    <Image src={item.images?.[0] || "/favicon.ico"} alt={item.name} width={130} height={130} className="max-h-32 w-auto" />
                  </div>
                  <p className="mt-3 font-medium text-slate-800">{item.name}</p>
                  <p className="text-sm text-slate-500">{currency}{item.price}</p>
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => router.push(`/product/${item.id}`)} className="text-sm rounded-lg border border-slate-300 px-3 py-1.5">View</button>
                    <button onClick={() => toggleWishlist(item.id)} className="text-sm rounded-lg bg-red-50 text-red-600 px-3 py-1.5">Remove</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-10">
          <h2 className="font-semibold text-slate-800 mb-3">Explore Products</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {featuredProducts.map((item) => (
              <div key={item.id} className="rounded-xl border border-slate-200 p-3">
                <div className="h-40 bg-slate-100 rounded-lg flex items-center justify-center">
                  <Image src={item.images?.[0] || "/favicon.ico"} alt={item.name} width={130} height={130} className="max-h-32 w-auto" />
                </div>
                <p className="mt-3 font-medium text-slate-800">{item.name}</p>
                <p className="text-sm text-slate-500">{currency}{item.price}</p>
                <button
                  onClick={() => toggleWishlist(item.id)}
                  className="mt-3 inline-flex items-center gap-2 text-sm rounded-lg border border-slate-300 px-3 py-1.5"
                >
                  <Heart size={14} />
                  Add to Wishlist
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
