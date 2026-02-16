'use client'

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";

const STORAGE_KEY = "tsm_followed_shop_usernames";

export default function FollowedShopsPage() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [followed, setFollowed] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setFollowed(parsed);
      } catch {}
    }

    const load = async () => {
      const response = await fetch("/api/products", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || "Failed to load stores.");
      }
      setProducts(payload.data || []);
    };

    load().catch((err) => toast.error(err?.message || "Failed to load stores."));
  }, []);

  const stores = useMemo(() => {
    const map = new Map();
    products.forEach((item) => {
      const store = item?.store;
      if (!store?.username) return;
      if (!map.has(store.username)) {
        map.set(store.username, {
          username: store.username,
          name: store.name || store.username,
          logo: store.logo || "/favicon.ico",
          productCount: 1,
        });
      } else {
        map.get(store.username).productCount += 1;
      }
    });
    return Array.from(map.values());
  }, [products]);

  const saveFollowed = (next) => {
    setFollowed(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const toggleFollow = (username) => {
    const exists = followed.includes(username);
    const next = exists ? followed.filter((item) => item !== username) : [...followed, username];
    saveFollowed(next);
  };

  return (
    <div className="mx-6 min-h-[70vh]">
      <div className="max-w-4xl mx-auto py-10">
        <button type="button" onClick={() => router.back()} className="inline-flex items-center gap-2 text-slate-700">
          <ArrowLeft size={18} />
          Back
        </button>
        <h1 className="mt-4 text-3xl font-semibold text-slate-800">Followed Shops</h1>
        <p className="mt-2 text-slate-500">Follow your favorite stores to visit quickly.</p>

        <div className="mt-6 space-y-3">
          {stores.map((store) => {
            const isFollowed = followed.includes(store.username);
            return (
              <div key={store.username} className="rounded-xl border border-slate-200 p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={store.logo} alt={store.name} className="size-12 rounded-full object-cover bg-slate-100" />
                  <div>
                    <p className="font-medium text-slate-800">{store.name}</p>
                    <p className="text-sm text-slate-500">{store.productCount} products</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => router.push(`/shop/${store.username}`)} className="text-sm rounded-lg border border-slate-300 px-3 py-1.5">Visit</button>
                  <button
                    onClick={() => toggleFollow(store.username)}
                    className={`text-sm rounded-lg px-3 py-1.5 ${
                      isFollowed ? "bg-slate-800 text-white" : "border border-slate-300 text-slate-700"
                    }`}
                  >
                    {isFollowed ? "Following" : "Follow"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
